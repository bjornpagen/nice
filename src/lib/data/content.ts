import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import type { ArticlePageData, ExercisePageData, VideoPageData } from "@/lib/types/page"
import { oneroster, qti } from "../clients"
import { extractYouTubeId, getMetadataValue } from "./utils"

export async function fetchArticlePageData(params: { article: string }): Promise<ArticlePageData> {
	// Look up resource by slug
	const filter = `metadata.khanSlug='${params.article}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch article resource by slug", { error: resourceResult.error, slug: params.article })
		throw errors.wrap(resourceResult.error, "failed to fetch article resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource || !resource.metadata?.khanId) {
		notFound()
	}

	// Construct the QTI stimulus identifier using the Khan Academy ID
	const qtiIdentifier = `nice:${resource.metadata.khanId}`

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

	if (!resource || !resource.metadata?.khanId) {
		notFound()
	}

	// Use the khanId from metadata to construct the QTI test identifier
	const qtiTestId = `nice:${resource.metadata.khanId}`

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

	if (!resource || !resource.metadata?.url) {
		notFound()
	}

	const url = resource.metadata.url
	if (typeof url !== "string") {
		logger.error("video URL is not a string", { url })
		throw errors.new("video URL must be a string")
	}
	const youtubeId = extractYouTubeId(url)
	if (!youtubeId) {
		logger.error("invalid YouTube URL", { url: resource.metadata.url })
		throw errors.new("invalid YouTube URL")
	}

	return {
		id: resource.sourcedId,
		title: resource.title,
		description: getMetadataValue(resource.metadata, "description"),
		youtubeId
	}
}
