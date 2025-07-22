import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { getResourcesBySlugAndType } from "@/lib/data/fetchers/oneroster"
import { getAllQuestionsForTest, getAssessmentTest } from "@/lib/data/fetchers/qti"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { ArticlePageData, ExercisePageData, VideoPageData } from "@/lib/types/page"
import { applyQtiSelectionAndOrdering } from "./assessment"
import { fetchLessonLayoutData } from "./lesson"
import { extractYouTubeId } from "./utils"

export async function fetchArticlePageData(params: { article: string }): Promise<ArticlePageData> {
	logger.info("fetchArticlePageData called", { params })
	// Look up resource by slug
	const resourceResult = await errors.try(getResourcesBySlugAndType(params.article, "qti"))
	if (resourceResult.error) {
		logger.error("failed to fetch article resource by slug", { error: resourceResult.error, slug: params.article })
		throw errors.wrap(resourceResult.error, "failed to fetch article resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Validate resource metadata with Zod. THIS IS THE CRITICAL PATTERN.
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid article resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid article resource metadata")
	}

	// Because we use a discriminated union, we must also check the type.
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for article page", {
			resourceSourcedId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}

	// Validate that the article slug from the URL matches the resource's actual khanSlug.
	if (params.article !== resourceMetadataResult.data.khanSlug) {
		logger.warn("mismatched article slug in URL", {
			requestedSlug: params.article,
			actualSlug: resourceMetadataResult.data.khanSlug,
			resourceId: resource.sourcedId
		})
		notFound()
	}

	return {
		id: resource.sourcedId,
		title: resource.title
	}
}

export async function fetchExercisePageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	exercise: string
}): Promise<ExercisePageData> {
	// Opt into dynamic rendering since we use Math.random() for shuffling
	await connection()

	logger.info("fetchExercisePageData called", { params })
	// Pass only the params needed by fetchLessonLayoutData, not the exercise param
	const layoutDataPromise = fetchLessonLayoutData({
		subject: params.subject,
		course: params.course,
		unit: params.unit,
		lesson: params.lesson
	})
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.exercise, "qti"))

	const [layoutData, resourceResult] = await Promise.all([layoutDataPromise, resourcePromise])

	if (resourceResult.error) {
		logger.error("failed to fetch exercise resource by slug", { error: resourceResult.error, slug: params.exercise })
		throw errors.wrap(resourceResult.error, "failed to fetch exercise resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Validate resource metadata with Zod. THIS IS THE CRITICAL PATTERN.
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid exercise resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid exercise resource metadata")
	}

	// Because we use a discriminated union, we must also check the type.
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for exercise page", {
			resourceSourcedId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}

	// Validate that the exercise slug from the URL matches the resource's actual khanSlug.
	if (params.exercise !== resourceMetadataResult.data.khanSlug) {
		logger.warn("mismatched exercise slug in URL", {
			requestedSlug: params.exercise,
			actualSlug: resourceMetadataResult.data.khanSlug,
			resourceId: resource.sourcedId
		})
		notFound()
	}

	// Fetch questions from QTI server
	const questionsResult = await errors.try(getAllQuestionsForTest(resource.sourcedId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for exercise", {
			testSourcedId: resource.sourcedId,
			error: questionsResult.error
		})
		throw errors.wrap(questionsResult.error, "fetch questions for exercise")
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
		logger.error("failed to fetch assessment test XML for exercise", {
			testSourcedId: resource.sourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test for exercise")
	}

	// Use the same helper. It will correctly handle exercises that don't have
	// selection/ordering rules by returning all questions.
	const questions = applyQtiSelectionAndOrdering(assessmentTestResult.data, questionsResult.data.questions)

	return {
		exercise: {
			id: resource.sourcedId,
			title: resource.title,
			type: "Exercise" as const
		},
		questions,
		layoutData // Include layout data in the response
	}
}

export async function fetchVideoPageData(params: { video: string }): Promise<VideoPageData> {
	logger.info("fetchVideoPageData called", { params })
	// Look up resource by slug
	const resourceResult = await errors.try(getResourcesBySlugAndType(params.video, "video"))
	if (resourceResult.error) {
		logger.error("failed to fetch video resource by slug", { error: resourceResult.error, slug: params.video })
		throw errors.wrap(resourceResult.error, "failed to fetch video resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Validate resource metadata with Zod. THIS IS THE CRITICAL PATTERN.
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid video resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid video resource metadata")
	}

	// Because we use a discriminated union, we must also check the type.
	if (resourceMetadataResult.data.type !== "video") {
		logger.error("invalid resource type for video page", {
			resourceSourcedId: resource.sourcedId,
			expected: "video",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}

	// Validate that the video slug from the URL matches the resource's actual khanSlug.
	if (params.video !== resourceMetadataResult.data.khanSlug) {
		logger.warn("mismatched video slug in URL", {
			requestedSlug: params.video,
			actualSlug: resourceMetadataResult.data.khanSlug,
			resourceId: resource.sourcedId
		})
		notFound()
	}

	const youtubeId = extractYouTubeId(resourceMetadataResult.data.url)
	if (!youtubeId) {
		logger.error("invalid YouTube URL", { url: resourceMetadataResult.data.url })
		throw errors.new("invalid YouTube URL")
	}

	return {
		id: resource.sourcedId,
		title: resource.title,
		description: resourceMetadataResult.data.khanDescription,
		youtubeId
	}
}
