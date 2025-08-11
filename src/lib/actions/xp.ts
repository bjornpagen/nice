"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { saveAssessmentResult } from "@/lib/actions/tracking"
import { oneroster } from "@/lib/clients"
import { calculateBankedXpForResources } from "@/lib/data/fetchers/caliper"
import type { Resource } from "@/lib/oneroster"
// Keep for assessmentResult saving in bank write
// Note: no local usage; banked results are saved by resource id

/**
 * Calculates banked XP for a quiz. This is a hybrid function:
 * - For ARTICLES: Uses the new time-spent model by calling the Caliper fetcher.
 * - For VIDEOS: Uses the original completion-based model by checking OneRoster results.
 * Also saves the banked XP to individual assessmentResults for each video/article.
 */
export async function awardBankedXpForAssessment(
	quizResourceId: string,
	userSourcedId: string,
	onerosterCourseSourcedId: string
): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	logger.info("calculating banked xp for quiz", { quizResourceId, userSourcedId })

	let userId: string
	if (userSourcedId.includes("/")) {
		const parsed = userSourcedId.split("/").pop()
		if (!parsed) {
			logger.error("CRITICAL: Failed to parse user ID from sourced ID", {
				userSourcedId,
				expectedFormat: "https://api.../users/{id}"
			})
			throw errors.new("invalid user sourced ID format")
		}
		userId = parsed
	} else {
		userId = userSourcedId
	}

	// 1. Find the quiz's parent unit and position
	const quizCrResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `resource.sourcedId='${quizResourceId}' AND status='active'` })
	)
	if (quizCrResult.error) {
		throw errors.wrap(quizCrResult.error, "quiz component resource fetch")
	}
	const quizComponentResource = quizCrResult.data[0]
	if (!quizComponentResource) {
		logger.warn("could not find component resource for quiz", { quizResourceId })
		return { bankedXp: 0, awardedResourceIds: [] }
	}
	const parentUnitId = quizComponentResource.courseComponent.sourcedId
	const quizSortOrder = quizComponentResource.sortOrder

	// 2. Find the sort order of the previous quiz in the same unit
	const unitCrResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `courseComponent.sourcedId='${parentUnitId}' AND status='active'` })
	)
	if (unitCrResult.error) {
		throw errors.wrap(unitCrResult.error, "unit component resources fetch")
	}

	// Get resource metadata for proper quiz detection (like the original implementation)
	const unitResourceIds = unitCrResult.data.map((cr) => cr.resource.sourcedId)
	const unitResourcesResult = await errors.try(
		oneroster.getAllResources({ filter: `sourcedId@'${unitResourceIds.join(",")}' AND status='active'` })
	)
	if (unitResourcesResult.error) {
		throw errors.wrap(unitResourcesResult.error, "unit resources fetch for quiz detection")
	}

	// Create a map of resourceId -> resource for efficient lookup
	const resourceMap = new Map<string, Resource>()
	for (const resource of unitResourcesResult.data) {
		resourceMap.set(resource.sourcedId, resource)
	}

	// Find the previous quiz using interactive metadata-based detection
	let previousQuizSortOrder = -1
	let detectedQuizzes = 0
	for (const cr of unitCrResult.data) {
		const resource = resourceMap.get(cr.resource.sourcedId)
		const isInteractiveQuiz = resource?.metadata?.type === "interactive" && resource?.metadata?.activityType === "Quiz"

		if (
			resource &&
			isInteractiveQuiz &&
			resource.sourcedId !== quizResourceId &&
			cr.sortOrder < quizSortOrder &&
			cr.sortOrder > previousQuizSortOrder
		) {
			previousQuizSortOrder = cr.sortOrder
			detectedQuizzes++
			logger.debug("found previous quiz", {
				resourceId: resource.sourcedId,
				sortOrder: cr.sortOrder
			})
		}
	}

	logger.info("found quiz boundaries", {
		currentQuizSortOrder: quizSortOrder,
		previousQuizSortOrder,
		quizResourceId,
		detectedQuizzes
	})

	// 3. Find lessons between the previous quiz (or unit start) and the current quiz
	const unitComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${parentUnitId}' AND status='active'`,
			orderBy: "asc",
			sort: "sortOrder"
		})
	)
	if (unitComponentsResult.error) {
		throw errors.wrap(unitComponentsResult.error, "unit components fetch")
	}

	// Exclude assessment components positioned as lessons based on heuristic of sort order window only.
	const lessons = unitComponentsResult.data.filter((component) => {
		return component.sortOrder > previousQuizSortOrder && component.sortOrder < quizSortOrder
	})

	logger.info("found lessons between quizzes", {
		parentUnitId,
		previousQuizSortOrder,
		currentQuizSortOrder: quizSortOrder,
		eligibleLessonCount: lessons.length,
		eligibleLessonIds: lessons.map((l) => l.sourcedId)
	})

	if (lessons.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 4. Get all passive resources and separate them by type
	const lessonComponentSourcedIds = lessons.map((l) => l.sourcedId)
	const lessonCrResult = await errors.try(
		oneroster.getAllComponentResources({
			filter: `courseComponent.sourcedId@'${lessonComponentSourcedIds.join(",")}' AND status='active'`
		})
	)
	if (lessonCrResult.error) {
		throw errors.wrap(lessonCrResult.error, "lesson component resources fetch")
	}

	const resourceIds = lessonCrResult.data.map((cr) => cr.resource.sourcedId)
	if (resourceIds.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}
	const resourcesResult = await errors.try(
		oneroster.getAllResources({ filter: `sourcedId@'${resourceIds.join(",")}' AND status='active'` })
	)
	if (resourcesResult.error) {
		throw errors.wrap(resourcesResult.error, "lesson resources fetch")
	}

	const articleResources: Array<{ sourcedId: string; expectedXp: number; type: "article" }> = []
	const videoResources: Array<{ sourcedId: string; expectedXp: number; type: "video" }> = []

	for (const resource of resourcesResult.data) {
		const metadata = resource.metadata
		const expectedXp = typeof metadata?.xp === "number" ? metadata.xp : 0
		if (expectedXp <= 0) continue

		// Update detection logic for Articles and Videos - all resources are interactive now
		if (metadata?.activityType === "Article") {
			articleResources.push({ sourcedId: resource.sourcedId, expectedXp, type: "article" })
		} else if (metadata?.activityType === "Video") {
			videoResources.push({ sourcedId: resource.sourcedId, expectedXp, type: "video" })
		}
	}

	if (articleResources.length === 0 && videoResources.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 5. Calculate XP for passive content (articles and videos) using time-spent for BOTH types
	let totalBankedXp = 0
	const awardedResourceIds: string[] = []

	const passiveResources: Array<{ sourcedId: string; expectedXp: number }> = [
		...articleResources.map((r) => ({ sourcedId: r.sourcedId, expectedXp: r.expectedXp })),
		...videoResources.map((r) => ({ sourcedId: r.sourcedId, expectedXp: r.expectedXp }))
	]

	if (passiveResources.length > 0) {
		const actorId = `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${userId}`
		const bankResult = await calculateBankedXpForResources(actorId, passiveResources)
		totalBankedXp += bankResult.bankedXp
		awardedResourceIds.push(...bankResult.awardedResourceIds)
	}

	logger.info("calculated total banked xp", {
		totalBankedXp,
		awardedResourceCount: awardedResourceIds.length,
		articleCount: articleResources.length,
		videoCount: videoResources.length
	})

	// 6. Save banked XP to individual assessmentResults for each video/article
	const allResources = [...articleResources, ...videoResources]
	for (const resourceId of awardedResourceIds) {
		const resource = allResources.find((r) => r.sourcedId === resourceId)
		if (resource) {
			const saveResult = await errors.try(
				saveAssessmentResult(
					resourceId,
					1.0, // Perfect score for banked XP
					1, // correctAnswers: 1 (banked XP = completed)
					1, // totalQuestions: 1 (banked XP = completed)
					userId,
					onerosterCourseSourcedId,
					{
						masteredUnits: 0, // Banked XP (articles/videos) never count as mastered units
						totalQuestions: 1,
						correctQuestions: 1,
						accuracy: 100,
						xp: resource.expectedXp,
						multiplier: 1.0 // No multiplier for banked XP
					}
				)
			)
			if (saveResult.error) {
				logger.error("failed to save banked xp assessment result", {
					resourceId,
					expectedXp: resource.expectedXp,
					error: saveResult.error
				})
				// Continue with other resources even if one fails
			} else {
				logger.info("saved banked xp assessment result", {
					resourceId,
					expectedXp: resource.expectedXp,
					type: resource.type
				})
			}
		}
	}

	return { bankedXp: totalBankedXp, awardedResourceIds }
}
