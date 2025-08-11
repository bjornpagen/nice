import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { powerpath } from "@/lib/clients"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getResourcesBySlugAndType
} from "@/lib/data/fetchers/oneroster"
import { getAllQuestionsForTest, getAssessmentTest } from "@/lib/data/fetchers/qti"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { Question } from "@/lib/types/domain"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import { findAssessmentRedirectPath } from "@/lib/utils/assessment-redirect"
import type { AssessmentTest, TestQuestionsResponse } from "../qti"
import { fetchCoursePageData } from "./course"
import { fetchLessonLayoutData } from "./lesson"

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * This function creates a shallow copy to avoid mutating the original array.
 * @param array The array to shuffle.
 * @returns The shuffled array.
 */
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		// Swap elements using a temporary variable
		// We know these indices are valid because i < shuffled.length and j <= i
		const elementI = shuffled[i]
		const elementJ = shuffled[j]
		if (elementI !== undefined && elementJ !== undefined) {
			shuffled[i] = elementJ
			shuffled[j] = elementI
		}
	}
	return shuffled
}

/**
 * Parses a QTI assessment test's XML to apply selection and ordering rules.
 * This function is designed to be robust, using named capture groups in its regex
 * and handling edge cases gracefully.
 *
 * @param assessmentTest The assessment test object containing the rawXml
 * @param allQuestions The array of all possible questions for this test
 * @returns A filtered and ordered array of questions according to the test's rules.
 */
export function applyQtiSelectionAndOrdering(
	assessmentTest: AssessmentTest,
	allQuestions: TestQuestionsResponse["questions"],
	options?: { baseSeed?: string; attemptNumber?: number }
): Question[] {
	const xml = assessmentTest.rawXml
	const allQuestionsMap = new Map(allQuestions.map((q) => [q.question.identifier, q]))

	logger.debug("applyQtiSelectionAndOrdering: starting processing", {
		testIdentifier: assessmentTest.identifier,
		totalQuestionsProvided: allQuestions.length,
		xmlLength: xml.length
	})

	// Log first 1000 chars of XML for debugging
	logger.debug("applyQtiSelectionAndOrdering: XML sample", {
		testIdentifier: assessmentTest.identifier,
		xmlSample: xml.substring(0, 1000)
	})

	// Regex to find all <qti-assessment-section> blocks, capturing their content non-greedily.
	const sectionRegex = /<qti-assessment-section[^>]*>([\s\S]*?)<\/qti-assessment-section>/g
	const sections = [...xml.matchAll(sectionRegex)]

	logger.debug("applyQtiSelectionAndOrdering: found sections", {
		testIdentifier: assessmentTest.identifier,
		sectionCount: sections.length
	})

	// If no sections are defined (e.g., in a simple Exercise), return all questions in their original order.
	if (sections.length === 0) {
		logger.debug("no qti sections found, returning all questions", { testIdentifier: assessmentTest.identifier })
		return allQuestions.map((q) => ({ id: q.question.identifier }))
	}

	const selectedQuestionIds: string[] = []

	// Deterministic ordering helpers for strict non-repetition until exhaustion
	function fnv1aHash(input: string): number {
		let hash = 0x811c9dc5
		for (let i = 0; i < input.length; i++) {
			hash ^= input.charCodeAt(i)
			hash = (hash >>> 0) * 0x01000193
		}
		return hash >>> 0
	}

	function deterministicallyOrder(values: string[], seed: string): string[] {
		return [...values]
			.map((v) => ({ v, h: fnv1aHash(`${seed}:${v}`) }))
			.sort((a, b) => (a.h === b.h ? (a.v < b.v ? -1 : 1) : a.h - b.h))
			.map((x) => x.v)
	}

	for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
		const sectionMatch = sections[sectionIndex]
		const sectionContent = sectionMatch?.[1] ?? ""

		// 1. Extract all item references from the current section using a robust regex.
		const itemRefRegex = /<qti-assessment-item-ref[^>]*identifier="(?<identifier>[^"]+)"/g
		let itemRefs = [...sectionContent.matchAll(itemRefRegex)].map((match) => match.groups?.identifier ?? "")

		logger.debug("applyQtiSelectionAndOrdering: processing section", {
			testIdentifier: assessmentTest.identifier,
			sectionIndex,
			itemRefsFound: itemRefs.length,
			itemRefs: itemRefs.slice(0, 5) // Log first 5 for debugging
		})

		// 2. Apply ordering (shuffling) if specified.
		const orderingMatch = sectionContent.match(/<qti-ordering[^>]*shuffle="true"/)
		if (orderingMatch) {
			logger.debug("applyQtiSelectionAndOrdering: shuffling enabled for section", {
				testIdentifier: assessmentTest.identifier,
				sectionIndex
			})
			const sectionIdMatch = sectionContent.match(/identifier="([^"]+)"/)
			const sectionId = sectionIdMatch?.[1] ?? `section_${sectionIndex}`
			if (options?.baseSeed) {
				const seed = `${options.baseSeed}:${assessmentTest.identifier}:${sectionId}`
				itemRefs = deterministicallyOrder(itemRefs, seed)
			} else {
				itemRefs = shuffleArray(itemRefs)
			}
		}

		// 3. Apply selection to limit the number of questions, using a named capture group for clarity.
		const selectionMatch = sectionContent.match(/<qti-selection[^>]*select="(?<selectCount>\d+)"/)
		const selectCountStr = selectionMatch?.groups?.selectCount
		if (selectCountStr) {
			const selectCount = Number.parseInt(selectCountStr, 10)
			if (!Number.isNaN(selectCount)) {
				logger.debug("applyQtiSelectionAndOrdering: applying selection limit", {
					testIdentifier: assessmentTest.identifier,
					sectionIndex,
					selectCount,
					itemRefsBeforeSelection: itemRefs.length,
					itemRefsAfterSelection: Math.min(selectCount, itemRefs.length)
				})
				// Strict non-repetition until exhaustion using sliding window over base order
				if (options?.baseSeed && options?.attemptNumber && itemRefs.length > 0) {
					const n = itemRefs.length
					const k = Math.min(selectCount, n)
					const offset = ((options.attemptNumber - 1) * k) % n
					const window: string[] = []
					for (let i = 0; i < k; i++) {
						const idx = (offset + i) % n
						const ref = itemRefs[idx]
						if (ref !== undefined) {
							window.push(ref)
						}
					}
					itemRefs = window
				} else {
					itemRefs = itemRefs.slice(0, selectCount)
				}
			} else {
				logger.warn("invalid non-numeric select attribute in QTI test", {
					testIdentifier: assessmentTest.identifier,
					selectAttribute: selectCountStr
				})
			}
		} else {
			logger.debug("applyQtiSelectionAndOrdering: no selection limit for section", {
				testIdentifier: assessmentTest.identifier,
				sectionIndex
			})
		}

		selectedQuestionIds.push(...itemRefs)
	}

	// Critical validation: If parsing results in zero questions, the QTI XML is malformed
	// and must be fixed rather than continuing with incorrect assessment structure.
	if (selectedQuestionIds.length === 0) {
		logger.error("CRITICAL: QTI parsing failed - no questions selected", {
			testIdentifier: assessmentTest.identifier,
			sectionCount: sections.length,
			xmlLength: xml.length,
			xmlSample: xml.substring(0, 500)
		})
		throw errors.new("QTI assessment parsing: no questions selected")
	}

	// 4. Map the final list of IDs back to the full question objects, preserving the new order.
	const finalQuestions = selectedQuestionIds
		.map((id) => allQuestionsMap.get(id))
		.filter((q): q is Exclude<typeof q, undefined> => !!q)
		.map((q) => ({ id: q.question.identifier }))

	logger.info("applied qti selection and ordering rules", {
		testIdentifier: assessmentTest.identifier,
		initialCount: allQuestions.length,
		finalCount: finalQuestions.length,
		selectedQuestionIds: selectedQuestionIds.length,
		sectionsProcessed: sections.length
	})

	return finalQuestions
}

export async function fetchQuizPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizPageData> {
	// Opt into dynamic rendering since we use Math.random() for shuffling
	await connection()

	const layoutData = await fetchLessonLayoutData(params)

	logger.info("fetchQuizPageData called", { params })

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")

	// Pass only the params needed by fetchLessonLayoutData, not the quiz param
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.quiz, "interactive", "quiz"))

	const [resourceResult] = await Promise.all([resourcePromise])

	if (resourceResult.error) {
		logger.error("failed to fetch quiz resource by slug", { error: resourceResult.error, slug: params.quiz })
		throw errors.wrap(resourceResult.error, "failed to fetch quiz resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Find the ComponentResource that links this quiz resource to its parent unit
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch component resources to find quiz unit context", {
			error: allComponentResourcesResult.error
		})
		throw errors.wrap(allComponentResourcesResult.error, "fetch component resources for quiz context")
	}

	const componentResource = allComponentResourcesResult.data.find(
		(cr) => cr.resource.sourcedId === resource.sourcedId && cr.courseComponent.sourcedId === layoutData.unitData.id
	)

	if (!componentResource) {
		logger.error("could not find componentResource linking quiz to unit", {
			resourceSourcedId: resource.sourcedId,
			unitSourcedId: layoutData.unitData.id
		})
		notFound()
	}

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid quiz resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid quiz resource metadata")
	}

	// Check for "Quiz" activityType
	if (resourceMetadataResult.data.activityType !== "Quiz") {
		logger.error("invalid activityType for quiz page", {
			resourceSourcedId: resource.sourcedId,
			expected: "Quiz",
			actualActivityType: resourceMetadataResult.data.activityType
		})
		throw errors.new("invalid activity type")
	}

	const resourceMetadata = resourceMetadataResult.data

	// Fetch questions from QTI server
	const questionsResult = await errors.try(getAllQuestionsForTest(resource.sourcedId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for quiz", {
			testSourcedId: resource.sourcedId,
			error: questionsResult.error
		})
		throw errors.wrap(questionsResult.error, "fetch questions for quiz")
	}

	if (!Array.isArray(questionsResult.data.questions)) {
		logger.error("CRITICAL: QTI test questions are not an array", {
			testSourcedId: resource.sourcedId,
			questionsData: questionsResult.data.questions
		})
		throw errors.new("QTI test questions: malformed data")
	}

	// Fetch the assessment test XML to get selection and ordering rules
	const assessmentTestResult = await errors.try(getAssessmentTest(resource.sourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML for quiz", {
			testSourcedId: resource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for quiz")
	}

	// Apply selection and ordering rules with strict non-repetition using baseSeed + attempt
	// Derive user and attempt
	const userForQuiz = await currentUser()
	if (!userForQuiz) {
		logger.error("user authentication required for deterministic selection", {})
		throw errors.new("user authentication required")
	}
	const userMetaForQuiz = parseUserPublicMetadata(userForQuiz.publicMetadata)
	if (!userMetaForQuiz.sourceId) {
		logger.error("user source id missing for deterministic selection", {})
		throw errors.new("user source id missing")
	}
	const progressForQuiz = await errors.try(
		powerpath.getAssessmentProgress(userMetaForQuiz.sourceId, componentResource.sourcedId)
	)
	if (progressForQuiz.error) {
		logger.error("failed to fetch assessment progress for deterministic selection", {
			error: progressForQuiz.error,
			componentResourceSourcedId: componentResource.sourcedId
		})
		throw errors.wrap(progressForQuiz.error, "powerpath assessment progress")
	}
	const attemptNumberForQuiz = progressForQuiz.data.attempt
	if (typeof attemptNumberForQuiz !== "number") {
		logger.error("assessment attempt number missing", { componentResourceSourcedId: componentResource.sourcedId })
		throw errors.new("assessment attempt number missing")
	}

	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, questionsResult.data.questions, {
		baseSeed: `${userMetaForQuiz.sourceId}:${resource.sourcedId}`,
		attemptNumber: attemptNumberForQuiz
	})

	return {
		quiz: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id, // Add course ID
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/quiz/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			type: "Quiz" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchUnitTestPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	test: string
}): Promise<UnitTestPageData> {
	// Opt into dynamic rendering since we use Math.random() for shuffling
	await connection()

	const layoutData = await fetchLessonLayoutData(params)

	logger.info("fetchUnitTestPageData called", { params })

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "fetchUnitTestPageData test parameter")

	// Pass only the params needed by fetchLessonLayoutData, not the test param
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.test, "interactive", "unittest"))

	const [resourceResult] = await Promise.all([resourcePromise])

	if (resourceResult.error) {
		logger.error("failed to fetch unittest resource by slug", { error: resourceResult.error, slug: params.test })
		throw errors.wrap(resourceResult.error, "failed to fetch unittest resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Find the ComponentResource that links this unit test resource to its parent unit
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch component resources to find unit test context", {
			error: allComponentResourcesResult.error
		})
		throw errors.wrap(allComponentResourcesResult.error, "fetch component resources for unit test context")
	}

	const componentResource = allComponentResourcesResult.data.find(
		(cr) => cr.resource.sourcedId === resource.sourcedId && cr.courseComponent.sourcedId === layoutData.unitData.id
	)

	if (!componentResource) {
		logger.error("could not find componentResource linking unit test to unit", {
			resourceSourcedId: resource.sourcedId,
			unitSourcedId: layoutData.unitData.id
		})
		notFound()
	}

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid unittest resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid unittest resource metadata")
	}

	// Check for "UnitTest" activityType
	if (resourceMetadataResult.data.activityType !== "UnitTest") {
		logger.error("invalid activityType for unittest page", {
			resourceSourcedId: resource.sourcedId,
			expected: "UnitTest",
			actualActivityType: resourceMetadataResult.data.activityType
		})
		throw errors.new("invalid activity type")
	}

	const resourceMetadata = resourceMetadataResult.data

	// Fetch questions from QTI server
	const questionsResult = await errors.try(getAllQuestionsForTest(resource.sourcedId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for unittest", {
			testSourcedId: resource.sourcedId,
			error: questionsResult.error
		})
		throw errors.wrap(questionsResult.error, "fetch questions for unittest")
	}

	if (!Array.isArray(questionsResult.data.questions)) {
		logger.error("CRITICAL: QTI test questions are not an array", {
			testSourcedId: resource.sourcedId,
			questionsData: questionsResult.data.questions
		})
		throw errors.new("QTI test questions: malformed data")
	}

	// Fetch the assessment test XML to get selection and ordering rules
	const assessmentTestResult = await errors.try(getAssessmentTest(resource.sourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML for unittest", {
			testSourcedId: resource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for unittest")
	}

	// Apply selection and ordering rules with strict non-repetition using baseSeed + attempt
	const userForUnitTest = await currentUser()
	if (!userForUnitTest) {
		logger.error("user authentication required for deterministic selection", {})
		throw errors.new("user authentication required")
	}
	const userMetaForUnitTest = parseUserPublicMetadata(userForUnitTest.publicMetadata)
	if (!userMetaForUnitTest.sourceId) {
		logger.error("user source id missing for deterministic selection", {})
		throw errors.new("user source id missing")
	}
	const progressForUnitTest = await errors.try(
		powerpath.getAssessmentProgress(userMetaForUnitTest.sourceId, componentResource.sourcedId)
	)
	if (progressForUnitTest.error) {
		logger.error("failed to fetch assessment progress for deterministic selection", {
			error: progressForUnitTest.error,
			componentResourceSourcedId: componentResource.sourcedId
		})
		throw errors.wrap(progressForUnitTest.error, "powerpath assessment progress")
	}
	const attemptNumberForUnitTest = progressForUnitTest.data.attempt
	if (typeof attemptNumberForUnitTest !== "number") {
		logger.error("assessment attempt number missing", { componentResourceSourcedId: componentResource.sourcedId })
		throw errors.new("assessment attempt number missing")
	}

	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, questionsResult.data.questions, {
		baseSeed: `${userMetaForUnitTest.sourceId}:${resource.sourcedId}`,
		attemptNumber: attemptNumberForUnitTest
	})

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id, // Add course ID
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/test/${resourceMetadata.khanSlug}`,
			description: resourceMetadata.khanDescription,
			type: "UnitTest" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchCourseChallengePage_TestData(params: {
	test: string
	course: string
	subject: string
}): Promise<CourseChallengePageData> {
	// Opt into dynamic rendering since we use Math.random() for shuffling
	await connection()

	logger.info("fetchCourseChallengePage_TestData called", { params })

	// Step 1: Find the course by its slug to get its sourcedId.
	const courseResult = await errors.try(getAllCoursesBySlug(params.course))
	if (courseResult.error) {
		logger.error("failed to fetch course by slug", { error: courseResult.error, slug: params.course })
		throw errors.wrap(courseResult.error, "fetch course")
	}
	const course = courseResult.data[0]
	if (!course) {
		notFound()
	}
	const onerosterCourseSourcedId = course.sourcedId

	// Step 2: Find the "dummy" course component that holds course challenges.
	// This component is predictably created with the slug "course-challenge".
	const challengeComponentResult = await errors.try(
		getCourseComponentByCourseAndSlug(onerosterCourseSourcedId, "course-challenge")
	)
	if (challengeComponentResult.error) {
		logger.error("failed to fetch course challenge component", {
			error: challengeComponentResult.error,
			onerosterCourseSourcedId
		})
		throw errors.wrap(challengeComponentResult.error, "fetch course challenge component")
	}

	// There might be multiple components with the same slug - find the one with resources
	const candidateComponents = challengeComponentResult.data
	if (candidateComponents.length === 0) {
		logger.warn("course challenge component not found for course", { onerosterCourseSourcedId })
		notFound()
	}

	logger.info("found course challenge component candidates", {
		count: candidateComponents.length,
		candidates: candidateComponents.map((c) => ({ sourcedId: c.sourcedId, title: c.title })),
		onerosterCourseSourcedId
	})

	// Step 3: Find all component-resource links to determine which component to use
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch all component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch all component resources")
	}

	// Find which candidate component actually has resources
	let challengeComponent = null
	let relevantComponentResources: typeof allComponentResourcesResult.data = []

	for (const candidate of candidateComponents) {
		const candidateResources = allComponentResourcesResult.data.filter(
			(cr) => cr.courseComponent.sourcedId === candidate.sourcedId
		)

		if (candidateResources.length > 0) {
			challengeComponent = candidate
			relevantComponentResources = candidateResources
			logger.info("selected course challenge component with resources", {
				componentSourcedId: candidate.sourcedId,
				resourceCount: candidateResources.length
			})
			break
		}
	}

	if (!challengeComponent || relevantComponentResources.length === 0) {
		logger.warn("no course challenge component with resources found", {
			candidateCount: candidateComponents.length,
			onerosterCourseSourcedId
		})
		notFound()
	}

	// Step 4: Find the specific resource that matches the `test` slug from the URL.
	const allRelevantResourceIds = new Set(relevantComponentResources.map((cr) => cr.resource.sourcedId))
	const allResourcesResult = await errors.try(getAllResources())
	if (allResourcesResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesResult.error })
		throw errors.wrap(allResourcesResult.error, "fetch all resources")
	}

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "fetchCourseChallengePage_TestData test parameter")
	logger.info("searching for resource with slug", {
		slug: params.test
	})

	const testResource = allResourcesResult.data.find((res) => {
		if (!allRelevantResourceIds.has(res.sourcedId)) {
			return false
		}
		const metadataResult = ResourceMetadataSchema.safeParse(res.metadata)
		return metadataResult.success && metadataResult.data.khanSlug === params.test
	})

	if (!testResource) {
		logger.error("could not find a matching course challenge resource for slug", {
			slug: params.test,

			onerosterCourseSourcedId
		})
		notFound()
	}

	// Find the ComponentResource that links this course challenge resource to the dummy component
	const componentResource = relevantComponentResources.find(
		(cr) =>
			cr.resource.sourcedId === testResource.sourcedId && cr.courseComponent.sourcedId === challengeComponent.sourcedId
	)

	if (!componentResource) {
		logger.error("could not find componentResource linking course challenge to its component", {
			resourceSourcedId: testResource.sourcedId,
			componentSourcedId: challengeComponent.sourcedId
		})
		notFound()
	}

	// The rest of the function remains the same, as we have now successfully found the resource.
	const testResourceMetadataResult = ResourceMetadataSchema.safeParse(testResource.metadata)
	if (!testResourceMetadataResult.success) {
		logger.error("invalid test resource metadata", {
			resourceSourcedId: testResource.sourcedId,
			error: testResourceMetadataResult.error
		})
		throw errors.wrap(testResourceMetadataResult.error, "invalid test resource metadata")
	}

	if (testResourceMetadataResult.data.activityType !== "CourseChallenge") {
		logger.error("invalid activityType for course challenge page", {
			resourceSourcedId: testResource.sourcedId,
			expected: "CourseChallenge",
			actualActivityType: testResourceMetadataResult.data.activityType
		})
		throw errors.new("invalid activity type")
	}
	const testResourceMetadata = testResourceMetadataResult.data

	const qtiTestDataResult = await errors.try(getAllQuestionsForTest(testResource.sourcedId))
	if (qtiTestDataResult.error) {
		logger.error("failed to fetch questions for test", {
			testSourcedId: testResource.sourcedId,
			error: qtiTestDataResult.error
		})
		throw errors.wrap(qtiTestDataResult.error, "fetch questions for test")
	}

	if (!Array.isArray(qtiTestDataResult.data.questions)) {
		logger.error("CRITICAL: QTI test questions are not an array", {
			testSourcedId: testResource.sourcedId,
			questionsData: qtiTestDataResult.data.questions
		})
		throw errors.new("QTI test questions: malformed data")
	}

	// Fetch the assessment test XML to get selection and ordering rules
	const assessmentTestResult = await errors.try(getAssessmentTest(testResource.sourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML for course challenge", {
			testSourcedId: testResource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for course challenge")
	}

	// Apply selection and ordering rules with strict non-repetition using baseSeed + attempt
	const userForChallenge = await currentUser()
	if (!userForChallenge) {
		logger.error("user authentication required for deterministic selection", {})
		throw errors.new("user authentication required")
	}
	const userMetaForChallenge = parseUserPublicMetadata(userForChallenge.publicMetadata)
	if (!userMetaForChallenge.sourceId) {
		logger.error("user source id missing for deterministic selection", {})
		throw errors.new("user source id missing")
	}
	const progressForChallenge = await errors.try(
		powerpath.getAssessmentProgress(userMetaForChallenge.sourceId, componentResource.sourcedId)
	)
	if (progressForChallenge.error) {
		logger.error("failed to fetch assessment progress for deterministic selection", {
			error: progressForChallenge.error,
			componentResourceSourcedId: componentResource.sourcedId
		})
		throw errors.wrap(progressForChallenge.error, "powerpath assessment progress")
	}
	const attemptNumberForChallenge = progressForChallenge.data.attempt
	if (typeof attemptNumberForChallenge !== "number") {
		logger.error("assessment attempt number missing", { componentResourceSourcedId: componentResource.sourcedId })
		throw errors.new("assessment attempt number missing")
	}

	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, qtiTestDataResult.data.questions, {
		baseSeed: `${userMetaForChallenge.sourceId}:${testResource.sourcedId}`,
		attemptNumber: attemptNumberForChallenge
	})

	return {
		test: {
			id: testResource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: onerosterCourseSourcedId, // Add course ID
			type: "CourseChallenge",
			title: testResource.title,
			slug: params.test,
			path: `/${params.subject}/${params.course}/test/${testResourceMetadata.khanSlug}`,
			description: testResourceMetadata.khanDescription,
			expectedXp: testResourceMetadata.xp
		},
		questions
	}
}

export async function fetchCourseChallengePage_LayoutData(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
	// Opt into dynamic rendering since we use Math.random() for shuffling
	await connection()

	const coursePageData = await fetchCoursePageData({ subject: params.subject, course: params.course })

	// The CourseSidebar component needs the full course object with units,
	// the lesson count, and any challenges.
	return {
		course: coursePageData.course,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges
	}
}

export async function fetchQuizRedirectPath(params: {
	subject: string
	course: string
	unit: string
	quiz: string
}): Promise<string> {
	return findAssessmentRedirectPath({
		...params,
		assessment: params.quiz,
		assessmentType: "quiz"
	})
}

export async function fetchTestRedirectPath(params: {
	subject: string
	course: string
	unit: string
	test: string
}): Promise<string> {
	return findAssessmentRedirectPath({
		...params,
		assessment: params.test,
		assessmentType: "unittest"
	})
}
