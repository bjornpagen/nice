"use server"

import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { extractResourceIdFromCompoundId } from "@/lib/caliper/utils"
import { oneroster } from "@/lib/clients"
import { calculateBankedXpForResources } from "@/lib/data/fetchers/caliper"
import type { Resource } from "@/lib/oneroster"
import * as gradebook from "@/lib/ports/gradebook"
import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

/**
 * Calculates banked XP for an exercise boundary. Mirrors quiz-based banking but
 * uses the nearest previous Exercise in the same unit as the window start.
 *
 * Window: all passive resources (interactive Articles/Videos with positive xp)
 * whose component sortOrder is strictly between the previous Exercise and the
 * current Exercise within the same unit.
 */
export async function awardBankedXpForExercise(params: {
	exerciseResourceSourcedId: string
	onerosterUserSourcedId: string
	onerosterCourseSourcedId: string
}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	logger.info("calculating banked xp for exercise", {
		exerciseResourceSourcedId: params.exerciseResourceSourcedId,
		userSourcedId: params.onerosterUserSourcedId
	})

	// Normalize possible compound IDs and URI user ids
	const exerciseResourceId = extractResourceIdFromCompoundId(params.exerciseResourceSourcedId)

	let userId: string
	if (params.onerosterUserSourcedId.includes("/")) {
		const parsed = params.onerosterUserSourcedId.split("/").pop()
		if (!parsed) {
			logger.error("CRITICAL: Failed to parse user ID from sourced ID", {
				userSourcedId: params.onerosterUserSourcedId,
				expectedFormat: "https://api.../users/{id}"
			})
			throw errors.new("invalid user sourced ID format")
		}
		userId = parsed
	} else {
		userId = params.onerosterUserSourcedId
	}

	// 1. Find the exercise's component resource to get unit and position
	const exerciseCrResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `resource.sourcedId='${exerciseResourceId}' AND status='active'` })
	)
	if (exerciseCrResult.error) {
		logger.error("exercise component resource fetch failed", { error: exerciseCrResult.error, exerciseResourceId })
		throw errors.wrap(exerciseCrResult.error, "exercise component resource fetch")
	}
	const exerciseComponentResource = exerciseCrResult.data[0]
	if (!exerciseComponentResource) {
		logger.warn("could not find component resource for exercise", { exerciseResourceId })
		return { bankedXp: 0, awardedResourceIds: [] }
	}
	// Determine the unit id from the exercise's courseComponent (lesson) → parent unit
	const lessonComponentId = exerciseComponentResource.courseComponent.sourcedId
	const lessonComponentResult = await errors.try(
		oneroster.getCourseComponents({ filter: `sourcedId='${lessonComponentId}' AND status='active'` })
	)
	if (lessonComponentResult.error) {
		logger.error("lesson component fetch for unit resolution failed", {
			error: lessonComponentResult.error,
			lessonComponentId
		})
		throw errors.wrap(lessonComponentResult.error, "lesson component fetch for unit resolution")
	}
	const lessonComponent = lessonComponentResult.data[0]
	const parentUnitId = lessonComponent?.parent?.sourcedId
	const exerciseSortOrder = exerciseComponentResource.sortOrder

	if (!parentUnitId) {
		logger.warn("unable to resolve parent unit for exercise", { lessonComponentId })
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 2. List all lessons in the unit (for recursive CR lookup)
	const unitLessonsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${parentUnitId}' AND status='active'`,
			orderBy: "asc",
			sort: "sortOrder"
		})
	)
	if (unitLessonsResult.error) {
		logger.error("unit lessons fetch failed", { error: unitLessonsResult.error })
		throw errors.wrap(unitLessonsResult.error, "unit lessons fetch")
	}

	const lessonIds = unitLessonsResult.data.map((c) => c.sourcedId)
	const lessonSortOrderMap = new Map<string, number>()
	for (const c of unitLessonsResult.data) {
		lessonSortOrderMap.set(c.sourcedId, c.sortOrder)
	}

	// 3. Fetch ALL component resources under the unit's lessons (primary path)
	type ComponentResourceView = { resourceId: string; sortOrder: number; lessonId: string }
	let componentResources: Array<ComponentResourceView> = []
	if (lessonIds.length > 0) {
		const lessonCrResult = await errors.try(
			oneroster.getAllComponentResources({
				filter: `courseComponent.sourcedId@'${lessonIds.join(",")}' AND status='active'`
			})
		)
		if (lessonCrResult.error) {
			logger.error("lesson component resources fetch failed", { error: lessonCrResult.error, lessonIds })
			throw errors.wrap(lessonCrResult.error, "lesson component resources fetch")
		}
		componentResources = lessonCrResult.data.map((cr) => ({
			resourceId: cr.resource.sourcedId,
			sortOrder: cr.sortOrder,
			lessonId: cr.courseComponent.sourcedId
		}))
	}

	// 3b. Fallback: include unit-level component resources if no lessons or empty
	if (componentResources.length === 0) {
		const unitCrResult = await errors.try(
			oneroster.getAllComponentResources({ filter: `courseComponent.sourcedId='${parentUnitId}' AND status='active'` })
		)
		if (unitCrResult.error) {
			logger.error("unit-level component resources fetch failed", { error: unitCrResult.error, parentUnitId })
			throw errors.wrap(unitCrResult.error, "unit-level component resources fetch")
		}
		componentResources = unitCrResult.data.map((cr) => ({
			resourceId: cr.resource.sourcedId,
			sortOrder: cr.sortOrder,
			lessonId: cr.courseComponent.sourcedId
		}))
	}

	// 4. Fetch resource metadata for detection and filtering
	const allResourceIds = componentResources.map((cr) => cr.resourceId)
	if (allResourceIds.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}
	const allResourcesResult = await errors.try(
		oneroster.getAllResources({ filter: `sourcedId@'${allResourceIds.join(",")}' AND status='active'` })
	)
	if (allResourcesResult.error) {
		logger.error("unit resources fetch for exercise detection failed", {
			error: allResourcesResult.error,
			allResourceIds
		})
		throw errors.wrap(allResourcesResult.error, "unit resources fetch for exercise detection")
	}
	const resourceMap = new Map<string, Resource>()
	for (const resource of allResourcesResult.data) {
		resourceMap.set(resource.sourcedId, resource)
	}

	// 5. Compute previous exercise boundary using tuple ordering: (lessonSortOrder, contentSortOrder)
	const currentLessonSortOrder = lessonSortOrderMap.get(lessonComponentId) ?? 0
	let previousExerciseTuple: { lessonSortOrder: number; contentSortOrder: number } | null = null
	for (const cr of componentResources) {
		const resource = resourceMap.get(cr.resourceId)
		const lessonSortOrder = lessonSortOrderMap.get(cr.lessonId) ?? 0
		const isExerciseResource =
			resource?.metadata?.khanActivityType === "Exercise" || resource?.metadata?.khanLessonType === "exercise"
		if (!resource || !isExerciseResource) continue
		if (cr.resourceId === exerciseResourceId) continue

		const isBeforeCurrent =
			lessonSortOrder < currentLessonSortOrder ||
			(lessonSortOrder === currentLessonSortOrder && cr.sortOrder < exerciseSortOrder)
		if (!isBeforeCurrent) continue

		if (!previousExerciseTuple) {
			previousExerciseTuple = { lessonSortOrder, contentSortOrder: cr.sortOrder }
			continue
		}
		const isAfterPrevious =
			lessonSortOrder > previousExerciseTuple.lessonSortOrder ||
			(lessonSortOrder === previousExerciseTuple.lessonSortOrder &&
				cr.sortOrder > previousExerciseTuple.contentSortOrder)
		if (isAfterPrevious) previousExerciseTuple = { lessonSortOrder, contentSortOrder: cr.sortOrder }
	}

	logger.info("found exercise boundaries", {
		currentExerciseSortOrder: exerciseSortOrder,
		currentLessonSortOrder,
		previousExerciseSortOrder: previousExerciseTuple?.contentSortOrder ?? -1,
		previousLessonSortOrder: previousExerciseTuple?.lessonSortOrder ?? -1,
		exerciseResourceId
	})

	// 6. Identify passive resources strictly between previous and current exercise using tuple ordering
	const candidateResourceIds: string[] = []
	for (const cr of componentResources) {
		const lessonSortOrder = lessonSortOrderMap.get(cr.lessonId) ?? 0
		const isAfterPrevious = previousExerciseTuple
			? lessonSortOrder > previousExerciseTuple.lessonSortOrder ||
				(lessonSortOrder === previousExerciseTuple.lessonSortOrder &&
					cr.sortOrder > previousExerciseTuple.contentSortOrder)
			: true
		const isBeforeCurrent =
			lessonSortOrder < currentLessonSortOrder ||
			(lessonSortOrder === currentLessonSortOrder && cr.sortOrder < exerciseSortOrder)
		if (!(isAfterPrevious && isBeforeCurrent)) continue

		const resource = resourceMap.get(cr.resourceId)
		if (!resource) continue
		const metadata = resource.metadata
		const expectedXp = typeof metadata?.xp === "number" ? metadata.xp : 0
		if (expectedXp <= 0) continue
		const isInteractive = metadata?.type === "interactive"
		const kind = metadata && typeof metadata.khanActivityType === "string" ? metadata.khanActivityType : undefined
		if (isInteractive && (kind === "Article" || kind === "Video")) {
			candidateResourceIds.push(resource.sourcedId)
		}
	}

	logger.info("candidate passive resources in window", {
		candidateCount: candidateResourceIds.length
	})

	if (candidateResourceIds.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 7. Build passive resources list with expected XP
	const passiveResources: Array<{ sourcedId: string; expectedXp: number }> = []
	for (const id of candidateResourceIds) {
		const res = resourceMap.get(id)
		if (!res) continue
		const expectedXp = typeof res.metadata?.xp === "number" ? res.metadata.xp : 0
		passiveResources.push({ sourcedId: id, expectedXp })
	}

	// 7b. Dedupe: exclude resources already banked for this user
	if (passiveResources.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	logger.info("checking existing results for bank dedupe", {
		candidateCount: passiveResources.length
	})

	const eligibilityChecks = await Promise.all(
		passiveResources.map(async (resource) => {
			const resultSourcedId = generateResultSourcedId(userId, resource.sourcedId, false)
			const existingResult = await errors.try(oneroster.getResult(resultSourcedId))
			if (existingResult.error) {
				logger.error("bank dedupe: failed to read existing result", {
					userId,
					resourceId: resource.sourcedId,
					resultSourcedId,
					error: existingResult.error
				})
				throw errors.wrap(existingResult.error, "bank dedupe: read existing result")
			}

			// Narrow metadata shape using Zod to avoid unsafe casts
			const BankedMetaSchema = z.object({ xp: z.number().optional(), xpReason: z.string().optional() }).passthrough()
			const parsed = BankedMetaSchema.safeParse(existingResult.data?.metadata)
			const xpValue = parsed.success && typeof parsed.data.xp === "number" ? parsed.data.xp : 0
			const xpReason = parsed.success && typeof parsed.data.xpReason === "string" ? parsed.data.xpReason : ""
			const alreadyBanked = xpValue > 0 || xpReason === "Banked XP"

			return { resource, alreadyBanked }
		})
	)

	const eligibleResources = eligibilityChecks.filter((e) => !e.alreadyBanked).map((e) => e.resource)

	logger.info("bank dedupe complete", {
		eligibleCount: eligibleResources.length,
		filteredCount: passiveResources.length - eligibleResources.length
	})

	if (eligibleResources.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 8. Calculate XP using time-spent policy
	let totalBankedXp = 0
	const awardedResourceIds: string[] = []
	const actorId = `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${userId}`
	const bankResult = await calculateBankedXpForResources(actorId, eligibleResources)
	totalBankedXp += bankResult.bankedXp
	awardedResourceIds.push(...bankResult.awardedResourceIds)

	logger.info("calculated total banked xp", {
		totalBankedXp,
		awardedResourceCount: awardedResourceIds.length
	})

	// 9. Save banked XP to individual assessmentResults for each awarded resource
	for (const resourceId of awardedResourceIds) {
		const resource = resourceMap.get(resourceId)
		if (resource) {
			const resultSourcedId = generateResultSourcedId(userId, resourceId, false)
			const lineItemId = getAssessmentLineItemId(resourceId)
			const metadata = {
				masteredUnits: 0,
				totalQuestions: 1,
				correctQuestions: 1,
				accuracy: 100,
				xp: typeof resource.metadata?.xp === "number" ? resource.metadata.xp : 0,
				multiplier: 1.0,
				completedAt: new Date().toISOString(),
				courseSourcedId: params.onerosterCourseSourcedId,
				penaltyApplied: false,
				xpReason: "Banked XP"
			}

			const saveResult = await errors.try(
				gradebook.saveResult({
					resultSourcedId,
					lineItemSourcedId: lineItemId,
					userSourcedId: userId,
					score: 100,
					comment: "Banked XP awarded upon exercise completion.",
					metadata,
					correlationId: randomUUID()
				})
			)
			if (saveResult.error) {
				logger.error("failed to save banked xp assessment result", { resourceId, error: saveResult.error })
				// Continue with other resources even if one fails
			} else {
				logger.info("saved banked xp assessment result", { resourceId })
			}
		}
	}

	return { bankedXp: totalBankedXp, awardedResourceIds }
}

/**
 * Computes a breakdown of banked XP for a quiz without performing any writes.
 * Returns separate totals for videos and articles based on the same eligibility
 * window used by awardBankedXpForAssessment.
 */
export async function getBankedXpBreakdownForQuiz(
	quizResourceId: string,
	userSourcedId: string
): Promise<{ articleXp: number; videoXp: number }> {
	logger.info("computing banked xp breakdown for quiz", { quizResourceId, userSourcedId })

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

	// 1. Locate quiz component resource to derive unit and sort order context
	const quizCrResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `resource.sourcedId='${quizResourceId}' AND status='active'` })
	)
	if (quizCrResult.error) {
		logger.error("quiz component resource fetch failed", { error: quizCrResult.error, quizResourceId })
		throw errors.wrap(quizCrResult.error, "quiz component resource fetch")
	}
	const quizComponentResource = quizCrResult.data[0]
	if (!quizComponentResource) {
		logger.warn("could not find component resource for quiz", { quizResourceId })
		return { articleXp: 0, videoXp: 0 }
	}
	const parentUnitId = quizComponentResource.courseComponent.sourcedId
	const quizSortOrder = quizComponentResource.sortOrder

	// 2. Get all component resources for the unit to find the previous quiz boundary
	const unitCrResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `courseComponent.sourcedId='${parentUnitId}' AND status='active'` })
	)
	if (unitCrResult.error) {
		logger.error("unit component resources fetch failed", { error: unitCrResult.error, parentUnitId })
		throw errors.wrap(unitCrResult.error, "unit component resources fetch")
	}

	// Fetch resources metadata for quiz detection
	const unitResourceIds = unitCrResult.data.map((cr) => cr.resource.sourcedId)
	const unitResourcesResult = await errors.try(
		oneroster.getAllResources({ filter: `sourcedId@'${unitResourceIds.join(",")}' AND status='active'` })
	)
	if (unitResourcesResult.error) {
		logger.error("unit resources fetch for quiz detection failed", {
			error: unitResourcesResult.error,
			unitResourceIds
		})
		throw errors.wrap(unitResourcesResult.error, "unit resources fetch for quiz detection")
	}

	const resourceMap = new Map<string, Resource>()
	for (const resource of unitResourcesResult.data) {
		resourceMap.set(resource.sourcedId, resource)
	}

	let previousQuizSortOrder = -1
	for (const cr of unitCrResult.data) {
		const resource = resourceMap.get(cr.resource.sourcedId)
		const isQuizResource =
			resource?.metadata?.khanLessonType === "quiz" || resource?.metadata?.khanActivityType === "Quiz"
		if (
			resource &&
			isQuizResource &&
			resource.sourcedId !== quizResourceId &&
			cr.sortOrder < quizSortOrder &&
			cr.sortOrder > previousQuizSortOrder
		) {
			previousQuizSortOrder = cr.sortOrder
		}
	}

	// 3. Identify lessons between previous quiz and current quiz by sort order
	const unitComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${parentUnitId}' AND status='active'`,
			orderBy: "asc",
			sort: "sortOrder"
		})
	)
	if (unitComponentsResult.error) {
		logger.error("unit components fetch failed", { error: unitComponentsResult.error, parentUnitId })
		throw errors.wrap(unitComponentsResult.error, "unit components fetch")
	}

	const lessons = unitComponentsResult.data.filter((component) => {
		return component.sortOrder > previousQuizSortOrder && component.sortOrder < quizSortOrder
	})

	if (lessons.length === 0) {
		return { articleXp: 0, videoXp: 0 }
	}

	// 4. Gather passive resources from those lessons and separate by type
	const lessonComponentSourcedIds = lessons.map((l) => l.sourcedId)
	const lessonCrResult = await errors.try(
		oneroster.getAllComponentResources({
			filter: `courseComponent.sourcedId@'${lessonComponentSourcedIds.join(",")}' AND status='active'`
		})
	)
	if (lessonCrResult.error) {
		logger.error("lesson component resources fetch failed", { error: lessonCrResult.error, lessonComponentSourcedIds })
		throw errors.wrap(lessonCrResult.error, "lesson component resources fetch")
	}

	const resourceIds = lessonCrResult.data.map((cr) => cr.resource.sourcedId)
	if (resourceIds.length === 0) {
		return { articleXp: 0, videoXp: 0 }
	}

	const resourcesResult = await errors.try(
		oneroster.getAllResources({ filter: `sourcedId@'${resourceIds.join(",")}' AND status='active'` })
	)
	if (resourcesResult.error) {
		logger.error("lesson resources fetch for breakdown failed", { error: resourcesResult.error, resourceIds })
		throw errors.wrap(resourcesResult.error, "lesson resources fetch for breakdown")
	}

	const articleResources: Array<{ sourcedId: string; expectedXp: number }> = []
	const videoResources: Array<{ sourcedId: string; expectedXp: number }> = []

	for (const resource of resourcesResult.data) {
		const metadata = resource.metadata
		const expectedXp = typeof metadata?.xp === "number" ? metadata.xp : 0
		if (expectedXp <= 0) continue

		const isInteractive = metadata?.type === "interactive"
		const kind = metadata && typeof metadata.khanActivityType === "string" ? metadata.khanActivityType : undefined

		if (isInteractive && kind === "Article") {
			articleResources.push({ sourcedId: resource.sourcedId, expectedXp })
		} else if (isInteractive && kind === "Video") {
			videoResources.push({ sourcedId: resource.sourcedId, expectedXp })
		}
	}

	if (articleResources.length === 0 && videoResources.length === 0) {
		logger.info("no eligible passive resources found for banked xp breakdown", {
			discoveredResourceCount: resourcesResult.data.length
		})
		return { articleXp: 0, videoXp: 0 }
	}

	// 5. Calculate banked XP separately for articles and videos
	const actorId = `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${userId}`
	let articleXp = 0
	let videoXp = 0

	if (articleResources.length > 0) {
		const articleResult = await calculateBankedXpForResources(actorId, articleResources)
		articleXp = articleResult.bankedXp
	}
	if (videoResources.length > 0) {
		const videoResult = await calculateBankedXpForResources(actorId, videoResources)
		videoXp = videoResult.bankedXp
	}

	logger.info("computed banked xp breakdown", { quizResourceId, articleXp, videoXp })
	return { articleXp, videoXp }
}
