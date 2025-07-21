import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getCourseComponentsByParentId,
	getResourcesBySlugAndType
} from "@/lib/data/fetchers/oneroster"
import { getAllQuestionsForTest } from "@/lib/data/fetchers/qti"
import { ComponentMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
import { fetchCoursePageData } from "./course"
import { fetchLessonLayoutData } from "./lesson"

export async function fetchQuizPageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizPageData> {
	logger.info("fetchQuizPageData called", { params })
	// Pass only the params needed by fetchLessonLayoutData, not the quiz param
	const layoutDataPromise = fetchLessonLayoutData({
		subject: params.subject,
		course: params.course,
		unit: params.unit,
		lesson: params.lesson
	})
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.quiz, "qti", "quiz"))

	const [layoutData, resourceResult] = await Promise.all([layoutDataPromise, resourcePromise])

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

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))

	return {
		quiz: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			title: resource.title,
			description: resourceMetadata.khanDescription,
			type: "Quiz" as const
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
	logger.info("fetchUnitTestPageData called", { params })
	// Pass only the params needed by fetchLessonLayoutData, not the test param
	const layoutDataPromise = fetchLessonLayoutData({
		subject: params.subject,
		course: params.course,
		unit: params.unit,
		lesson: params.lesson
	})
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.test, "qti", "unittest"))

	const [layoutData, resourceResult] = await Promise.all([layoutDataPromise, resourcePromise])

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

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))

	return {
		test: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			title: resource.title,
			description: resourceMetadata.khanDescription,
			type: "UnitTest" as const
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
	logger.info("fetchCourseChallengePage_TestData called", { params })

	// Step 1: Find the course by its slug to get its sourcedId.
	const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", { error: coursesResult.error, slug: params.course })
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		notFound()
	}
	const courseSourcedId = course.sourcedId

	// Step 2: Find the "dummy" course component that holds course challenges.
	// This component is predictably created with the slug "course-challenge".
	const challengeComponentResult = await errors.try(
		getCourseComponentByCourseAndSlug(courseSourcedId, "course-challenge")
	)
	if (challengeComponentResult.error) {
		logger.error("failed to fetch course challenge component", {
			error: challengeComponentResult.error,
			courseSourcedId
		})
		throw errors.wrap(challengeComponentResult.error, "fetch course challenge component")
	}

	// There might be multiple components with the same slug - find the one with resources
	const candidateComponents = challengeComponentResult.data
	if (candidateComponents.length === 0) {
		logger.warn("course challenge component not found for course", { courseSourcedId })
		notFound()
	}

	logger.info("found course challenge component candidates", {
		count: candidateComponents.length,
		candidates: candidateComponents.map((c) => ({ sourcedId: c.sourcedId, title: c.title })),
		courseSourcedId
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
			courseSourcedId
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
			courseSourcedId
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

	const questions = qtiTestDataResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))
	return {
		test: {
			id: testResource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			type: "CourseChallenge",
			title: testResource.title,
			slug: params.test,
			description: testResourceMetadata.khanDescription
		},
		questions
	}
}

export async function fetchCourseChallengePage_LayoutData(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
	logger.info("fetchCourseChallengePage_LayoutData called", { params })
	// Reuse the main course page data fetcher to get all necessary context
	const coursePageData = await fetchCoursePageData({
		subject: params.subject,
		course: params.course
	})

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

	// Sort by ordering and get the first lesson's slug
	lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	const firstLesson = lessons[0]
	if (!firstLesson) {
		logger.warn("could not determine first lesson", { unitSourcedId })
		throw errors.new("could not determine first lesson")
	}

	// Validate lesson metadata with Zod
	const firstLessonMetadataResult = ComponentMetadataSchema.safeParse(firstLesson.metadata)
	if (!firstLessonMetadataResult.success) {
		logger.error("invalid first lesson metadata", {
			lessonSourcedId: firstLesson.sourcedId,
			error: firstLessonMetadataResult.error
		})
		throw errors.wrap(firstLessonMetadataResult.error, "invalid first lesson metadata")
	}
	const firstLessonSlug = firstLessonMetadataResult.data.khanSlug
	if (!firstLessonSlug) {
		logger.error("first lesson missing khanSlug", { lessonSourcedId: firstLesson.sourcedId })
		throw errors.new("first lesson missing khanSlug")
	}

	// Construct the redirect path
	return `/${params.subject}/${params.course}/${params.unit}/${firstLessonSlug}/quiz/${params.quiz}`
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

	// Sort by ordering and get the first lesson's slug
	lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	const firstLesson = lessons[0]
	if (!firstLesson) {
		logger.warn("could not determine first lesson", { unitSourcedId })
		throw errors.new("could not determine first lesson")
	}

	// Validate lesson metadata with Zod
	const firstLessonMetadataResult = ComponentMetadataSchema.safeParse(firstLesson.metadata)
	if (!firstLessonMetadataResult.success) {
		logger.error("invalid first lesson metadata", {
			lessonSourcedId: firstLesson.sourcedId,
			error: firstLessonMetadataResult.error
		})
		throw errors.wrap(firstLessonMetadataResult.error, "invalid first lesson metadata")
	}
	const firstLessonSlug = firstLessonMetadataResult.data.khanSlug
	if (!firstLessonSlug) {
		logger.error("first lesson missing khanSlug", { lessonSourcedId: firstLesson.sourcedId })
		throw errors.new("first lesson missing khanSlug")
	}

	// Construct the redirect path
	return `/${params.subject}/${params.course}/${params.unit}/${firstLessonSlug}/test/${params.test}`
}
