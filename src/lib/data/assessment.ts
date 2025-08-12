import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { powerpath } from "@/lib/clients"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getResourcesBySlugAndType
} from "@/lib/data/fetchers/oneroster"
import { getAssessmentTest } from "@/lib/data/fetchers/qti"
import { prepareInteractiveAssessment } from "@/lib/interactive-assessments"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { resolveAllQuestionsForTestFromXml } from "@/lib/qti-resolution"
// import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering as applyQtiSelectionAndOrderingCommon } from "@/lib/qti-selection"
// NOTE: selection util now returns domain Question; direct type import not required here
// import type { Question } from "@/lib/types/domain"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import { findAssessmentRedirectPath } from "@/lib/utils/assessment-redirect"
import { fetchCoursePageData } from "./course"
import { fetchLessonLayoutData } from "./lesson"

export const applyQtiSelectionAndOrdering = applyQtiSelectionAndOrderingCommon

export async function fetchQuizPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizPageData> {
	// dynamic opt-in is handled at the page level

	const layoutData = await fetchLessonLayoutData(params)

	logger.info("fetchQuizPageData called", { params })

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.quiz, "fetchQuizPageData quiz parameter")

	// Pass only the params needed by fetchLessonLayoutData, not the quiz param
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.quiz, "interactive", "Quiz"))

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
	if (resourceMetadataResult.data.khanActivityType !== "Quiz") {
		logger.error("invalid activityType for quiz page", {
			resourceSourcedId: resource.sourcedId,
			expected: "Quiz",
			actualActivityType: resourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
	}

	const resourceMetadata = resourceMetadataResult.data

	// Fetch the assessment test XML to get selection and ordering rules
	const assessmentTestResult = await errors.try(getAssessmentTest(resource.sourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML for quiz", {
			testSourcedId: resource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for quiz")
	}

	// Resolve questions by parsing XML and fetching items
	const resolvedQuestionsResult = await errors.try(resolveAllQuestionsForTestFromXml(assessmentTestResult.data))
	if (resolvedQuestionsResult.error) {
		logger.error("failed to resolve questions from qti xml for quiz", {
			testSourcedId: resource.sourcedId,
			error: resolvedQuestionsResult.error
		})
		throw errors.wrap(resolvedQuestionsResult.error, "resolve questions from qti xml for quiz")
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
	const preparedQuiz = await prepareInteractiveAssessment({
		userSourceId: userMetaForQuiz.sourceId,
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest: assessmentTestResult.data,
		resolvedQuestions: resolvedQuestionsResult.data,
		rotationMode: "deterministic"
	})
	const questions = preparedQuiz.questions

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
	// dynamic opt-in is handled at the page level

	const layoutData = await fetchLessonLayoutData(params)

	logger.info("fetchUnitTestPageData called", { params })

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "fetchUnitTestPageData test parameter")

	// Pass only the params needed by fetchLessonLayoutData, not the test param
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.test, "interactive", "UnitTest"))

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
	if (resourceMetadataResult.data.khanActivityType !== "UnitTest") {
		logger.error("invalid activityType for unittest page", {
			resourceSourcedId: resource.sourcedId,
			expected: "UnitTest",
			actualActivityType: resourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
	}

	const resourceMetadata = resourceMetadataResult.data

	// Fetch the assessment test XML to get selection and ordering rules
	const assessmentTestResult = await errors.try(getAssessmentTest(resource.sourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML for unittest", {
			testSourcedId: resource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for unittest")
	}

	// Resolve questions by parsing XML and fetching items
	const resolvedQuestionsResult = await errors.try(resolveAllQuestionsForTestFromXml(assessmentTestResult.data))
	if (resolvedQuestionsResult.error) {
		logger.error("failed to resolve questions from qti xml for unittest", {
			testSourcedId: resource.sourcedId,
			error: resolvedQuestionsResult.error
		})
		throw errors.wrap(resolvedQuestionsResult.error, "resolve questions from qti xml for unittest")
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
	const preparedUnitTest = await prepareInteractiveAssessment({
		userSourceId: userMetaForUnitTest.sourceId,
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest: assessmentTestResult.data,
		resolvedQuestions: resolvedQuestionsResult.data,
		rotationMode: "random"
	})
	const questions = preparedUnitTest.questions

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
	// dynamic opt-in is handled at the page level

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

	if (testResourceMetadataResult.data.khanActivityType !== "CourseChallenge") {
		logger.error("invalid activityType for course challenge page", {
			resourceSourcedId: testResource.sourcedId,
			expected: "CourseChallenge",
			actualActivityType: testResourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
	}
	const testResourceMetadata = testResourceMetadataResult.data

	// Fetch the assessment test XML to get selection and ordering rules
	const assessmentTestResult = await errors.try(getAssessmentTest(testResource.sourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML for course challenge", {
			testSourcedId: testResource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for course challenge")
	}

	// Resolve questions by parsing XML and fetching items
	const resolvedQuestionsResult = await errors.try(resolveAllQuestionsForTestFromXml(assessmentTestResult.data))
	if (resolvedQuestionsResult.error) {
		logger.error("failed to resolve questions from qti xml for course challenge", {
			testSourcedId: testResource.sourcedId,
			error: resolvedQuestionsResult.error
		})
		throw errors.wrap(resolvedQuestionsResult.error, "resolve questions from qti xml for course challenge")
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
	const preparedChallenge = await prepareInteractiveAssessment({
		userSourceId: userMetaForChallenge.sourceId,
		resourceSourcedId: testResource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest: assessmentTestResult.data,
		resolvedQuestions: resolvedQuestionsResult.data,
		rotationMode: "random"
	})
	const questions = preparedChallenge.questions

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
	// dynamic opt-in is handled at the page level

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
