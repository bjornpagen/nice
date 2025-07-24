"use server"

import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { awardBankedXpForAssessment } from "@/lib/actions/xp"
import type {
	CaliperEnvelope,
	TimebackActivityCompletedEvent,
	TimebackActivityContext,
	TimebackActivityMetric,
	TimebackTimeSpentEvent
} from "@/lib/caliper"
import { caliper, oneroster } from "@/lib/clients"
import { calculateAwardedXp, MASTERY_THRESHOLD } from "@/lib/xp"

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
 * @param performance - The performance data including expectedXp, totalQuestions, and correctQuestions.
 */
export async function sendCaliperActivityCompletedEvent(
	actor: TimebackActivityCompletedEvent["actor"],
	context: TimebackActivityContext,
	performance: {
		expectedXp: number
		totalQuestions: number
		correctQuestions: number
		durationInSeconds?: number
	}
) {
	logger.info("sending caliper activity completed event", {
		actorId: actor.id,
		activityId: context.id,
		performance
	})

	// Extract activity ID from context.activity.id or fall back to context.id
	let assessmentLineItemId = context.activity?.id || context.id.split("/").pop()
	if (!assessmentLineItemId) {
		logger.error("CRITICAL: Could not determine activity ID", {
			contextId: context.id,
			activityId: context.activity?.id
		})
		throw errors.new("activity ID is required for XP calculation")
	}

	// Handle compound componentResource IDs (format: nice:unitId:resourceId)
	// Assessment results are saved under resource ID, not componentResource ID
	const idParts = assessmentLineItemId.split(":")
	if (idParts.length === 3 && idParts[0] === "nice") {
		// This is a compound ID like nice:x310ffe65:x82a512f747dc1208
		// Extract just the resource ID: nice:x82a512f747dc1208
		assessmentLineItemId = `${idParts[0]}:${idParts[2]}`
		logger.debug("extracted resource id from compound id", {
			originalId: context.activity?.id || context.id.split("/").pop(),
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
	const currentResultsResult = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${assessmentLineItemId}'`
		})
	)

	if (currentResultsResult.error) {
		logger.error("failed to fetch current proficiency for xp check", {
			userSourcedId,
			assessmentLineItemId,
			error: currentResultsResult.error
		})
		// Fail safe: If we can't check current proficiency, award 0 XP to prevent exploitation.
		assessmentXp = 0
	} else {
		const currentResults = currentResultsResult.data
		let currentProficiency = 0 // Default to 0 if no previous attempts

		if (currentResults.length > 0) {
			// Get the most recent result to determine current proficiency
			const latestResult = currentResults.sort(
				(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
			)[0]

			if (latestResult && typeof latestResult.score === "number") {
				currentProficiency = latestResult.score
			}
		}

		if (currentProficiency >= MASTERY_THRESHOLD) {
			logger.info("xp farming prevented: user already proficient on this assessment", {
				userSourcedId,
				assessmentLineItemId,
				currentProficiency
			})
			assessmentXp = 0 // User already proficient, no new XP is awarded.
		} else {
			// Current proficiency is below mastery - calculate XP for this attempt
			if (performance.totalQuestions === 0) {
				logger.error("CRITICAL: Assessment has zero questions", {
					assessmentId: context.activity?.id,
					performance
				})
				throw errors.new("assessment must have at least one question")
			}
			const accuracy = performance.correctQuestions / performance.totalQuestions

			// Calculate XP for the assessment itself (including penalty check)
			assessmentXp = calculateAwardedXp(
				performance.expectedXp,
				accuracy,
				performance.totalQuestions,
				performance.durationInSeconds
			)

			logger.info("awarding xp for proficiency improvement", {
				userSourcedId,
				assessmentLineItemId,
				currentProficiency,
				newAccuracy: accuracy,
				awardedXp: assessmentXp
			})
		}
	}

	// Log if penalty was applied
	if (assessmentXp === -5) {
		logger.warn("insincere effort detected - penalty applied", {
			userId: actor.id,
			assessmentId: context.activity?.id,
			accuracy: performance.correctQuestions / performance.totalQuestions,
			totalQuestions: performance.totalQuestions,
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
	const isQuiz = activityType.includes("quiz")

	// 4. Process XP Bank if applicable (only if assessment XP > 0)
	if (
		isQuiz &&
		assessmentXp > 0 &&
		performance.correctQuestions / performance.totalQuestions >= MASTERY_THRESHOLD &&
		context.activity?.id
	) {
		const xpBankResult = await errors.try(awardBankedXpForAssessment(context.activity.id, actor.id))
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

	// 6. NOW safe to send Caliper event with final, confirmed XP
	const metrics: TimebackActivityMetric[] = [
		{ type: "xpEarned", value: finalXp },
		{ type: "totalQuestions", value: performance.totalQuestions },
		{ type: "correctQuestions", value: performance.correctQuestions }
	]

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
