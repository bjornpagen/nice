import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import type {
	CourseChallengeLayoutData,
	CourseChallengePageData,
	QuizPageData,
	UnitTestPageData
} from "@/lib/types/page"
import { oneroster } from "../clients"
import { ResourceMetadataSchema } from "../oneroster-metadata"
import { fetchCoursePageData } from "./course"

export async function fetchQuizPageData(params: { quiz: string }): Promise<QuizPageData> {
	// Look up resource by slug
	const filter = `metadata.khanSlug='${params.quiz}' AND metadata.type='qti' AND metadata.khanLessonType='quiz'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
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
		logger.error("failed to parse quiz resource metadata", {
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid quiz resource metadata")
	}
	const resourceMetadata = resourceMetadataResult.data

	// Use the sourcedId as the test identifier for QTI
	const qtiTestId = resource.sourcedId

	// Fetch questions from QTI server using the existing pattern
	const questionsResult = await errors.try(qti.getAllQuestionsForTest(qtiTestId))
	if (questionsResult.error) {
		if (errors.is(questionsResult.error, ErrQtiNotFound)) {
			logger.warn("quiz test not found in QTI server", { testId: qtiTestId })
			// Return empty questions array if the test is not yet in QTI
			return {
				quiz: {
					id: resource.sourcedId,
					title: resource.title,
					description: resourceMetadata.description,
					type: "Quiz" as const
				},
				questions: []
			}
		}
		logger.error("failed to fetch questions for quiz", { testId: qtiTestId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for quiz")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))

	return {
		quiz: {
			id: resource.sourcedId,
			title: resource.title,
			description: resourceMetadata.description,
			type: "Quiz" as const
		},
		questions
	}
}

export async function fetchUnitTestPageData(params: { test: string }): Promise<UnitTestPageData> {
	// Look up resource by slug
	const filter = `metadata.khanSlug='${params.test}' AND metadata.type='qti' AND metadata.khanLessonType='unittest'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch unit test resource by slug", { error: resourceResult.error, slug: params.test })
		throw errors.wrap(resourceResult.error, "failed to fetch unit test resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("failed to parse unit test resource metadata", {
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid unit test resource metadata")
	}
	const resourceMetadata = resourceMetadataResult.data

	// Use the sourcedId as the test identifier for QTI
	const qtiTestId = resource.sourcedId

	// Fetch questions from QTI server
	const questionsResult = await errors.try(qti.getAllQuestionsForTest(qtiTestId))
	if (questionsResult.error) {
		if (errors.is(questionsResult.error, ErrQtiNotFound)) {
			logger.warn("unit test not found in QTI server", { testId: qtiTestId })
			// Return empty questions array if the test is not yet in QTI
			return {
				test: {
					id: resource.sourcedId,
					title: resource.title,
					description: resourceMetadata.description,
					type: "UnitTest" as const
				},
				questions: []
			}
		}
		logger.error("failed to fetch questions for unit test", { testId: qtiTestId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for unit test")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))

	return {
		test: {
			id: resource.sourcedId,
			title: resource.title,
			description: resourceMetadata.description,
			type: "UnitTest" as const
		},
		questions
	}
}

export async function fetchCourseChallengePage_TestData(params: {
	test: string
	course: string
	subject: string
}): Promise<CourseChallengePageData> {
	const courseFilter = `metadata.khanSlug='${params.course}'`
	const coursesResult = await errors.try(oneroster.getAllCourses({ filter: courseFilter }))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", { error: coursesResult.error, slug: params.course })
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		notFound()
	}

	const testFilter = `metadata.khanSlug='${params.test}' AND metadata.type='qti' AND course.sourcedId='${course.sourcedId}'`
	const testResourceResult = await errors.try(oneroster.getAllResources({ filter: testFilter }))
	if (testResourceResult.error) {
		logger.error("failed to fetch test resource", { error: testResourceResult.error, filter: testFilter })
		throw errors.wrap(testResourceResult.error, "fetch test resource")
	}
	const testResource = testResourceResult.data[0]
	if (!testResource) {
		notFound()
	}

	// Validate test resource metadata with Zod
	const testResourceMetadataResult = ResourceMetadataSchema.safeParse(testResource.metadata)
	if (!testResourceMetadataResult.success) {
		logger.error("failed to parse test resource metadata", {
			resourceId: testResource.sourcedId,
			error: testResourceMetadataResult.error
		})
		throw errors.wrap(testResourceMetadataResult.error, "invalid test resource metadata")
	}
	const testResourceMetadata = testResourceMetadataResult.data

	const qtiTestData = await qti.getAllQuestionsForTest(testResource.sourcedId)
	const questions = qtiTestData.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))
	return {
		test: {
			id: testResource.sourcedId,
			type: "CourseChallenge",
			title: testResource.title,
			slug: params.test,
			description: testResourceMetadata.description
		},
		questions
	}
}

export async function fetchCourseChallengePage_LayoutData(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
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
