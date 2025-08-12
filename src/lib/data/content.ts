import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { getAllComponentResources, getResourcesBySlugAndType } from "@/lib/data/fetchers/oneroster"
import { getAssessmentTest } from "@/lib/data/fetchers/qti"
import { prepareInteractiveAssessment } from "@/lib/interactive-assessments"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { resolveAllQuestionsForTestFromXml } from "@/lib/qti-resolution"
import type { ArticlePageData, ExercisePageData, VideoPageData } from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import { fetchLessonLayoutData } from "./lesson"

export async function fetchArticlePageData(params: { article: string }): Promise<ArticlePageData> {
	// dynamic opt-in is handled at the page level
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.article, "fetchArticlePageData article parameter")
	logger.info("fetchArticlePageData called", { params })
	// CHANGE: Fetch "interactive" type and filter by activityType "Article"
	const resourceResult = await errors.try(getResourcesBySlugAndType(params.article, "interactive", "Article"))
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
	// dynamic opt-in is handled at the page level

	logger.info("fetchExercisePageData called", { params })
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.exercise, "fetchExercisePageData exercise parameter")
	// Pass only the params needed by fetchLessonLayoutData, not the exercise param
	const layoutDataPromise = fetchLessonLayoutData({
		subject: params.subject,
		course: params.course,
		unit: params.unit,
		lesson: params.lesson
	})
	// CHANGE: Fetch "interactive" type and filter by activityType "Exercise"
	const resourcePromise = errors.try(getResourcesBySlugAndType(params.exercise, "interactive", "Exercise"))

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

	// Check for "Exercise" activityType
	if (resourceMetadataResult.data.khanActivityType !== "Exercise") {
		logger.error("invalid activityType for exercise page", {
			resourceSourcedId: resource.sourcedId,
			expected: "Exercise",
			actualActivityType: resourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
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

	// Find the ComponentResource that links this exercise resource to its parent lesson
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch component resources to find exercise lesson context", {
			error: allComponentResourcesResult.error
		})
		throw errors.wrap(allComponentResourcesResult.error, "fetch component resources for exercise context")
	}

	const componentResource = allComponentResourcesResult.data.find(
		(cr) => cr.resource.sourcedId === resource.sourcedId && cr.courseComponent.sourcedId === layoutData.lessonData.id
	)

	if (!componentResource) {
		logger.error("could not find componentResource linking exercise to lesson", {
			resourceSourcedId: resource.sourcedId,
			lessonSourcedId: layoutData.lessonData.id
		})
		notFound()
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

	// Resolve questions by parsing XML and fetching items
	const resolvedQuestionsResult = await errors.try(resolveAllQuestionsForTestFromXml(assessmentTestResult.data))
	if (resolvedQuestionsResult.error) {
		logger.error("failed to resolve questions from qti xml for exercise", {
			testSourcedId: resource.sourcedId,
			error: resolvedQuestionsResult.error
		})
		throw errors.wrap(resolvedQuestionsResult.error, "resolve questions from qti xml for exercise")
	}

	// Align exercises with quizzes/tests: deterministic selection using user + attempt
	const userForExercise = await currentUser()
	if (!userForExercise) {
		logger.error("user authentication required for deterministic selection", {})
		throw errors.new("user authentication required")
	}
	const userMetaForExercise = parseUserPublicMetadata(userForExercise.publicMetadata)
	if (!userMetaForExercise.sourceId) {
		logger.error("user source id missing for deterministic selection", {})
		throw errors.new("user source id missing")
	}

	// Unified interactive preparation with deterministic rotation for exercises
	const preparedExercise = await prepareInteractiveAssessment({
		userSourceId: userMetaForExercise.sourceId,
		resourceSourcedId: resource.sourcedId,
		componentResourceSourcedId: componentResource.sourcedId,
		assessmentTest: assessmentTestResult.data,
		resolvedQuestions: resolvedQuestionsResult.data,
		rotationMode: "deterministic"
	})
	const questions = preparedExercise.questions

	return {
		exercise: {
			id: resource.sourcedId,
			componentResourceSourcedId: componentResource.sourcedId,
			onerosterCourseSourcedId: layoutData.courseData.id, // Add course ID
			title: resource.title,
			path: `/${params.subject}/${params.course}/${params.unit}/${params.lesson}/e/${resourceMetadataResult.data.khanSlug}`,
			type: "Exercise" as const,
			expectedXp: resourceMetadataResult.data.xp
		},
		questions,
		layoutData // Include layout data in the response
	}
}

export async function fetchVideoPageData(params: { video: string }): Promise<VideoPageData> {
	// dynamic opt-in is handled at the page level
	logger.info("fetchVideoPageData called", { params })
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.video, "fetchVideoPageData video parameter")
	// CHANGE: Fetch "interactive" type and filter by activityType "Video"
	const resourceResult = await errors.try(getResourcesBySlugAndType(params.video, "interactive", "Video"))
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
		title: resource.title,
		description: resourceMetadataResult.data.khanDescription,
		youtubeId
	}
}
