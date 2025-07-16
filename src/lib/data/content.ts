import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { unstable_cacheLife as cacheLife } from "next/cache"
import { notFound } from "next/navigation"
import { getResourcesBySlugAndType } from "@/lib/data/fetchers/oneroster"
import { getAllQuestionsForTest } from "@/lib/data/fetchers/qti"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { ArticlePageData, ExercisePageData, VideoPageData } from "@/lib/types/page"
import { fetchLessonLayoutData } from "./lesson"
import { extractYouTubeId } from "./utils"

export async function fetchArticlePageData(params: { article: string }): Promise<ArticlePageData> {
	"use cache"
	cacheLife("max")
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

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid article resource metadata", {
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid article resource metadata")
	}

	// Because we use a discriminated union, we must also check the type
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for article page", {
			resourceId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
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
	"use cache"
	cacheLife("max")
	// Fetch layout data and exercise data in parallel for performance
	const layoutDataPromise = fetchLessonLayoutData(params)
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

	// Validate resource metadata with Zod
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid exercise resource metadata", {
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid exercise resource metadata")
	}

	// Because we use a discriminated union, we must also check the type
	if (resourceMetadataResult.data.type !== "qti") {
		logger.error("invalid resource type for exercise page", {
			resourceId: resource.sourcedId,
			expected: "qti",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
	}

	// Fetch questions from QTI server
	const questionsResult = await errors.try(getAllQuestionsForTest(resource.sourcedId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for exercise", { testId: resource.sourcedId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for exercise")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier
	}))

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
	"use cache"
	cacheLife("max")
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
			resourceId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid video resource metadata")
	}

	// Because we use a discriminated union, we must also check the type.
	if (resourceMetadataResult.data.type !== "video") {
		logger.error("invalid resource type for video page", {
			resourceId: resource.sourcedId,
			expected: "video",
			actual: resourceMetadataResult.data.type
		})
		throw errors.new("invalid resource type")
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
