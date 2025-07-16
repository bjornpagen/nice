import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllCoursesBySlug,
	getCourseComponentBySlug,
	getCourseComponentsByParentId,
	getResourceByCourseAndSlug,
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
	"use cache"
	const layoutDataPromise = fetchLessonLayoutData(params)
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

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid quiz resource metadata", {
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid quiz resource metadata")
	}

	// Because we use a discriminated union, we must also check the type
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for quiz page", {
			resourceId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}

	const resourceMetadata = resourceMetadataResult.data

	// Fetch questions from QTI server
	const questionsResult = await errors.try(getAllQuestionsForTest(resource.sourcedId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for quiz", { testId: resource.sourcedId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for quiz")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))

	return {
		quiz: {
			id: resource.sourcedId,
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
	"use cache"
	const layoutDataPromise = fetchLessonLayoutData(params)
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

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid unittest resource metadata", {
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid unittest resource metadata")
	}

	// Because we use a discriminated union, we must also check the type
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for unittest page", {
			resourceId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}

	const resourceMetadata = resourceMetadataResult.data

	// Fetch questions from QTI server
	const questionsResult = await errors.try(getAllQuestionsForTest(resource.sourcedId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for unittest", { testId: resource.sourcedId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for unittest")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))

	return {
		test: {
			id: resource.sourcedId,
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
	"use cache"
	const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", { error: coursesResult.error, slug: params.course })
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		notFound()
	}

	const testResourceResult = await errors.try(getResourceByCourseAndSlug(course.sourcedId, params.test, "qti"))
	if (testResourceResult.error) {
		logger.error("failed to fetch test resource", { error: testResourceResult.error, courseId: course.sourcedId })
		throw errors.wrap(testResourceResult.error, "fetch test resource")
	}
	const testResource = testResourceResult.data[0]
	if (!testResource) {
		notFound()
	}

	// Validate test resource metadata with Zod
	const testResourceMetadataResult = ResourceMetadataSchema.safeParse(testResource.metadata)
	if (!testResourceMetadataResult.success) {
		logger.error("invalid test resource metadata", {
			resourceId: testResource.sourcedId,
			error: testResourceMetadataResult.error
		})
		throw errors.wrap(testResourceMetadataResult.error, "invalid test resource metadata")
	}

	// Because we use a discriminated union, we must also check the type
	if (testResourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for test page", {
			resourceId: testResource.sourcedId,
			expected: "qti",
			actual: testResourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}
	const testResourceMetadata = testResourceMetadataResult.data

	const qtiTestDataResult = await errors.try(getAllQuestionsForTest(testResource.sourcedId))
	if (qtiTestDataResult.error) {
		logger.error("failed to fetch questions for course challenge", {
			testId: testResource.sourcedId,
			error: qtiTestDataResult.error
		})
		throw errors.wrap(qtiTestDataResult.error, "fetch questions for course challenge")
	}

	const questions = qtiTestDataResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))
	return {
		test: {
			id: testResource.sourcedId,
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
	"use cache"
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
	"use cache"
	const decodedUnit = decodeURIComponent(params.unit)

	// Look up the unit by its slug to get its sourcedId
	const unitResult = await errors.try(getCourseComponentBySlug(decodedUnit))
	if (unitResult.error) {
		logger.error("failed to fetch unit by slug", { error: unitResult.error, slug: decodedUnit })
		throw errors.wrap(unitResult.error, "failed to fetch unit by slug")
	}
	const unit = unitResult.data[0]
	if (!unit) {
		// This will be caught by the page and result in a 404
		throw errors.new("unit not found for redirect")
	}
	const unitSourcedId = unit.sourcedId

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
			lessonId: firstLesson.sourcedId,
			error: firstLessonMetadataResult.error
		})
		throw errors.wrap(firstLessonMetadataResult.error, "invalid first lesson metadata")
	}
	const firstLessonSlug = firstLessonMetadataResult.data.khanSlug
	if (!firstLessonSlug) {
		logger.error("first lesson missing khanSlug", { lessonId: firstLesson.sourcedId })
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
	"use cache"
	const decodedUnit = decodeURIComponent(params.unit)

	// Look up the unit by its slug to get its sourcedId
	const unitResult = await errors.try(getCourseComponentBySlug(decodedUnit))
	if (unitResult.error) {
		logger.error("failed to fetch unit by slug", { error: unitResult.error, slug: decodedUnit })
		throw errors.wrap(unitResult.error, "failed to fetch unit by slug")
	}
	const unit = unitResult.data[0]
	if (!unit) {
		// This will be caught by the page and result in a 404
		throw errors.new("unit not found for redirect")
	}
	const unitSourcedId = unit.sourcedId

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
			lessonId: firstLesson.sourcedId,
			error: firstLessonMetadataResult.error
		})
		throw errors.wrap(firstLessonMetadataResult.error, "invalid first lesson metadata")
	}
	const firstLessonSlug = firstLessonMetadataResult.data.khanSlug
	if (!firstLessonSlug) {
		logger.error("first lesson missing khanSlug", { lessonId: firstLesson.sourcedId })
		throw errors.new("first lesson missing khanSlug")
	}

	// Construct the redirect path
	return `/${params.subject}/${params.course}/${params.unit}/${firstLessonSlug}/test/${params.test}`
}
