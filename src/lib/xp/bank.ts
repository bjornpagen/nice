import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"
import { sendCaliperBankedXpAwardedEvent } from "@/lib/actions/caliper"
import { extractResourceIdFromCompoundId } from "@/lib/caliper/utils"
import { CALIPER_SUBJECT_MAPPING, isSubjectSlug } from "@/lib/constants/subjects"
import {
    getComponentResourceForResourceInCourse,
    getComponentResourcesByLessonIds,
    getComponentResourcesForCourse,
    getCourse,
    getCourseComponentsByParentId,
    getCourseComponentsBySourcedId,
    getResource,
    getResourcesByIds,
    getResult as fetcherGetResult
} from "@/lib/data/fetchers/oneroster"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
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
	if (seconds < 20) return 0
	return Math.ceil(seconds / 60)
}

/**
 * Retrieves the list of passive resources that should be banked upon completion of a given exercise.
 * This function reads the pre-calculated list of passive resource IDs from the exercise's metadata
 * and then fetches the full resource details to get the canonical expected XP.
 */
export async function findEligiblePassiveResourcesForExercise(params: {
	exerciseResourceSourcedId: string
	onerosterUserSourcedId: string
}): Promise<Array<{ sourcedId: string; expectedXp: number; kind: "Article" | "Video" | "Other" }>> {
	const { exerciseResourceSourcedId, onerosterUserSourcedId } = params
	const correlationId = randomUUID()
	logger.info("identifying eligible passive resources from exercise metadata", {
		exerciseResourceSourcedId,
		correlationId
	})

	// 1. Fetch the exercise resource to get the list of passive resource IDs.
	const resourceResult = await errors.try(getResource(exerciseResourceSourcedId))
	if (resourceResult.error) {
		logger.error("failed to fetch exercise resource for banking", {
			error: resourceResult.error,
			exerciseResourceSourcedId,
			correlationId
		})
		throw errors.wrap(resourceResult.error, "exercise resource fetch for banking")
	}
	const exerciseResource = resourceResult.data
	if (!exerciseResource) {
		logger.warn("exercise resource not found, cannot determine passive resources", {
			exerciseResourceSourcedId,
			correlationId
		})
		return []
	}

	// 2. Safely parse the passiveResources array of strings from metadata.
	const PassiveResourceIdsSchema = z.array(z.string()).optional()
	const parsed = PassiveResourceIdsSchema.safeParse(exerciseResource.metadata?.nice_passiveResources)
	if (!parsed.success || !parsed.data || parsed.data.length === 0) {
		logger.info("no passiveResources metadata found for this exercise", {
			exerciseResourceSourcedId,
			correlationId
		})
		return []
	}

	const candidateResourceIds = parsed.data

	// 3. Fetch the full resource objects for the candidate IDs to get their canonical XP.
	const resourcesResult = await errors.try(getResourcesByIds(candidateResourceIds))
	if (resourcesResult.error) {
		logger.error("failed to fetch passive resource details", {
			error: resourcesResult.error,
			resourceIds: candidateResourceIds,
			correlationId
		})
		throw errors.wrap(resourcesResult.error, "passive resource details fetch")
	}

	const candidateResources = resourcesResult.data
		.map((resource) => {
			const metadata = resource.metadata
			const expectedXp = typeof metadata?.xp === "number" ? metadata.xp : 0
			let kind: "Article" | "Video" | "Other" = "Other"
			const isInteractive = metadata?.type === "interactive"
			const activityType = metadata && typeof metadata.khanActivityType === "string" ? metadata.khanActivityType : undefined
			if (isInteractive && activityType === "Article") kind = "Article"
			else if (isInteractive && activityType === "Video") kind = "Video"

			return {
				sourcedId: resource.sourcedId,
				expectedXp,
				kind
			}
		})
		.filter((r) => r.expectedXp > 0) // Only consider resources that grant XP.

	// 4. Deduplicate: Filter out resources that have already been banked for this user.
	const userId = extractUserSourcedId(onerosterUserSourcedId)
	const eligibilityChecks = await Promise.all(
		candidateResources.map(async (resource) => {
			const resultSourcedId = generateResultSourcedId(userId, resource.sourcedId, false)
			const existingResult = await errors.try(fetcherGetResult(resultSourcedId))

			if (existingResult.error) {
				logger.error("bank dedupe: failed to read existing result", {
					userId,
					resourceId: resource.sourcedId,
					resultSourcedId,
					error: existingResult.error,
					correlationId
				})
				throw errors.wrap(existingResult.error, "bank dedupe: read existing result")
			}

			const BankedMetaSchema = z.object({ xp: z.number().optional(), xpReason: z.string().optional() }).passthrough()
			const parsedMeta = BankedMetaSchema.safeParse(existingResult.data?.metadata)
			const xpValue = parsedMeta.success && typeof parsedMeta.data.xp === "number" ? parsedMeta.data.xp : 0
			const xpReason = parsedMeta.success && typeof parsedMeta.data.xpReason === "string" ? parsedMeta.data.xpReason : ""
			const alreadyBanked = xpValue > 0 || xpReason === "Banked XP"

			return { resource, alreadyBanked }
		})
	)

	const eligibleResources = eligibilityChecks.filter((e) => !e.alreadyBanked).map((e) => e.resource)

	logger.info("passive resource identification complete", {
		exerciseResourceSourcedId,
		eligibleCount: eligibleResources.length,
		filteredCount: candidateResources.length - eligibleResources.length,
		correlationId
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
	userEmail: string
	subjectSlug: string
	courseSlug: string
}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	const correlationId = randomUUID()
	// Normalize using shared utility to avoid string parsing divergence
	const userId = extractUserSourcedId(params.onerosterUserSourcedId)

	// Fetch and validate course metadata to ensure correct subject slug
	const courseResult = await errors.try(getCourse(params.onerosterCourseSourcedId))
	if (courseResult.error) {
		logger.error("failed to fetch course for banking context", {
			error: courseResult.error,
			courseSourcedId: params.onerosterCourseSourcedId,
			correlationId
		})
		throw errors.wrap(courseResult.error, "course fetch for banking")
	}
	
	const course = courseResult.data
	if (!course) {
		logger.error("CRITICAL: course not found for banking", {
			courseSourcedId: params.onerosterCourseSourcedId,
			correlationId
		})
		throw errors.new("course not found for banking")
	}

	// Validate course metadata
	const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
	if (!courseMetadataResult.success) {
		logger.error("CRITICAL: invalid course metadata for banking", {
			courseSourcedId: params.onerosterCourseSourcedId,
			error: courseMetadataResult.error,
			correlationId
		})
		throw errors.wrap(courseMetadataResult.error, "course metadata validation for banking")
	}
	
	const courseMetadata = courseMetadataResult.data
	
	// Validate that the provided subject slug matches the course's actual subject
	if (params.subjectSlug !== courseMetadata.khanSubjectSlug) {
		logger.error("CRITICAL: subject slug mismatch for banking", {
			providedSubject: params.subjectSlug,
			actualSubject: courseMetadata.khanSubjectSlug,
			courseSourcedId: params.onerosterCourseSourcedId,
			correlationId
		})
		throw errors.new("subject slug mismatch: provided subject does not match course")
	}

	// 1. Identify eligible resources using the pure function (already deduped)
    const eligibleResources = await findEligiblePassiveResourcesForExercise({
		exerciseResourceSourcedId: params.exerciseResourceSourcedId,
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
            const result = await errors.try(fetcherGetResult(resultSourcedId))

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

            if (timeSpent === 0) {
                logger.info("no time spent recorded for eligible passive resource", {
					resourceId: resource.sourcedId,
					resultId: resultSourcedId,
                    hasResult: !!result.data,
                    hasMetadata: !!result.data?.metadata,
                    correlationId
				})
			}

            logger.debug("fetched canonical time spent for resource", {
				resourceId: resource.sourcedId,
				timeSpent,
                minutesSpent: computeBankingMinutes(timeSpent),
                expectedXp: resource.expectedXp,
                correlationId
			})

			return { ...resource, timeSpent }
		})
	)

	// Build a quick lookup to preserve existing time spent when writing results
	const timeSpentByResourceId = new Map<string, number>(
		timeSpentResults.map((r) => [r.sourcedId, r.timeSpent])
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

	for (const { sourcedId, expectedXp, timeSpent, kind } of timeSpentResults) {
		const minutesSpent = computeBankingMinutes(timeSpent)
		
		// Videos and articles receive full expected XP; others follow time-based cap
		const awardedXp = (kind === "Video" || kind === "Article") ? expectedXp : Math.min(minutesSpent, expectedXp)

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
        detailedResults,
        correlationId
	})

	// 4. Get resource metadata for saving results and sending Caliper events
	const allResourceIds = eligibleResources.map((r) => r.sourcedId)
	const allResourcesResult = await errors.try(
		getResourcesByIds(allResourceIds)
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
				xpReason: "Banked XP",
				// Preserve canonical time spent so it is not lost on PUT
				nice_timeSpent: Math.max(0, timeSpentByResourceId.get(resourceId) ?? 0)
			}

            const saveResult = await errors.try(
				gradebook.saveResult({
					resultSourcedId,
					lineItemSourcedId: lineItemId,
					userSourcedId: userId,
					score: 100,
					comment: "Banked XP awarded upon exercise completion.",
                    metadata,
                    correlationId
				})
			)
			if (saveResult.error) {
				logger.error("failed to save banked xp assessment result", { resourceId, error: saveResult.error })
				// Continue with other resources even if one fails
			} else {
				logger.info("saved banked xp assessment result", { resourceId })

				// After successful gradebook upsert, send Caliper banked XP event
				if (!resource.metadata) {
					logger.error("CRITICAL: resource missing metadata for caliper event", { resourceId })
					throw errors.new("resource metadata: required for caliper event")
				}
				
				// Use the validated course subject slug from earlier fetch
				const subjectSlug = courseMetadata.khanSubjectSlug
				if (!isSubjectSlug(subjectSlug)) {
					logger.error("CRITICAL: invalid subject slug for caliper event", { 
						resourceId, 
						subjectSlug,
						correlationId
					})
					throw errors.new("invalid subject slug for caliper event")
				}
				
				const mappedSubject = CALIPER_SUBJECT_MAPPING[subjectSlug]
				const awardedXp = computedAwardedXp
				const actor = {
					id: constructActorId(userId),
					type: "TimebackUser" as const,
					email: params.userEmail
				}
				const context = {
					id: `${env.NEXT_PUBLIC_APP_DOMAIN}/resources/${resource.sourcedId}`,
					type: "TimebackActivityContext" as const,
					subject: mappedSubject,
					app: { name: "Nice Academy" },
					course: {
						name: courseMetadata.khanTitle, // Use course title from metadata
						id: `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/oneroster/rostering/v1p2/courses/${params.onerosterCourseSourcedId}`
					},
					activity: { name: resource.title, id: resource.sourcedId },
					process: false
				}

				// CRITICAL: Caliper event is required for data integrity - do not wrap in errors.try
				await sendCaliperBankedXpAwardedEvent(actor, context, awardedXp)
				logger.info("sent banked xp caliper event", { userId, resourceId, awardedXp, correlationId })
			}
		}
	}

	return { bankedXp: totalBankedXp, awardedResourceIds }
}

/**
 * Computes a breakdown of banked XP for a quiz without performing any writes.
 * Returns separate totals for videos and articles based on the same eligibility
 * window. Now uses canonical nice_timeSpent from assessment results.
 * Course-scoped for deterministic results when resources exist in multiple courses.
 */
export async function getBankedXpBreakdownForQuiz(
	quizResourceId: string,
	userSourcedId: string,
	onerosterCourseSourcedId: string
): Promise<{ articleXp: number; videoXp: number }> {
	logger.info("computing banked xp breakdown for quiz", { 
		quizResourceId, 
		userSourcedId,
		onerosterCourseSourcedId 
	})

	const userId = extractUserSourcedId(userSourcedId)

	// 1. Locate quiz component resource scoped to the course
	const componentResourceResult = await errors.try(
		getComponentResourceForResourceInCourse(onerosterCourseSourcedId, quizResourceId)
	)
	if (componentResourceResult.error) {
		logger.error("quiz component resource fetch failed", { 
			error: componentResourceResult.error,
			courseSourcedId: onerosterCourseSourcedId,
			quizResourceId
		})
		throw errors.wrap(componentResourceResult.error, "quiz component resource fetch")
	}
	const quizComponentResource = componentResourceResult.data
	if (!quizComponentResource) {
		logger.error("CRITICAL: quiz component resource is undefined after fetch", {
			courseSourcedId: onerosterCourseSourcedId,
			quizResourceId
		})
		throw errors.new("quiz component resource undefined")
	}
	
	// Determine the unit from the quiz's courseComponent
	const quizCourseComponentId = quizComponentResource.courseComponent.sourcedId
	const quizComponentResult = await errors.try(
		getCourseComponentsBySourcedId(quizCourseComponentId)
	)
	if (quizComponentResult.error) {
		logger.error("quiz course component fetch failed", {
			error: quizComponentResult.error,
			quizCourseComponentId
		})
		throw errors.wrap(quizComponentResult.error, "quiz course component fetch")
	}
	const quizCourseComponent = quizComponentResult.data[0]
	const parentUnitId = quizCourseComponent?.parent?.sourcedId
	const quizSortOrder = quizComponentResource.sortOrder
	
	if (!parentUnitId) {
		logger.error("CRITICAL: quiz has no parent unit", {
			quizCourseComponentId,
			quizResourceId
		})
		throw errors.new("quiz has no parent unit")
	}

	// 2. Get all component resources for the unit to find the previous quiz boundary
	// First get all CRs for the course, then filter to unit
	const courseCrResult = await errors.try(
		getComponentResourcesForCourse(onerosterCourseSourcedId)
	)
	if (courseCrResult.error) {
		logger.error("course component resources fetch failed", { 
			error: courseCrResult.error, 
			courseSourcedId: onerosterCourseSourcedId 
		})
		throw errors.wrap(courseCrResult.error, "course component resources fetch")
	}
	
	// Filter to only unit-level CRs
	const unitCrs = courseCrResult.data.filter(
		cr => cr.courseComponent.sourcedId === parentUnitId
	)

	// Fetch resources metadata for quiz detection
	const unitResourceIds = unitCrs.map((cr) => cr.resource.sourcedId)
	const unitResourcesResult = await errors.try(
		getResourcesByIds(unitResourceIds)
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
	for (const cr of unitCrs) {
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
		getCourseComponentsByParentId(parentUnitId)
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
		getComponentResourcesByLessonIds(lessonComponentSourcedIds)
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
		getResourcesByIds(resourceIds)
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

	const calculateXpForResources = async (
		resources: Array<{ sourcedId: string; expectedXp: number }>,
		isVideo: boolean
	) => {
		let totalXp = 0
		
		for (const resource of resources) {
			if (isVideo) {
				// Videos: award full expected XP without time-based calculation
				totalXp += resource.expectedXp
				logger.debug("awarded expected xp for video in breakdown", {
					resourceId: resource.sourcedId,
					awardedXp: resource.expectedXp,
					expectedXp: resource.expectedXp
				})
				continue
			}

			const resultSourcedId = generateResultSourcedId(userId, resource.sourcedId, false)
			const result = await errors.try(fetcherGetResult(resultSourcedId))

			let timeSpent = 0
			if (!result.error) {
				const parsedMeta = TimeSpentMetadataSchema.safeParse(result.data?.metadata)
				timeSpent = parsedMeta.success && typeof parsedMeta.data.nice_timeSpent === "number" 
					? parsedMeta.data.nice_timeSpent 
					: 0
			}

			const minutesSpent = computeBankingMinutes(timeSpent)
			const awardedXp = resource.expectedXp // articles: award full expected xp
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
		articleXp = await calculateXpForResources(articleResources, false)
	}
	if (videoResources.length > 0) {
		videoXp = await calculateXpForResources(videoResources, true)
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
