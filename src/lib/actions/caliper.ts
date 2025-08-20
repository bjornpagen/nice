"use server"

import { randomUUID } from "node:crypto"
import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
// REMOVED: No longer needs streak, xp, or oneroster clients/utils.
import type {
	CaliperEnvelope,
	TimebackActivityCompletedEvent,
	TimebackActivityContext,
	TimebackActivityMetric,
	TimebackTimeSpentEvent
} from "@/lib/caliper"
// ADDED: Import the new Caliper utility functions.
import { extractResourceIdFromCompoundId, normalizeCaliperId } from "@/lib/caliper/utils"
import { caliper } from "@/lib/clients"
import { type NiceCaliperActor, type NiceCaliperContext, sendBankedXpAwardedEvent } from "@/lib/ports/analytics"
import { getCurrentUserSourcedId } from "@/lib/authorization"

const SENSOR_ID = env.NEXT_PUBLIC_APP_DOMAIN

/**
 * Sends a TimebackActivityEvent to track the completion of an activity.
 * This function is now a pure data-mapper and event sender. All XP calculation
 * and business logic has been moved to the XpService.
 *
 * @param actor - The user who performed the action.
 * @param context - The activity context (course, lesson, etc.).
 * @param performance - The performance data including total/correct questions.
 * @param finalXp - The FINAL, pre-calculated XP amount to be reported in the event.
 */
export async function sendCaliperActivityCompletedEvent(
	actor: TimebackActivityCompletedEvent["actor"],
	context: TimebackActivityContext,
	performance: {
		totalQuestions: number
		correctQuestions: number
		masteredUnits?: number
	},
	finalXp: number // CHANGED: Now accepts a final XP value.
) {
	const { userId } = await auth()
	if (!userId) {
		logger.error("sendCaliperActivityCompletedEvent failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const derivedUserId = await getCurrentUserSourcedId(userId)
	const providedActorId = actor?.id ?? ""
	const providedUserId = providedActorId.split("/").pop()
	if (providedUserId !== derivedUserId) {
		logger.error("caliper actor mismatch", { expectedUserId: derivedUserId, providedActorId })
		throw errors.new("caliper actor mismatch")
	}
	logger.info("sending caliper activity completed event", {
		actorId: actor.id,
		activityId: context.id,
		performance,
		finalXp
	})

	// Activity ID validation and normalization
	if (!context.activity?.id) {
		logger.error("CRITICAL: Missing activity ID in context", { contextId: context.id })
		throw errors.new("activity ID is required for Caliper event")
	}

	// Normalize IDs using the new utility functions
	let normalizedResourceId = extractResourceIdFromCompoundId(context.activity.id)
	context.activity.id = normalizeCaliperId(normalizedResourceId)

	// Construct the metrics payload for the Caliper event.
	const metrics: TimebackActivityMetric[] = [
		{ type: "xpEarned", value: finalXp },
		{ type: "totalQuestions", value: performance.totalQuestions },
		{ type: "correctQuestions", value: performance.correctQuestions }
	]

	if (performance.masteredUnits !== undefined) {
		metrics.push({ type: "masteredUnits", value: performance.masteredUnits })
	}

	// Construct the final Caliper event and envelope.
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

	// Send the event.
	const result = await errors.try(caliper.sendCaliperEvents(envelope))
	if (result.error) {
		// Log the error for observability but do not re-throw. Event tracking is
		// a background task and should not block the client UI.
		logger.error("failed to send caliper activity event", { error: result.error })
	}
}

/**
 * Sends a TimebackTimeSpentEvent to track time on activities like videos.
 * (This function is refactored to use the new Caliper utils for consistency).
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
	const { userId } = await auth()
	if (!userId) {
		logger.error("sendCaliperTimeSpentEvent failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const derivedUserId = await getCurrentUserSourcedId(userId)
	const providedActorId = actor?.id ?? ""
	const providedUserId = providedActorId.split("/").pop()
	if (providedUserId !== derivedUserId) {
		logger.error("caliper actor mismatch", { expectedUserId: derivedUserId, providedActorId })
		throw errors.new("caliper actor mismatch")
	}
	logger.info("sending caliper time spent event", { actorId: actor.id, activityId: context.id, durationInSeconds })

	// Use the new utility to normalize the activity ID.
	if (context.activity?.id) {
		context.activity.id = normalizeCaliperId(extractResourceIdFromCompoundId(context.activity.id))
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

// Fire-and-forget wrapper for banked XP awarded ActivityEvent
export async function sendCaliperBankedXpAwardedEvent(
	actor: NiceCaliperActor,
	context: NiceCaliperContext,
	awardedXp: number
) {
	const { userId } = await auth()
	if (!userId) {
		logger.error("sendCaliperBankedXpAwardedEvent failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const derivedUserId = await getCurrentUserSourcedId(userId)
	const providedActorId = actor?.id ?? ""
	const providedUserId = providedActorId.split("/").pop()
	if (providedUserId !== derivedUserId) {
		logger.error("caliper actor mismatch", { expectedUserId: derivedUserId, providedActorId })
		throw errors.new("caliper actor mismatch")
	}
	const correlationId = randomUUID()
	logger.info("sending caliper banked xp awarded event", {
		actorId: actor.id,
		activityId: context.activity?.id,
		awardedXp,
		correlationId
	})

	const result = await errors.try(
		sendBankedXpAwardedEvent({
			actor,
			context,
			awardedXp,
			correlationId
		})
	)
	if (result.error) {
		logger.error("failed to send caliper banked xp event", { error: result.error, correlationId })
	}
}
