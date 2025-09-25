import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"
import { sendCaliperBankedXpAwardedEvent } from "@/lib/actions/caliper"
import { extractResourceIdFromCompoundId } from "@/lib/caliper/utils"
import { oneroster } from "@/lib/clients"
import { CALIPER_SUBJECT_MAPPING, isSubjectSlug } from "@/lib/constants/subjects"
import type { Resource } from "@/lib/oneroster"
import * as gradebook from "@/lib/ports/gradebook"
import { constructActorId, extractUserSourcedId } from "@/lib/utils/actor-id"
import { generateResultSourcedId } from "@/lib/utils/assessment-identifiers"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

/**
 * Banking minute bucketing (ceil semantics) with 20-second threshold:
 * - <= 20s => 0 minutes (no XP awarded)
 * - > 20s  => ceil(seconds / 60)
 *
 * Rationale: The 20-second threshold prevents gaming the system with minimal engagement.
 * The ceil operation aligns awarded minutes with expected XP calculation.
 */
export function computeBankingMinutes(seconds: number): number {
	if (seconds <= 20) return 0
	return Math.ceil(seconds / 60)
}

/**
 * A pure function to identify the window of passive resources (videos, articles)
 * between the previous exercise and the current one. This function performs NO writes
 * and is safe to call for identification purposes before cache invalidation.
 */
export async function findEligiblePassiveResourcesForExercise(params: {
	exerciseResourceSourcedId: string
	onerosterCourseSourcedId: string
	onerosterUserSourcedId: string
}): Promise<Array<{ sourcedId: string; expectedXp: number }>> {
	const { exerciseResourceSourcedId } = params
	logger.info("identifying eligible passive resources for exercise", { exerciseResourceSourcedId })

	const exerciseResourceId = extractResourceIdFromCompoundId(exerciseResourceSourcedId)

	const componentResourceResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `resource.sourcedId='${exerciseResourceId}' AND status='active'` })
	)
	if (componentResourceResult.error) {
		logger.error("exercise component resource fetch failed", { error: componentResourceResult.error })
		throw errors.wrap(componentResourceResult.error, "exercise component resource fetch")
	}
	const exerciseComponentResource = componentResourceResult.data[0]
	if (!exerciseComponentResource) {
		return []
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
		return []
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
		return []
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
		return []
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
		return []
	}

	logger.info("checking existing results for bank dedupe", {
		candidateCount: passiveResources.length
	})

	const userId = extractUserSourcedId(params.onerosterUserSourcedId)
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

	return eligibleResources
}

/**
 * Calculates and awards banked XP for an exercise. This function now uses
 * the canonical nice_timeSpent value from assessment results instead of
 * aggregating Caliper events, making it 1000x more reliable.
 */
export async function awardBankedXpForExercise(params: {
	exerciseResourceSourcedId: string
	onerosterUserSourcedId: string
	onerosterCourseSourcedId: string
}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	// Normalize using shared utility to avoid string parsing divergence
	const userId = extractUserSourcedId(params.onerosterUserSourcedId)

	// 1. Identify eligible resources using the pure function (already deduped)
	const eligibleResources = await findEligiblePassiveResourcesForExercise({
		exerciseResourceSourcedId: params.exerciseResourceSourcedId,
		onerosterCourseSourcedId: params.onerosterCourseSourcedId,
		onerosterUserSourcedId: params.onerosterUserSourcedId
	})

	if (eligibleResources.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 2. For each eligible resource, fetch its assessment result to get canonical time spent
	const TimeSpentMetadataSchema = z.object({ 
		nice_timeSpent: z.number().optional() 
	}).passthrough()

	const timeSpentResults = await Promise.all(
		eligibleResources.map(async (resource) => {
			const resultSourcedId = generateResultSourcedId(userId, resource.sourcedId, false)
			const result = await errors.try(oneroster.getResult(resultSourcedId))

			if (result.error) {
				logger.debug("no existing assessment result for resource", {
					resourceId: resource.sourcedId,
					resultId: resultSourcedId,
					error: result.error
				})
				return { ...resource, timeSpent: 0 }
			}

			const parsedMeta = TimeSpentMetadataSchema.safeParse(result.data?.metadata)
			const timeSpent = parsedMeta.success && typeof parsedMeta.data.nice_timeSpent === "number" 
				? parsedMeta.data.nice_timeSpent 
				: 0

			logger.debug("fetched canonical time spent for resource", {
				resourceId: resource.sourcedId,
				timeSpent,
				minutesSpent: computeBankingMinutes(timeSpent)
			})

			return { ...resource, timeSpent }
		})
	)

	// 3. Calculate total banked XP using the canonical time values
	let totalBankedXp = 0
	const awardedResourceIds: string[] = []
	const detailedResults: Array<{
		resourceId: string
		expectedXp: number
		secondsSpent: number
		minutesSpent: number
		awardedXp: number
	}> = []
	const awardedXpByResourceId = new Map<string, number>()

	for (const { sourcedId, expectedXp, timeSpent } of timeSpentResults) {
		const minutesSpent = computeBankingMinutes(timeSpent)
		
		// Defensive cap: never award more than the resource's expected XP
		const awardedXp = Math.min(minutesSpent, expectedXp)

		if (awardedXp > 0) {
			totalBankedXp += awardedXp
			awardedResourceIds.push(sourcedId)
			awardedXpByResourceId.set(sourcedId, awardedXp)
		}

		detailedResults.push({
			resourceId: sourcedId,
			expectedXp,
			secondsSpent: timeSpent,
			minutesSpent,
			awardedXp
		})
	}

	logger.info("calculated banked xp using canonical time spent", {
		totalBankedXp,
		awardedResourceCount: awardedResourceIds.length,
		detailedResults
	})

	// 4. Get resource metadata for saving results and sending Caliper events
	const allResourceIds = eligibleResources.map((r) => r.sourcedId)
	const allResourcesResult = await errors.try(
		oneroster.getAllResources({ filter: `sourcedId@'${allResourceIds.join(",")}' AND status='active'` })
	)
	if (allResourcesResult.error) {
		logger.error("failed to fetch resource metadata for results", { error: allResourcesResult.error })
		throw errors.wrap(allResourcesResult.error, "resource metadata fetch")
	}
	const resourceMap = new Map<string, Resource>()
	for (const resource of allResourcesResult.data) {
		resourceMap.set(resource.sourcedId, resource)
	}

	// 5. Save banked XP to individual assessmentResults for each awarded resource
	for (const resourceId of awardedResourceIds) {
		const resource = resourceMap.get(resourceId)
		if (resource) {
			const computedAwardedXp = awardedXpByResourceId.get(resourceId)
			if (computedAwardedXp === undefined) {
				logger.error("missing computed awarded xp for resource", { resourceId })
				throw errors.new("banked xp: missing awarded xp for resource")
			}
			const resultSourcedId = generateResultSourcedId(userId, resourceId, false)
			const lineItemId = getAssessmentLineItemId(resourceId)
			const metadata = {
				masteredUnits: 0,
				totalQuestions: 1,
				correctQuestions: 1,
				accuracy: 100,
				xp: computedAwardedXp,
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

				// After successful gradebook upsert, send Caliper banked XP event (best-effort)
				const userResult = await errors.try(oneroster.getAllUsers({ filter: `sourcedId='${userId}'` }))
				if (userResult.error) {
					logger.error("failed to fetch user for banked xp caliper event", { error: userResult.error, userId })
				} else {
					const user = userResult.data[0]
					if (!user || !user.email) {
						logger.error("missing user email for banked xp caliper event", { userId })
					} else {
						const subjectSlug = String(resource.metadata?.khanSubjectSlug ?? "")
						const mappedSubject = isSubjectSlug(subjectSlug) ? CALIPER_SUBJECT_MAPPING[subjectSlug] : "None"
						const awardedXp = computedAwardedXp
						const actor = {
							id: constructActorId(userId),
							type: "TimebackUser" as const,
							email: user.email
						}
						const context = {
							id: `${env.NEXT_PUBLIC_APP_DOMAIN}/resources/${resource.sourcedId}`,
							type: "TimebackActivityContext" as const,
							subject: mappedSubject,
							app: { name: "Nice Academy" },
							course: {
								name: "Unknown",
								id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${params.onerosterCourseSourcedId}`
							},
							activity: { name: resource.title, id: resource.sourcedId },
							process: false
						}

						const caliperResult = await errors.try(sendCaliperBankedXpAwardedEvent(actor, context, awardedXp))
						if (caliperResult.error) {
							logger.error("failed to send banked xp caliper event", { error: caliperResult.error, userId, resourceId })
						} else {
							logger.info("sent banked xp caliper event", { userId, resourceId, awardedXp })
						}
					}
				}
			}
		}
	}

	return { bankedXp: totalBankedXp, awardedResourceIds }
}

/**
 * Computes a breakdown of banked XP for a quiz without performing any writes.
 * Returns separate totals for videos and articles based on the same eligibility
 * window. Now uses canonical nice_timeSpent from assessment results.
 */
export async function getBankedXpBreakdownForQuiz(
	quizResourceId: string,
	userSourcedId: string
): Promise<{ articleXp: number; videoXp: number }> {
	logger.info("computing banked xp breakdown for quiz", { quizResourceId, userSourcedId })

	const userId = extractUserSourcedId(userSourcedId)

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

	// 5. Calculate banked XP using canonical nice_timeSpent from assessment results
	const TimeSpentMetadataSchema = z.object({ 
		nice_timeSpent: z.number().optional() 
	}).passthrough()

	const calculateXpForResources = async (resources: Array<{ sourcedId: string; expectedXp: number }>) => {
		let totalXp = 0
		
		for (const resource of resources) {
			const resultSourcedId = generateResultSourcedId(userId, resource.sourcedId, false)
			const result = await errors.try(oneroster.getResult(resultSourcedId))

			let timeSpent = 0
			if (!result.error) {
				const parsedMeta = TimeSpentMetadataSchema.safeParse(result.data?.metadata)
				timeSpent = parsedMeta.success && typeof parsedMeta.data.nice_timeSpent === "number" 
					? parsedMeta.data.nice_timeSpent 
					: 0
			}

			const minutesSpent = computeBankingMinutes(timeSpent)
			const awardedXp = Math.min(minutesSpent, resource.expectedXp)
			totalXp += awardedXp

			logger.debug("calculated xp for resource in breakdown", {
				resourceId: resource.sourcedId,
				timeSpent,
				minutesSpent,
				awardedXp,
				expectedXp: resource.expectedXp
			})
		}

		return totalXp
	}

	let articleXp = 0
	let videoXp = 0

	if (articleResources.length > 0) {
		articleXp = await calculateXpForResources(articleResources)
	}
	if (videoResources.length > 0) {
		videoXp = await calculateXpForResources(videoResources)
	}

	logger.info("computed banked xp breakdown using canonical time spent", { 
		quizResourceId, 
		articleXp, 
		videoXp,
		articleCount: articleResources.length,
		videoCount: videoResources.length
	})
	return { articleXp, videoXp }
}
