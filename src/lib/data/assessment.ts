import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getCourseComponentsByParentId,
	getResourcesBySlugAndType
} from "@/lib/data/fetchers/oneroster"
import { getAllQuestionsForTest, getAssessmentTest } from "@/lib/data/fetchers/qti"
import { ComponentMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { Question } from "@/lib/types/domain"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
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
	allQuestions: TestQuestionsResponse["questions"]
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
			itemRefs = shuffleArray(itemRefs)
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
				itemRefs = itemRefs.slice(0, selectCount)
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
	// Pass only the params needed by fetchLessonLayoutData, not the quiz param
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.quiz, "qti", "quiz"))

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

	// Because we use a discriminated union, we must also check the type
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for quiz page", {
			resourceSourcedId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
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

	// Apply selection and ordering rules to the fetched questions.
	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, questionsResult.data.questions)

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
	// Pass only the params needed by fetchLessonLayoutData, not the test param
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.test, "qti", "unittest"))

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

	// Because we use a discriminated union, we must also check the type
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for unittest page", {
			resourceSourcedId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
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

	// Apply selection and ordering rules to the fetched questions.
	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, questionsResult.data.questions)

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

	// Decode the URL-encoded test parameter (e.g., "x2832fbb7463fe65a%3Acourse-challenge" -> "x2832fbb7463fe65a:course-challenge")
	const decodedTestSlug = decodeURIComponent(params.test)
	logger.info("searching for resource with slug", {
		rawSlug: params.test,
		decodedSlug: decodedTestSlug
	})

	const testResource = allResourcesResult.data.find((res) => {
		if (!allRelevantResourceIds.has(res.sourcedId)) {
			return false
		}
		const metadataResult = ResourceMetadataSchema.safeParse(res.metadata)
		return metadataResult.success && metadataResult.data.khanSlug === decodedTestSlug
	})

	if (!testResource) {
		logger.error("could not find a matching course challenge resource for slug", {
			slug: params.test,
			decodedSlug: decodedTestSlug,
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

	if (testResourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for test page", {
			resourceSourcedId: testResource.sourcedId,
			expected: "qti",
			actual: testResourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
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

	// Apply selection and ordering rules to the fetched questions.
	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, qtiTestDataResult.data.questions)

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
	logger.info("fetchQuizRedirectPath called", { params })
	const decodedUnit = decodeURIComponent(params.unit)

	// First, fetch the course to get its sourcedId
	const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", { error: coursesResult.error, slug: params.course })
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		throw errors.new("course not found for redirect")
	}
	const courseSourcedId = course.sourcedId

	// Look up the unit by BOTH course AND slug to avoid collisions
	const unitResult = await errors.try(getCourseComponentByCourseAndSlug(courseSourcedId, decodedUnit))
	if (unitResult.error) {
		logger.error("failed to fetch unit by course and slug", {
			error: unitResult.error,
			courseSourcedId: courseSourcedId,
			slug: decodedUnit
		})
		throw errors.wrap(unitResult.error, "failed to fetch unit by course and slug")
	}

	// Add debugging for multiple results
	if (unitResult.data.length > 1) {
		logger.warn("multiple units found with same slug", {
			slug: decodedUnit,
			courseSourcedId,
			foundUnits: unitResult.data.map((u) => ({
				sourcedId: u.sourcedId,
				title: u.title,
				courseSourcedId: u.course?.sourcedId
			}))
		})
	}

	const unit = unitResult.data[0]
	if (!unit) {
		// This will be caught by the page and result in a 404
		throw errors.new("unit not found for redirect")
	}
	const unitSourcedId = unit.sourcedId

	logger.debug("found unit for redirect", {
		unitSourcedId,
		unitTitle: unit.title,
		unitSlug: decodedUnit
	})

	// Fetch all lessons for this unit to find quiz sibling
	const lessonsResult = await errors.try(getCourseComponentsByParentId(unitSourcedId))
	if (lessonsResult.error) {
		logger.error("failed to get lessons for unit", { unitSourcedId, error: lessonsResult.error })
		throw errors.wrap(lessonsResult.error, "failed to get lessons for unit")
	}

	const lessons = lessonsResult.data
	if (lessons.length === 0) {
		logger.warn("no lessons found in unit for redirect", { unitSourcedId })
		throw errors.new("no lessons found in unit")
	}

	// 1. Fetch all resources for this unit and its lessons.
	const unitAndLessonComponentSourcedIds = [unitSourcedId, ...lessons.map((l) => l.sourcedId)]
	const allComponentResourcesInUnitResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesInUnitResult.error) {
		logger.error("failed to fetch all component resources for unit and lessons", {
			unitSourcedId,
			error: allComponentResourcesInUnitResult.error
		})
		throw errors.wrap(allComponentResourcesInUnitResult.error, "fetch component resources for unit/lesson context")
	}

	const relevantComponentResources = allComponentResourcesInUnitResult.data.filter((cr) =>
		unitAndLessonComponentSourcedIds.includes(cr.courseComponent.sourcedId)
	)
	const relevantResourceIds = relevantComponentResources.map((cr) => cr.resource.sourcedId)

	const allResourcesResult = await errors.try(getAllResources())
	if (allResourcesResult.error) {
		logger.error("failed to fetch all resources for quiz validation", {
			unitSourcedId,
			error: allResourcesResult.error
		})
		throw errors.wrap(allResourcesResult.error, "fetch all resources for quiz validation")
	}

	const quizResource = allResourcesResult.data.find((res) => {
		if (!relevantResourceIds.includes(res.sourcedId)) return false
		const metadataResult = ResourceMetadataSchema.safeParse(res.metadata)
		return (
			metadataResult.success &&
			metadataResult.data.khanSlug === params.quiz &&
			metadataResult.data.type === "qti" &&
			metadataResult.data.khanLessonType === "quiz"
		)
	})

	if (!quizResource) {
		logger.warn("quiz resource not found within the specified unit/lesson hierarchy", {
			unitSourcedId,
			quizSlug: params.quiz
		})
		notFound()
	}

	// Sort by ordering and get the last lesson's slug
	lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	const lastLesson = lessons[lessons.length - 1]
	if (!lastLesson) {
		logger.warn("could not determine last lesson", { unitSourcedId })
		throw errors.new("could not determine last lesson")
	}

	// Validate lesson metadata with Zod
	const lastLessonMetadataResult = ComponentMetadataSchema.safeParse(lastLesson.metadata)
	if (!lastLessonMetadataResult.success) {
		logger.error("invalid last lesson metadata", {
			lessonSourcedId: lastLesson.sourcedId,
			error: lastLessonMetadataResult.error
		})
		throw errors.wrap(lastLessonMetadataResult.error, "invalid last lesson metadata")
	}
	const lastLessonSlug = lastLessonMetadataResult.data.khanSlug
	if (!lastLessonSlug) {
		logger.error("last lesson missing khanSlug", { lessonSourcedId: lastLesson.sourcedId })
		throw errors.new("last lesson missing khanSlug")
	}

	// Construct the redirect path
	return `/${params.subject}/${params.course}/${params.unit}/${lastLessonSlug}/quiz/${params.quiz}`
}

export async function fetchTestRedirectPath(params: {
	subject: string
	course: string
	unit: string
	test: string
}): Promise<string> {
	logger.info("fetchTestRedirectPath called", { params })
	const decodedUnit = decodeURIComponent(params.unit)

	// First, fetch the course to get its sourcedId
	const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", { error: coursesResult.error, slug: params.course })
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		throw errors.new("course not found for redirect")
	}
	const courseSourcedId = course.sourcedId

	// Look up the unit by BOTH course AND slug to avoid collisions
	const unitResult = await errors.try(getCourseComponentByCourseAndSlug(courseSourcedId, decodedUnit))
	if (unitResult.error) {
		logger.error("failed to fetch unit by course and slug", {
			error: unitResult.error,
			courseSourcedId: courseSourcedId,
			slug: decodedUnit
		})
		throw errors.wrap(unitResult.error, "failed to fetch unit by course and slug")
	}

	// Add debugging for multiple results
	if (unitResult.data.length > 1) {
		logger.warn("multiple units found with same slug", {
			slug: decodedUnit,
			courseSourcedId,
			foundUnits: unitResult.data.map((u) => ({
				sourcedId: u.sourcedId,
				title: u.title,
				courseSourcedId: u.course?.sourcedId
			}))
		})
	}

	const unit = unitResult.data[0]
	if (!unit) {
		// This will be caught by the page and result in a 404
		throw errors.new("unit not found for redirect")
	}
	const unitSourcedId = unit.sourcedId

	logger.debug("found unit for redirect", {
		unitSourcedId,
		unitTitle: unit.title,
		unitSlug: decodedUnit
	})

	// Fetch all lessons for this unit to find test sibling
	const lessonsResult = await errors.try(getCourseComponentsByParentId(unitSourcedId))
	if (lessonsResult.error) {
		logger.error("failed to get lessons for unit", { unitSourcedId, error: lessonsResult.error })
		throw errors.wrap(lessonsResult.error, "failed to get lessons for unit")
	}

	const lessons = lessonsResult.data
	if (lessons.length === 0) {
		logger.warn("no lessons found in unit for redirect", { unitSourcedId })
		throw errors.new("no lessons found in unit")
	}

	// 1. Fetch all resources for this unit and its lessons.
	const unitAndLessonComponentSourcedIds = [unitSourcedId, ...lessons.map((l) => l.sourcedId)]
	const allComponentResourcesInUnitResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesInUnitResult.error) {
		logger.error("failed to fetch all component resources for unit and lessons", {
			unitSourcedId,
			error: allComponentResourcesInUnitResult.error
		})
		throw errors.wrap(allComponentResourcesInUnitResult.error, "fetch component resources for unit/lesson context")
	}

	const relevantComponentResources = allComponentResourcesInUnitResult.data.filter((cr) =>
		unitAndLessonComponentSourcedIds.includes(cr.courseComponent.sourcedId)
	)
	const relevantResourceIds = relevantComponentResources.map((cr) => cr.resource.sourcedId)

	const allResourcesResult = await errors.try(getAllResources())
	if (allResourcesResult.error) {
		logger.error("failed to fetch all resources for unit test validation", {
			unitSourcedId,
			error: allResourcesResult.error
		})
		throw errors.wrap(allResourcesResult.error, "fetch all resources for unit test validation")
	}

	const unitTestResource = allResourcesResult.data.find((res) => {
		if (!relevantResourceIds.includes(res.sourcedId)) return false
		const metadataResult = ResourceMetadataSchema.safeParse(res.metadata)
		return (
			metadataResult.success &&
			metadataResult.data.khanSlug === params.test &&
			metadataResult.data.type === "qti" &&
			metadataResult.data.khanLessonType === "unittest"
		)
	})

	if (!unitTestResource) {
		logger.warn("unit test resource not found within the specified unit/lesson hierarchy", {
			unitSourcedId,
			testSlug: params.test
		})
		notFound()
	}

	// Sort by ordering and get the last lesson's slug
	lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	const lastLesson = lessons[lessons.length - 1]
	if (!lastLesson) {
		logger.warn("could not determine last lesson", { unitSourcedId })
		throw errors.new("could not determine last lesson")
	}

	// Validate lesson metadata with Zod
	const lastLessonMetadataResult = ComponentMetadataSchema.safeParse(lastLesson.metadata)
	if (!lastLessonMetadataResult.success) {
		logger.error("invalid last lesson metadata", {
			lessonSourcedId: lastLesson.sourcedId,
			error: lastLessonMetadataResult.error
		})
		throw errors.wrap(lastLessonMetadataResult.error, "invalid last lesson metadata")
	}
	const lastLessonSlug = lastLessonMetadataResult.data.khanSlug
	if (!lastLessonSlug) {
		logger.error("last lesson missing khanSlug", { lessonSourcedId: lastLesson.sourcedId })
		throw errors.new("last lesson missing khanSlug")
	}

	// Construct the redirect path
	return `/${params.subject}/${params.course}/${params.unit}/${lastLessonSlug}/test/${params.test}`
}
