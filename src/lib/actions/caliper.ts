"use server"

import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { updateStreak } from "@/lib/actions/streak"
import { awardBankedXpForAssessment } from "@/lib/actions/xp"
import type {
	CaliperEnvelope,
	TimebackActivityCompletedEvent,
	TimebackActivityContext,
	TimebackActivityMetric,
	TimebackTimeSpentEvent
} from "@/lib/caliper"
import { caliper, oneroster } from "@/lib/clients"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
// ADDED: Import the new utility function
import { findLatestInteractiveAttempt } from "@/lib/utils/assessment-results"
import { MASTERY_THRESHOLD } from "@/lib/xp"

const SENSOR_ID = env.NEXT_PUBLIC_APP_DOMAIN

/**
 * Sends a TimebackActivityEvent to track the completion of an activity.
 *
 * This function implements the XP system from xp-brainlift.md:
 * - Calculates awarded XP based on performance
 * - Processes XP Bank for Quizzes (awards XP for 100% completed passive content)
 * - Prevents XP farming by checking current proficiency before awarding XP
 *
 * @param actor - The user who performed the action.
 * @param context - The activity context (course, lesson, etc.).
 * @param performance - The performance data including xpEarned, totalQuestions, correctQuestions, and optionally masteredUnits.
 * @param shouldAwardXp - Optional flag indicating if XP should be awarded (when pre-checked by caller)
 */
export async function sendCaliperActivityCompletedEvent(
	actor: TimebackActivityCompletedEvent["actor"],
	context: TimebackActivityContext,
	performance: {
		xpEarned: number
		totalQuestions: number
		correctQuestions: number
		durationInSeconds?: number
		masteredUnits?: number
	},
	shouldAwardXp?: boolean
) {
	logger.info("sending caliper activity completed event", {
		actorId: actor.id,
		activityId: context.id,
		performance
	})

	// Extract activity ID from context.activity.id (required for XP calculation)
	if (!context.activity?.id) {
		logger.error("CRITICAL: Missing activity ID in context", {
			contextId: context.id,
			activityContext: context.activity
		})
		throw errors.new("activity ID is required for XP calculation")
	}
	let assessmentLineItemId = context.activity.id

	// Convert plain OneRoster resource ID to proper URI format for Caliper API compliance
	// If activity.id is just a plain ID (like "nice_x3f3b1dd39647cb48"), convert to OneRoster URI
	const onerosterBaseUrl = env.TIMEBACK_ONEROSTER_SERVER_URL || "https://api.alpha-1edtech.com"
	if (!context.activity.id.startsWith("http")) {
		// This is a plain OneRoster resource ID, convert to proper URI
		context.activity.id = `${onerosterBaseUrl}/ims/oneroster/rostering/v1p2/resources/${context.activity.id}`
		logger.debug("converted plain resource ID to OneRoster URI", {
			originalId: assessmentLineItemId,
			convertedUri: context.activity.id
		})
	}

	// Handle compound componentResource IDs (format: nice_unitId_resourceId)
	// Assessment results are saved under resource ID, not componentResource ID
	const idParts = assessmentLineItemId.split("_")
	if (idParts.length === 3 && idParts[0] === "nice") {
		// This is a compound ID like nice_x310ffe65_x82a512f747dc1208
		// Extract just the resource ID: nice_x82a512f747dc1208
		assessmentLineItemId = `${idParts[0]}_${idParts[2]}`
		logger.debug("extracted resource id from compound id", {
			originalId: context.activity.id,
			extractedResourceId: assessmentLineItemId
		})
	}

	const userSourcedId = actor.id.split("/").pop()
	if (!userSourcedId) {
		logger.error("CRITICAL: Could not parse userSourcedId from actor ID", { actorId: actor.id })
		throw errors.new("invalid actor ID format")
	}

	// 1. Check current proficiency before calculating any XP
	let assessmentXp = 0

	// If shouldAwardXp is explicitly provided, use that decision
	if (shouldAwardXp !== undefined) {
		if (!shouldAwardXp) {
			logger.info("xp farming prevented: caller determined user already proficient", {
				userSourcedId,
				assessmentLineItemId
			})
			assessmentXp = 0
		} else {
			// IMPORTANT: performance.xpEarned is already the CALCULATED XP (with multipliers applied)
			// from the assessment-stepper, so we should NOT recalculate it here
			if (performance.totalQuestions === 0) {
				logger.error("CRITICAL: Assessment has zero questions", {
					assessmentId: context.activity?.id,
					performance
				})
				throw errors.new("assessment must have at least one question")
			}
			const accuracy = performance.correctQuestions / performance.totalQuestions

			// Use the pre-calculated XP value passed from assessment-stepper
			assessmentXp = performance.xpEarned

			logger.info("using pre-calculated xp from caller", {
				userSourcedId,
				assessmentLineItemId,
				accuracy,
				awardedXp: assessmentXp,
				note: "XP already calculated with attempt-based multipliers"
			})
		}
	} else {
		// Fallback path: honor pre-calculated XP and perform only the proficiency guard here
		const strictLineItemId = getAssessmentLineItemId(assessmentLineItemId)
		const currentResultsResult = await errors.try(
			oneroster.getAllResults({
				filter: `student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${strictLineItemId}'`
			})
		)

		if (currentResultsResult.error) {
			logger.error("CRITICAL: Failed to fetch proficiency for XP calculation", {
				userSourcedId,
				assessmentLineItemId,
				error: currentResultsResult.error
			})
			throw errors.wrap(currentResultsResult.error, "proficiency check required for XP calculation")
		}

		// REMOVED: The duplicated filter and sort logic is gone.

		// CHANGED: Use the new utility to find the latest valid attempt directly.
		const latestResult = findLatestInteractiveAttempt(currentResultsResult.data, userSourcedId, strictLineItemId)

		let currentProficiency = 0 // Default to 0 if no previous attempts
		if (latestResult && typeof latestResult.score === "number") {
			currentProficiency = latestResult.score
		}

		if (currentProficiency >= MASTERY_THRESHOLD) {
			logger.info("xp farming prevented: user already proficient on this assessment", {
				userSourcedId,
				assessmentLineItemId,
				currentProficiency
			})
			assessmentXp = 0 // User already proficient, no new XP is awarded.
		} else {
			// Current proficiency is below mastery - use caller-provided xpEarned as final (avoid re-bonus)
			if (performance.totalQuestions === 0) {
				logger.error("CRITICAL: Assessment has zero questions", {
					assessmentId: context.activity?.id,
					performance
				})
				throw errors.new("assessment must have at least one question")
			}

			const accuracy = performance.correctQuestions / performance.totalQuestions
			assessmentXp = performance.xpEarned

			logger.info("using pre-calculated xp in fallback path", {
				userSourcedId,
				assessmentLineItemId,
				currentProficiency,
				newAccuracy: accuracy,
				awardedXp: assessmentXp
			})
		}
	}

	// Log if penalty was applied (any negative XP indicates penalty)
	if (assessmentXp < 0) {
		logger.warn("insincere effort detected - penalty applied", {
			userId: actor.id,
			assessmentId: context.activity?.id,
			accuracy: performance.correctQuestions / performance.totalQuestions,
			totalQuestions: performance.totalQuestions,
			penaltyXp: assessmentXp,
			durationInSeconds: performance.durationInSeconds,
			timePerQuestion: performance.durationInSeconds
				? performance.durationInSeconds / performance.totalQuestions
				: undefined
		})
	}

	let finalXp = assessmentXp

	// 3. Check if this is a Quiz to trigger XP Bank (only if we're awarding XP)
	if (!context.activity?.name) {
		logger.error("CRITICAL: Missing activity name in context", {
			contextId: context.id,
			activityId: context.activity?.id
		})
		throw errors.new("activity name required for XP calculation")
	}
	const activityType = context.activity.name.toLowerCase()
	// Prefer route path signal ("/quiz/") over name-based heuristics; fallback to name contains "quiz"
	const isQuiz = (context.id?.toLowerCase().includes("/quiz/") ?? false) || activityType.includes("quiz")

	// 4. Process XP Bank if applicable (only if assessment XP > 0)
	if (
		isQuiz &&
		assessmentXp > 0 &&
		performance.correctQuestions / performance.totalQuestions >= MASTERY_THRESHOLD &&
		context.activity?.id &&
		context.course?.id
	) {
		const xpBankResult = await errors.try(awardBankedXpForAssessment(assessmentLineItemId, actor.id, context.course.id))
		if (xpBankResult.error) {
			logger.error("failed to process xp bank", {
				error: xpBankResult.error,
				assessmentId: context.activity.id,
				userId: actor.id
			})
			// Continue with just the assessment XP if bank processing fails
		} else {
			const { bankedXp, awardedResourceIds } = xpBankResult.data
			finalXp += bankedXp

			if (awardedResourceIds.length > 0) {
				logger.info("awarded banked xp for completed passive content", {
					assessmentId: context.activity.id,
					awardedCount: awardedResourceIds.length,
					totalBankedXp: bankedXp
				})
			}
		}
	}

	// 5. Update user's streak if they earned positive XP
	if (finalXp > 0) {
		const streakResult = await errors.try(updateStreak())
		if (streakResult.error) {
			logger.error("failed to update user streak after awarding xp", {
				userId: actor.id,
				finalXp,
				error: streakResult.error
			})
			throw errors.wrap(streakResult.error, "streak update")
		}
	}

	// 6. NOW safe to send Caliper event with final, confirmed XP
	const metrics: TimebackActivityMetric[] = [
		{ type: "xpEarned", value: finalXp },
		{ type: "totalQuestions", value: performance.totalQuestions },
		{ type: "correctQuestions", value: performance.correctQuestions }
	]

	// Add masteredUnits metric if provided
	if (performance.masteredUnits !== undefined) {
		metrics.push({ type: "masteredUnits", value: performance.masteredUnits })
	}

	const event: TimebackActivityCompletedEvent = {
		"@context": "http://purl.imsglobal.org/ctx/caliper/v1p2",
		id: randomUUID(),
		type: "ActivityEvent",
		profile: "TimebackProfile",
		action: "Completed",
		actor,
		object: context,
		eventTime: new Date().toISOString(),
		generated: {
			id: `urn:uuid:${randomUUID()}`,
			type: "TimebackActivityMetricsCollection",
			items: metrics
		}
	}

	const envelope: CaliperEnvelope = {
		sensor: SENSOR_ID,
		sendTime: new Date().toISOString(),
		dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p2",
		data: [event]
	}

	const result = await errors.try(caliper.sendCaliperEvents(envelope))
	if (result.error) {
		// Log the error for observability but do not re-throw to the client.
		// Event tracking is a background task and should not block the UI.
		logger.error("failed to send caliper activity event", { error: result.error })
	}
}

/**
 * Sends a TimebackTimeSpentEvent to track time on activities like videos.
 *
 * @param actor - The user who performed the action.
 * @param context - The activity context (course, lesson, etc.).
 * @param durationInSeconds - The duration of the time spent.
 */
export async function sendCaliperTimeSpentEvent(
	actor: TimebackTimeSpentEvent["actor"],
	context: TimebackActivityContext,
	durationInSeconds: number
) {
	logger.info("sending caliper time spent event", { actorId: actor.id, activityId: context.id, durationInSeconds })

	// Convert plain OneRoster resource ID to proper URI format for Caliper API compliance
	// This matches the logic in sendCaliperActivityCompletedEvent to ensure consistency
	if (context.activity?.id && !context.activity.id.startsWith("http")) {
		const onerosterBaseUrl = env.TIMEBACK_ONEROSTER_SERVER_URL || "https://api.alpha-1edtech.com"
		const originalId = context.activity.id
		context.activity.id = `${onerosterBaseUrl}/ims/oneroster/rostering/v1p2/resources/${context.activity.id}`
		logger.debug("converted plain resource ID to OneRoster URI for time spent event", {
			originalId,
			convertedUri: context.activity.id
		})
	}

	const now = new Date()
	const startDate = new Date(now.getTime() - durationInSeconds * 1000)

	const event: TimebackTimeSpentEvent = {
		"@context": "http://purl.imsglobal.org/ctx/caliper/v1p2",
		id: randomUUID(),
		type: "TimeSpentEvent",
		profile: "TimebackProfile",
		action: "SpentTime",
		actor,
		object: context,
		eventTime: now.toISOString(),
		generated: {
			id: `urn:uuid:${randomUUID()}`,
			type: "TimebackTimeSpentMetricsCollection",
			items: [
				{
					type: "active",
					value: durationInSeconds,
					startDate: startDate.toISOString(),
					endDate: now.toISOString()
				}
			]
		}
	}

	const envelope: CaliperEnvelope = {
		sensor: SENSOR_ID,
		sendTime: new Date().toISOString(),
		dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p2",
		data: [event]
	}

	const result = await errors.try(caliper.sendCaliperEvents(envelope))
	if (result.error) {
		logger.error("failed to send caliper time spent event", { error: result.error })
	}
}
