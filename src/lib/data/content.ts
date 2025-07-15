import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import type { ArticlePageData, ExercisePageData, VideoPageData } from "@/lib/types/page"
import { oneroster, qti } from "../clients"
import { ResourceMetadataSchema } from "../oneroster-metadata"
import { extractYouTubeId } from "./utils"

export async function fetchArticlePageData(params: { article: string }): Promise<ArticlePageData> {
	// Look up resource by slug
	const filter = `metadata.khanSlug='${params.article}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
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
	const resourceMetadata = resourceMetadataResult.data

	// Construct the QTI stimulus identifier using the Khan Academy ID
	const qtiIdentifier = `nice:${resourceMetadata.khanId}`

	return {
		id: resource.sourcedId,
		title: resource.title,
		identifier: qtiIdentifier
	}
}

export async function fetchExercisePageData(params: { exercise: string }): Promise<ExercisePageData> {
	// Look up resource by slug
	const filter = `metadata.khanSlug='${params.exercise}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
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
	const resourceMetadata = resourceMetadataResult.data

	// Use the khanId from metadata to construct the QTI test identifier
	const qtiTestId = `nice:${resourceMetadata.khanId}`

	// Fetch questions from QTI server
	const questionsResult = await errors.try(qti.getAllQuestionsForTest(qtiTestId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for exercise", { testId: qtiTestId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for exercise")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))

	return {
		exercise: {
			id: resource.sourcedId,
			title: resource.title,
			type: "Exercise" as const
		},
		questions
	}
}

export async function fetchVideoPageData(params: { video: string }): Promise<VideoPageData> {
	// Look up resource by slug
	const filter = `metadata.khanSlug='${params.video}' AND metadata.type='video'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
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
	const resourceMetadata = resourceMetadataResult.data

	const youtubeId = extractYouTubeId(resourceMetadata.url)
	if (!youtubeId) {
		logger.error("invalid YouTube URL", { url: resourceMetadata.url })
		throw errors.new("invalid YouTube URL")
	}

	return {
		id: resource.sourcedId,
		title: resource.title,
		description: resourceMetadata.description,
		youtubeId
	}
}
