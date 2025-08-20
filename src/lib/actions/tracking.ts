"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { sendCaliperActivityCompletedEvent, sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { updateProficiencyFromAssessment } from "@/lib/actions/proficiency"
import { getCurrentUserSourcedId } from "@/lib/authorization"
import * as cacheUtils from "@/lib/cache"
import { invalidateCache } from "@/lib/cache"
import { extractResourceIdFromCompoundId, normalizeCaliperId } from "@/lib/caliper/utils"
import { oneroster } from "@/lib/clients"
import { VIDEO_COMPLETION_THRESHOLD_PERCENT, VIDEO_COMPLETION_THRESHOLD_RATIO } from "@/lib/constants/progress"
import { CALIPER_SUBJECT_MAPPING, isSubjectSlug } from "@/lib/constants/subjects"
import { getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"
import { redis } from "@/lib/redis"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { assertPercentageInteger, coercePercentageInteger } from "@/lib/utils/score"
// Caliper additive tracking imports
import { getCaliperFinalizationLockKey, getCaliperVideoWatchState, setCaliperVideoWatchState } from "@/lib/video-cache"
// ADDED: Import the new XP service.
import { awardXpForAssessment } from "@/lib/xp/service"

// duplicate import removed below

const CALIPER_ACCUMULATION_CADENCE_SECONDS = 10
const CALIPER_MAX_DELTA_PER_SYNC = CALIPER_ACCUMULATION_CADENCE_SECONDS * 3
const CALIPER_DURATION_TOLERANCE = 5
const CALIPER_MAX_GROWTH_FACTOR_VS_WALLTIME = 1.5

export async function accumulateCaliperWatchTime(
	clientUserSourcedId: string,
	onerosterVideoResourceSourcedId: string,
	sessionDeltaSeconds: number,
	currentPositionSeconds: number,
	durationSeconds: number,
	videoTitle: string,
	courseInfo: { subjectSlug: string; courseSlug: string }
) {
	const { userId } = await auth()
	if (!userId) {
		logger.error("caliper accumulate: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const serverSourcedId = await getCurrentUserSourcedId(userId)
	if (clientUserSourcedId !== serverSourcedId) {
		logger.error("caliper accumulate: sourcedId mismatch", { clientUserSourcedId, serverSourcedId })
		throw errors.new("unauthorized sourcedId")
	}

	if (sessionDeltaSeconds < 0 || !Number.isFinite(sessionDeltaSeconds)) {
		logger.warn("caliper accumulate: invalid session delta", { sessionDeltaSeconds, max: CALIPER_MAX_DELTA_PER_SYNC })
		return
	}

	// Do not hard-cap per sync; rely on wall-time guard with a small leeway

	const now = new Date()
	const currentState = (await getCaliperVideoWatchState(serverSourcedId, onerosterVideoResourceSourcedId)) ?? {
		cumulativeWatchTimeSeconds: 0,
		lastKnownPositionSeconds: 0,
		canonicalDurationSeconds: null,
		finalizedAt: null,
		lastServerSyncAt: null
	}

	if (currentState.finalizedAt) return

	const canonicalDuration = currentState.canonicalDurationSeconds ?? durationSeconds
	if (Math.abs(durationSeconds - canonicalDuration) > CALIPER_DURATION_TOLERANCE) {
		logger.warn("caliper accumulate: duration mismatch, retaining canonical", { durationSeconds, canonicalDuration })
	}

	let effectiveDelta = sessionDeltaSeconds
	if (currentState.lastServerSyncAt) {
		const sinceMs = now.getTime() - new Date(currentState.lastServerSyncAt).getTime()
		const allowed = (sinceMs / 1000) * CALIPER_MAX_GROWTH_FACTOR_VS_WALLTIME
		const SMALL_LEEWAY_SECONDS = 5
		const guardAllowed = Math.max(allowed, SMALL_LEEWAY_SECONDS)

		const nearCompletion =
			canonicalDuration > 0 && currentPositionSeconds / canonicalDuration >= VIDEO_COMPLETION_THRESHOLD_RATIO

		if (nearCompletion) {
			// Allow enough to reach near-end for finalize, but avoid overshooting to duration exactly
			const remainingToNinetyNine = Math.max(
				0,
				Math.max(0, canonicalDuration - 1) - currentState.cumulativeWatchTimeSeconds
			)
			if (effectiveDelta > guardAllowed && remainingToNinetyNine > 0) {
				effectiveDelta = Math.min(effectiveDelta, remainingToNinetyNine)
			}
		} else if (effectiveDelta > guardAllowed) {
			logger.warn("caliper accumulate: delta exceeds wall-time guard; clamping", { sessionDeltaSeconds, allowed })
			effectiveDelta = Math.max(0, guardAllowed)
		}
	}

	const newCumulative = Math.min(currentState.cumulativeWatchTimeSeconds + effectiveDelta, canonicalDuration)
	const newState = {
		...currentState,
		cumulativeWatchTimeSeconds: newCumulative,
		lastKnownPositionSeconds: Math.max(0, currentPositionSeconds),
		canonicalDurationSeconds: canonicalDuration,
		lastServerSyncAt: now.toISOString()
	}

	await setCaliperVideoWatchState(serverSourcedId, onerosterVideoResourceSourcedId, newState)

	if (canonicalDuration > 0 && newCumulative / canonicalDuration >= VIDEO_COMPLETION_THRESHOLD_RATIO) {
		await finalizeCaliperTimeSpentEvent(serverSourcedId, onerosterVideoResourceSourcedId, videoTitle, courseInfo)
	}
}

export async function finalizeCaliperTimeSpentEvent(
	onerosterUserSourcedId: string,
	onerosterVideoResourceSourcedId: string,
	videoTitle: string,
	courseInfo: { subjectSlug: string; courseSlug: string }
) {
	if (!redis) {
		logger.error("caliper finalize: redis unavailable")
		throw errors.new("persistence service unavailable")
	}
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("caliper finalize: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const lockKey = getCaliperFinalizationLockKey(onerosterUserSourcedId, onerosterVideoResourceSourcedId)
	const lockSet = await errors.try(redis.set(lockKey, "1", { EX: 30, NX: true }))
	if (lockSet.error) {
		logger.error("caliper finalize: set lock", { error: lockSet.error })
		throw errors.wrap(lockSet.error, "caliper finalize lock")
	}
	if (!lockSet.data) {
		return
	}
	const state = await getCaliperVideoWatchState(onerosterUserSourcedId, onerosterVideoResourceSourcedId)
	if (!state || state.finalizedAt) {
		const cleanup = await errors.try(redis.del(lockKey))
		if (cleanup.error) {
			logger.error("caliper finalize: del lock after no-op", { error: cleanup.error })
		}
		return
	}

	const userResult = await errors.try((await clerkClient()).users.getUser(clerkUserId))
	if (userResult.error) {
		logger.error("caliper finalize: get user", { error: userResult.error })
		const cleanup = await errors.try(redis.del(lockKey))
		if (cleanup.error) {
			logger.error("caliper finalize: del lock after user error", { error: cleanup.error })
		}
		logger.error("caliper finalize: throwing after user fetch error", { error: userResult.error })
		throw errors.wrap(userResult.error, "caliper user fetch")
	}
	const userEmail = userResult.data.emailAddresses[0]?.emailAddress
	if (!userEmail) {
		logger.error("caliper finalize: missing user email", { clerkUserId })
		throw errors.new("user email required")
	}
	if (!isSubjectSlug(courseInfo.subjectSlug)) {
		logger.error("caliper finalize: invalid subject slug", { subjectSlug: courseInfo.subjectSlug })
		throw errors.new("invalid subject slug")
	}
	const normalizedResourceId = extractResourceIdFromCompoundId(onerosterVideoResourceSourcedId)
	const activityId = normalizeCaliperId(normalizedResourceId)
	const actor = {
		id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${onerosterUserSourcedId}`,
		type: "TimebackUser" as const,
		email: userEmail
	}
	const context = {
		id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/${courseInfo.subjectSlug}/${courseInfo.courseSlug}`,
		type: "TimebackActivityContext" as const,
		subject: CALIPER_SUBJECT_MAPPING[courseInfo.subjectSlug],
		app: { name: "Nice Academy" },
		course: { name: courseInfo.courseSlug },
		activity: { name: videoTitle, id: activityId }
	}
	logger.info("caliper finalize: sending timespent", {
		videoId: onerosterVideoResourceSourcedId,
		user: onerosterUserSourcedId
	})
	await sendCaliperTimeSpentEvent(actor, context, Math.floor(state.cumulativeWatchTimeSeconds))
	logger.info("caliper finalize: sent timespent", {
		videoId: onerosterVideoResourceSourcedId,
		user: onerosterUserSourcedId
	})
	const finalState = { ...state, finalizedAt: new Date().toISOString() }
	await setCaliperVideoWatchState(onerosterUserSourcedId, onerosterVideoResourceSourcedId, finalState)
	const delResult = await errors.try(redis.del(lockKey))
	if (delResult.error) {
		logger.error("caliper finalize: del lock", { error: delResult.error })
	}
}

/**
 * Tracks that a user has viewed an article by creating a "completed"
 * AssessmentResult in the OneRoster gradebook.
 * This action is designed to be idempotent; it will not create duplicate results.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterArticleResourceSourcedId - The OneRoster resource sourcedId for the article
 * @param courseInfo - Slugs to identify the course for cache invalidation.
 */
export async function trackArticleView(
	onerosterArticleResourceSourcedId: string,
	courseInfo: { subjectSlug: string; courseSlug: string }
) {
	const { userId } = await auth()
	if (!userId) {
		logger.error("trackArticleView failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	logger.info("tracking article view", { onerosterUserSourcedId, onerosterArticleResourceSourcedId })

	// The line item sourcedId is the resource sourcedId + '_ali'
	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterArticleResourceSourcedId)

	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: 100 // Use 100 to represent "completed"
		}
	}

	// Use putResult for idempotency. If the result already exists, this will
	// simply update it. If not, it will be created.
	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		logger.error("failed to track article view", {
			onerosterUserSourcedId,
			onerosterArticleResourceSourcedId,
			error: result.error
		})
		// This is a non-critical background task. Re-throw the error to allow the
		// client to decide how to handle it, but it shouldn't block the UI.
		throw errors.wrap(result.error, "track article view")
	}

	// Invalidate the user progress cache for this course.
	const courseResult = await errors.try(getAllCoursesBySlug(courseInfo.courseSlug))
	if (courseResult.error || !courseResult.data[0]) {
		logger.error("failed to find course for cache invalidation", {
			courseSlug: courseInfo.courseSlug,
			error: courseResult.error
		})
	} else {
		const onerosterCourseSourcedId = courseResult.data[0].sourcedId
		const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
		await invalidateCache(cacheKey)
		logger.info("invalidated user progress cache", { cacheKey })
	}

	logger.info("successfully tracked article view", {
		onerosterUserSourcedId,
		onerosterArticleResourceSourcedId,
		onerosterResultSourcedId
	})
}

/**
 * Updates the video progress for a user by creating or updating an AssessmentResult
 * in the OneRoster gradebook.
 *
 * This is a fire-and-forget action that tracks how much of a video has been watched.
 * It marks the video as "completed" once the user watches 95% or more of the content.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterVideoResourceSourcedId - The OneRoster resource sourcedId for the video
 * @param currentTime - The current playback time in seconds.
 * @param duration - The total duration of the video in seconds.
 * @param courseInfo - Slugs to identify the course for cache invalidation.
 */
export async function updateVideoProgress(
	onerosterVideoResourceSourcedId: string,
	currentTime: number,
	duration: number,
	courseInfo: { subjectSlug: string; courseSlug: string }
): Promise<void> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("updateVideoProgress failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)

	if (duration <= 0) {
		logger.warn("video progress tracking skipped", {
			onerosterVideoResourceSourcedId,
			reason: "invalid duration",
			duration
		})
		return
	}

	const percentComplete = Math.round((currentTime / duration) * 100)
	const formattedCurrentTime = Math.floor(currentTime)
	const formattedDuration = Math.floor(duration)

	// Log detailed progress information
	logger.info("saving video progress", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId,
		percentComplete,
		currentTime: formattedCurrentTime,
		duration: formattedDuration,
		timeWatched: `${formattedCurrentTime}s of ${formattedDuration}s`,
		timestamp: new Date().toISOString()
	})

	// Define the completion threshold (shared constant)
	const isCompleted = percentComplete >= VIDEO_COMPLETION_THRESHOLD_PERCENT

	// The score is a percentage (0-100) based on current playback position.
	const newScore = isCompleted ? 100 : coercePercentageInteger(percentComplete, "video progress")

	// Log whether this is marking the video as complete
	if (isCompleted) {
		logger.info("video marked as complete", {
			onerosterVideoResourceSourcedId,
			onerosterUserSourcedId,
			finalPercentage: percentComplete
		})
	}

	// The line item sourcedId is the video resource sourcedId + '_ali'
	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterVideoResourceSourcedId)
	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`

	// Preserve monotonic progress: never decrease an existing higher result
	let finalScore = newScore
	let finalStatus: "fully graded" | "partially graded" = isCompleted ? "fully graded" : "partially graded"

	const existingResult = await errors.try(oneroster.getResult(onerosterResultSourcedId))
	if (existingResult.error) {
		// To preserve monotonicity, avoid sending a potentially lower score if we can't compare
		if (newScore < 100) {
			logger.warn("skipping video progress update due to unknown existing score", {
				onerosterResultSourcedId,
				proposedScore: newScore,
				percentComplete
			})
			return
		}
		logger.debug("no existing video result, proceeding with completion", { onerosterResultSourcedId })
	} else {
		const rawExistingScore = typeof existingResult.data?.score === "number" ? existingResult.data.score : undefined
		// Post-migration: scores are stored as 0..100 integers; no legacy float normalization
		const existingScore = rawExistingScore
		const existingIsCompleted = existingScore !== undefined && existingScore >= VIDEO_COMPLETION_THRESHOLD_PERCENT
		if (existingScore !== undefined && existingScore >= newScore) {
			finalScore = existingScore
		}
		// Once completed, remain completed
		if (existingIsCompleted) {
			finalStatus = "fully graded"
		}
	}

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
			scoreStatus: finalStatus,
			scoreDate: new Date().toISOString(),
			score: finalScore
		}
	}

	logger.debug("sending video progress to OneRoster", {
		onerosterResultSourcedId,
		score: finalScore,
		scoreStatus: finalStatus,
		onerosterVideoResourceSourcedId
	})

	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		// This is a non-critical background task. Log the error for observability
		// but do not re-throw, as it should not interrupt the user's experience.
		logger.error("failed to update video progress", {
			onerosterUserSourcedId,
			onerosterVideoResourceSourcedId,
			percentComplete,
			error: result.error
		})
		// This is a non-critical background task. Re-throw the error to allow the
		// client to decide how to handle it, but it shouldn't block the UI.
		throw errors.wrap(result.error, "update video progress")
	}

	// Invalidate the user progress cache for this course.
	const courseResult = await errors.try(getAllCoursesBySlug(courseInfo.courseSlug))
	if (courseResult.error || !courseResult.data[0]) {
		logger.error("failed to find course for cache invalidation", {
			courseSlug: courseInfo.courseSlug,
			error: courseResult.error
		})
	} else {
		const onerosterCourseSourcedId = courseResult.data[0].sourcedId
		const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
		await invalidateCache(cacheKey)
		logger.info("invalidated user progress cache", { cacheKey })
	}

	logger.info("video progress saved successfully", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId,
		score: finalScore,
		percentComplete,
		status: finalStatus,
		isPartialProgress: finalStatus === "partially graded"
	})
}

// Interface for the single options object
interface AssessmentCompletionOptions {
	onerosterResourceSourcedId: string
	score: number
	correctAnswers: number
	totalQuestions: number
	onerosterCourseSourcedId: string
	metadata?: {
		masteredUnits: number
		totalQuestions: number
		correctQuestions: number
		accuracy: number
		xp: number
		multiplier: number
	}
	contentType?: "Exercise" | "Quiz" | "Test" | "CourseChallenge" // Added CourseChallenge
	isInteractiveAssessment?: boolean
	onerosterComponentResourceSourcedId?: string
	sessionResults?: Array<{ qtiItemId: string; isCorrect: boolean | null; isReported?: boolean }>
	attemptNumber?: number
	assessmentTitle?: string
	assessmentPath?: string
	unitData?: {
		path: string
		title: string
	}
	expectedXp?: number
	durationInSeconds?: number
	userEmail?: string
	startedAt?: string
}

// REMOVED: Redundant overload signatures. We will use a single options object.
/**
 * Saves an assessment result and orchestrates XP and proficiency updates.
 */
export async function saveAssessmentResult(options: AssessmentCompletionOptions): Promise<unknown> {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		logger.error("user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(clerkUserId)

	// Destructure all options for clarity
	const {
		onerosterResourceSourcedId: resourceId,
		score: assessmentScore,
		correctAnswers: assessmentCorrectAnswers,
		totalQuestions: assessmentTotalQuestions,
		onerosterCourseSourcedId: courseId,
		metadata: assessmentMetadata,
		contentType,
		isInteractiveAssessment,
		onerosterComponentResourceSourcedId,
		sessionResults,
		attemptNumber,
		assessmentTitle,
		assessmentPath,
		unitData,
		expectedXp,
		durationInSeconds,
		userEmail,
		startedAt
	} = options

	logger.info("saving assessment result", { clerkUserId, ...options })

	// Step 1: Calculate server-side accuracy and masteredUnits
	const accuracyPercent =
		assessmentTotalQuestions > 0 ? Math.round((assessmentCorrectAnswers / assessmentTotalQuestions) * 100) : 100
	const calculateMasteredUnits = () => {
		if (contentType === "Test") return accuracyPercent >= 90 ? 1 : 0
		if (contentType === "Exercise" || contentType === "Quiz") return accuracyPercent >= 80 ? 1 : 0
		return 0
	}
	const masteredUnits = calculateMasteredUnits()

	// Initialize XP tracking variables
	let finalXp = 0
	let xp: { finalXp: number; multiplier: number; penaltyApplied: boolean; reason: string } | null = null

	// Step 2: Save the raw assessment result to OneRoster
	const onerosterLineItemSourcedId = getAssessmentLineItemId(resourceId)
	const baseResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`
	const onerosterResultSourcedId =
		isInteractiveAssessment && attemptNumber && attemptNumber > 0
			? `${baseResultSourcedId}_attempt_${attemptNumber}`
			: baseResultSourcedId
	// Step 3: Calculate XP first if we have the required data
	if (unitData && assessmentPath && assessmentTitle && userEmail && expectedXp !== undefined && attemptNumber) {
		logger.info("calculating xp for assessment", { resourceId })

		// 3a. Use the new XP Service to calculate final XP
		const xpResult = await errors.try(
			awardXpForAssessment({
				userSourcedId: onerosterUserSourcedId,
				assessmentResourceId: resourceId,
				componentResourceId: onerosterComponentResourceSourcedId ?? resourceId,
				courseSourcedId: courseId,
				baseXp: expectedXp,
				correctQuestions: assessmentCorrectAnswers,
				totalQuestions: assessmentTotalQuestions,
				attemptNumber: attemptNumber,
				durationInSeconds,
				isExercise: contentType === "Exercise"
			})
		)

		if (xpResult.error) {
			logger.error("failed to award xp", { error: xpResult.error, resourceId })
			// Continue execution - XP failure should not block other processes
		} else {
			finalXp = xpResult.data.finalXp
			xp = {
				finalXp: xpResult.data.finalXp,
				multiplier: xpResult.data.multiplier,
				penaltyApplied: xpResult.data.penaltyApplied,
				reason: xpResult.data.reason
			}
		}
	}

	// Step 4: Save the assessment result with metadata
	// Enforce valid 0..100 integer score at the write boundary
	const finalScore = assertPercentageInteger(assessmentScore, "assessment score")
	// Build base metadata either from provided metadata (legacy paths like banked XP)
	// or from server-side computed values. If server-calculated XP exists, override
	// the XP-related fields to ensure authoritative values.
	const baseMetadata = assessmentMetadata
		? {
				masteredUnits: assessmentMetadata.masteredUnits,
				totalQuestions: assessmentMetadata.totalQuestions,
				correctQuestions: assessmentMetadata.correctQuestions,
				accuracy: assessmentMetadata.accuracy,
				xp: assessmentMetadata.xp,
				multiplier: assessmentMetadata.multiplier,
				attempt: attemptNumber,
				startedAt: startedAt,
				completedAt: new Date().toISOString(),
				lessonType: contentType?.toLowerCase(),
				courseSourcedId: courseId,
				durationInSeconds
			}
		: {
				masteredUnits,
				totalQuestions: assessmentTotalQuestions,
				correctQuestions: assessmentCorrectAnswers,
				accuracy: accuracyPercent,
				xp: finalXp,
				multiplier: xp?.multiplier ?? 0,
				attempt: attemptNumber,
				startedAt: startedAt,
				completedAt: new Date().toISOString(),
				lessonType: contentType?.toLowerCase(),
				courseSourcedId: courseId,
				durationInSeconds,
				// Provide defaults for penalty fields when no XP calc performed
				penaltyApplied: xp?.penaltyApplied ?? false,
				xpReason: xp?.reason ?? ""
			}

	// If XP was calculated on the server, ensure XP-related fields reflect that
	const finalMetadata = xp
		? {
				...baseMetadata,
				xp: xp.finalXp,
				multiplier: xp.multiplier,
				penaltyApplied: xp.penaltyApplied,
				xpReason: xp.reason
			}
		: baseMetadata

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: finalScore,
			comment:
				attemptNumber && attemptNumber > 1
					? `${assessmentCorrectAnswers}/${assessmentTotalQuestions} correct on attempt ${attemptNumber}`
					: `${assessmentCorrectAnswers}/${assessmentTotalQuestions} correct on first attempt`,
			metadata: finalMetadata
		}
	}

	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		logger.error("failed to save assessment result", { clerkUserId, resourceId, error: result.error })
		throw errors.wrap(result.error, "assessment result save")
	}

	// Step 5: Invalidate Cache
	const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, courseId)
	await invalidateCache(cacheKey)
	logger.info("invalidated user progress cache", { cacheKey })

	logger.info("successfully saved assessment result", {
		clerkUserId,
		resourceId,
		onerosterResultSourcedId,
		score: assessmentScore
	})

	// Step 6: Send Caliper events when we have sufficient context
	if (unitData && assessmentPath && assessmentTitle && userEmail) {
		logger.info("sending caliper events", { resourceId })

		// 6a. Build Caliper context and send events with final XP value
		const pathParts = unitData.path.split("/")
		const subject = pathParts[1]
		const course = pathParts[2]
		const subjectMapping: Record<string, "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"> = {
			science: "Science",
			math: "Math",
			reading: "Reading",
			language: "Language",
			"social-studies": "Social Studies"
		}
		const mappedSubject = subject ? subjectMapping[subject] : undefined

		if (mappedSubject && course) {
			const actor = {
				id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${onerosterUserSourcedId}`,
				type: "TimebackUser" as const,
				email: userEmail
			}
			const context = {
				id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}${assessmentPath}`,
				type: "TimebackActivityContext" as const,
				subject: mappedSubject,
				app: { name: "Nice Academy" },
				course: {
					name: course,
					id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/courses/${courseId}`
				},
				activity: { name: assessmentTitle, id: resourceId },
				process: false
			}
			const performance = {
				totalQuestions: assessmentTotalQuestions,
				correctQuestions: assessmentCorrectAnswers,
				masteredUnits
			}

			// Determine final XP for the Caliper metric: prefer server XP, else provided metadata, else expectedXp or 0
			const finalXpForCaliper = xp?.finalXp ?? assessmentMetadata?.xp ?? expectedXp ?? 0

			// Call the simplified Caliper function (guarded)
			const caliperResult = await errors.try(
				sendCaliperActivityCompletedEvent(actor, context, performance, finalXpForCaliper)
			)
			if (caliperResult.error) {
				logger.error("failed to send caliper activity event", { error: caliperResult.error, resourceId })
			}

			if (durationInSeconds && durationInSeconds >= 1) {
				const timeSpentResult = await errors.try(sendCaliperTimeSpentEvent(actor, context, durationInSeconds))
				if (timeSpentResult.error) {
					logger.error("failed to send caliper time spent event", { error: timeSpentResult.error, resourceId })
				}
			}
		}
	}

	// Step 4: Update proficiency for interactive assessments
	if (isInteractiveAssessment && onerosterComponentResourceSourcedId && sessionResults && attemptNumber) {
		logger.info("starting proficiency analysis from server", {
			onerosterComponentResourceSourcedId,
			sessionResultCount: sessionResults.length
		})
		const proficiencyResult = await errors.try(
			updateProficiencyFromAssessment(onerosterComponentResourceSourcedId, attemptNumber, sessionResults, courseId)
		)
		if (proficiencyResult.error) {
			logger.error("failed to update proficiency from assessment", {
				error: proficiencyResult.error,
				onerosterComponentResourceSourcedId
			})
			// Continue execution - proficiency failure should not block assessment save
		}
	}

	return {
		onerosterResultSourcedId,
		xp: xp ?? { finalXp: 0, multiplier: 0, penaltyApplied: false, reason: "" }
	}
}

/**
 * Retrieves the saved video progress for a user.
 * Returns the last watched position in seconds, or null if no progress is saved.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterVideoResourceSourcedId - The OneRoster resource sourcedId for the video
 * @returns The last watched position in seconds, or null if no progress found
 */
export async function getVideoProgress(
	onerosterVideoResourceSourcedId: string
): Promise<{ currentTime: number; percentComplete: number } | null> {
	const { userId } = await auth()
	if (!userId) {
		logger.error("getVideoProgress failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	logger.debug("fetching video progress", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId
	})

	// The result sourcedId follows our pattern: use the assessment line item id
	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterVideoResourceSourcedId)
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`

	const result = await errors.try(oneroster.getResult(onerosterResultSourcedId))
	if (result.error) {
		logger.debug("no video progress found", {
			onerosterUserSourcedId,
			onerosterVideoResourceSourcedId,
			error: result.error
		})
		return null
	}

	const assessmentResult = result.data
	if (!assessmentResult || typeof assessmentResult.score !== "number") {
		logger.debug("no valid video progress data", {
			onerosterUserSourcedId,
			onerosterVideoResourceSourcedId
		})
		return null
	}

	// Post-migration: scores are stored as 0..100 integers
	const rawScore = assessmentResult.score
	const percentComplete = Math.round(rawScore)

	logger.debug("video progress retrieved", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId,
		percentComplete,
		scoreStatus: assessmentResult.scoreStatus
	})

	// We don't store currentTime directly, so we can't return it
	// The client will need to calculate it based on video duration
	return {
		currentTime: 0, // Will be calculated on the client side
		percentComplete
	}
}
