"use server"

import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type {
	CaliperEnvelope,
	TimebackActivityCompletedEvent,
	TimebackActivityContext,
	TimebackActivityMetric,
	TimebackTimeSpentEvent
} from "@/lib/caliper"
import { caliper } from "@/lib/clients"

const SENSOR_ID = "https://alpharead.alpha.school" // Replace with actual app identifier

/**
 * Sends a TimebackActivityEvent to track the completion of an activity.
 *
 * @param actor - The user who performed the action.
 * @param context - The activity context (course, lesson, etc.).
 * @param metrics - The performance metrics for the activity.
 */
export async function sendCaliperActivityCompletedEvent(
	actor: TimebackActivityCompletedEvent["actor"],
	context: TimebackActivityContext,
	metrics: TimebackActivityMetric[]
) {
	logger.info("sending caliper activity completed event", { actorId: actor.id, activityId: context.id })

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
