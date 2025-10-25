import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { fetchAndResolveQuestions, prepareUserQuestionSet } from "@/lib/data/fetchers/interactive-helpers"
import { requireBundle } from "@/lib/course-bundle/store"
import { fetchLessonLayoutData } from "@/lib/course-bundle/course-loaders"
import { findResourceInLessonBySlugAndTypeBundle } from "@/lib/course-bundle/interactive-helpers"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
// rotation mode removed; selection is now always deterministic via unified helper
import type { ArticlePageData, ExercisePageData, VideoPageData } from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"

export async function fetchArticlePageData(params: {
	article: string
	lesson: string
	unit: string
	subject: string
	course: string
}): Promise<ArticlePageData> {
	// dynamic opt-in is handled at the page level
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.article, "fetchArticlePageData article parameter")
	logger.info("fetchArticlePageData called", { params })
	const layoutData = await fetchLessonLayoutData(params)
	const bundle = requireBundle(layoutData)
	const { resource, componentResource } = findResourceInLessonBySlugAndTypeBundle({
		bundle,
		lessonSourcedId: layoutData.lessonData.id,
		slug: params.article,
		activityType: "Article"
	})

	// Validate resource metadata with Zod. THIS IS THE CRITICAL PATTERN.
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid article resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid article resource metadata")
	}

	// Check for "Article" activityType
	if (resourceMetadataResult.data.khanActivityType !== "Article") {
		logger.error("invalid activityType for article page", {
			resourceSourcedId: resource.sourcedId,
			expected: "Article",
			actualActivityType: resourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
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
		componentResourceSourcedId: componentResource.sourcedId,
		title: resource.title,
		xp: resourceMetadataResult.data.xp
	}
}

export async function fetchExercisePageData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	exercise: string
}): Promise<ExercisePageData> {
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.exercise, "fetchExercisePageData exercise parameter")
	logger.info("fetchExercisePageData called", { params })

	const layoutData = await fetchLessonLayoutData(params)
	const bundle = requireBundle(layoutData)
	const { resource, componentResource } = findResourceInLessonBySlugAndTypeBundle({
		bundle,
		lessonSourcedId: layoutData.lessonData.id,
		slug: params.exercise,
		activityType: "Exercise"
	})

	// Validate that the exercise slug from the URL matches the resource's actual khanSlug
	const resourceMetadata = resource.metadata
	if (params.exercise !== resourceMetadata.khanSlug) {
		logger.warn("mismatched exercise slug in URL", {
			requestedSlug: params.exercise,
			actualSlug: resourceMetadata.khanSlug,
			resourceId: resource.sourcedId
		})
		notFound()
	}

	const { assessmentTest, resolvedQuestions } = await fetchAndResolveQuestions(resource.sourcedId)
	const questions = await prepareUserQuestionSet({
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest,
		resolvedQuestions
	})

	return {
		exercise: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id,
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/e/${resourceMetadata.khanSlug}`,
			type: "Exercise" as const,
			expectedXp: resourceMetadata.xp
		},
		questions,
		layoutData
	}
}

export async function fetchVideoPageData(params: {
	video: string
	lesson: string
	unit: string
	subject: string
	course: string
}): Promise<VideoPageData> {
	// dynamic opt-in is handled at the page level
	logger.info("fetchVideoPageData called", { params })
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.video, "fetchVideoPageData video parameter")
	const layoutData = await fetchLessonLayoutData(params)
	const bundle = requireBundle(layoutData)
	const { resource, componentResource } = findResourceInLessonBySlugAndTypeBundle({
		bundle,
		lessonSourcedId: layoutData.lessonData.id,
		slug: params.video,
		activityType: "Video"
	})

	// Validate resource metadata with Zod. THIS IS THE CRITICAL PATTERN.
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid video resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		throw errors.wrap(resourceMetadataResult.error, "invalid video resource metadata")
	}

	// Check for "Video" activityType
	if (resourceMetadataResult.data.khanActivityType !== "Video") {
		logger.error("invalid activityType for video page", {
			resourceSourcedId: resource.sourcedId,
			expected: "Video",
			actualActivityType: resourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
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

	// CHANGE: Get YouTube ID from metadata field `khanYoutubeId`
	const youtubeId = resourceMetadataResult.data.khanYoutubeId
	if (!youtubeId) {
		logger.error("video metadata missing youtubeId", { metadata: resourceMetadataResult.data })
		throw errors.new("invalid video metadata")
	}

	return {
		id: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		title: resource.title,
		description: resourceMetadataResult.data.khanDescription,
		youtubeId,
		xp: resourceMetadataResult.data.xp
	}
}
