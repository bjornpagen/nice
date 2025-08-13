import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import type { TimebackActivityContext, TimebackUser } from "@/lib/caliper"
import { CaliperEnvelopeSchema } from "@/lib/caliper"
import { extractResourceIdFromCompoundId, normalizeCaliperId } from "@/lib/caliper/utils"
import { caliper } from "@/lib/clients"

const SENSOR_ID = env.NEXT_PUBLIC_APP_DOMAIN
const CALIPER_CONTEXT_URL = "http://purl.imsglobal.org/ctx/caliper/v1p2" as const

export async function sendActivityCompletedEvent(options: {
	actor: TimebackUser
	context: TimebackActivityContext
	performance: { totalQuestions: number; correctQuestions: number; masteredUnits: number }
	finalXp: number
	durationInSeconds?: number
	correlationId: string
	idempotencyKey?: string
}): Promise<void> {
	logger.info("sending activity completed event via analytics port", {
		actorId: options.actor.id,
		activityId: options.context.id,
		performance: options.performance,
		finalXp: options.finalXp,
		correlationId: options.correlationId
	})

	// Activity ID validation and normalization
	if (!options.context.activity?.id) {
		logger.error("CRITICAL: Missing activity ID in context", {
			contextId: options.context.id,
			correlationId: options.correlationId
		})
		throw errors.new("activity ID is required for Caliper event")
	}

	// Normalize IDs using the utility functions
	const normalizedResourceId = extractResourceIdFromCompoundId(options.context.activity.id)
	options.context.activity.id = normalizeCaliperId(normalizedResourceId)

	// Construct the metrics payload for the Caliper event
	const metrics: Array<{
		type: "xpEarned" | "totalQuestions" | "correctQuestions" | "masteredUnits"
		value: number
	}> = [
		{ type: "xpEarned", value: options.finalXp },
		{ type: "totalQuestions", value: options.performance.totalQuestions },
		{ type: "correctQuestions", value: options.performance.correctQuestions },
		{ type: "masteredUnits", value: options.performance.masteredUnits }
	]

	// Construct the final Caliper event and envelope
	let eventId: string
	if (options.idempotencyKey && options.idempotencyKey.trim() !== "") {
		eventId = options.idempotencyKey
	} else {
		eventId = randomUUID()
	}

	const event = {
		"@context": CALIPER_CONTEXT_URL,
		id: eventId,
		type: "ActivityEvent" as const,
		profile: "TimebackProfile" as const,
		action: "Completed" as const,
		actor: options.actor,
		object: options.context,
		eventTime: new Date().toISOString(),
		generated: {
			id: `urn:uuid:${randomUUID()}`,
			type: "TimebackActivityMetricsCollection" as const,
			items: metrics
		}
	}

	const envelope = {
		sensor: SENSOR_ID,
		sendTime: new Date().toISOString(),
		dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p2" as const,
		data: [event]
	}

	// Validate envelope before sending
	const validationResult = CaliperEnvelopeSchema.safeParse(envelope)
	if (!validationResult.success) {
		logger.error("failed to validate caliper envelope", {
			error: validationResult.error,
			correlationId: options.correlationId
		})
		throw errors.new("invalid caliper envelope structure")
	}

	// Send the event
	const result = await errors.try(caliper.sendCaliperEvents(envelope))
	if (result.error) {
		// Log the error for observability but do not re-throw
		// Event tracking is a background task and should not block the client UI
		logger.error("failed to send caliper activity event", {
			error: result.error,
			correlationId: options.correlationId
		})
	}
}

export async function sendTimeSpentEvent(options: {
	actor: TimebackUser
	context: TimebackActivityContext
	durationInSeconds: number
	correlationId: string
}): Promise<void> {
	// Normalize activity id if present to maintain legacy payloads
	if (options.context.activity?.id) {
		const normalizedResourceId = extractResourceIdFromCompoundId(options.context.activity.id)
		options.context.activity.id = normalizeCaliperId(normalizedResourceId)
	}

	const now = new Date()
	const startDate = new Date(now.getTime() - options.durationInSeconds * 1000)

	const event = {
		"@context": CALIPER_CONTEXT_URL,
		id: randomUUID(),
		type: "TimeSpentEvent" as const,
		profile: "TimebackProfile" as const,
		action: "SpentTime" as const,
		actor: options.actor,
		object: options.context,
		eventTime: now.toISOString(),
		generated: {
			id: `urn:uuid:${randomUUID()}`,
			type: "TimebackTimeSpentMetricsCollection" as const,
			items: [
				{
					type: "active" as const,
					value: options.durationInSeconds,
					startDate: startDate.toISOString(),
					endDate: now.toISOString()
				}
			]
		}
	}

	const envelope = {
		sensor: SENSOR_ID,
		sendTime: new Date().toISOString(),
		dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p2" as const,
		data: [event]
	}

	const validationResult = CaliperEnvelopeSchema.safeParse(envelope)
	if (!validationResult.success) {
		// Log but throw to match strict validation path of legacy sender
		// The caller may choose to ignore this failure as best-effort
		throw errors.new("invalid caliper envelope structure")
	}

	const result = await errors.try(caliper.sendCaliperEvents(envelope))
	if (result.error) {
		// Background task: log only
		logger.error("failed to send caliper time spent event", {
			error: result.error,
			correlationId: options.correlationId
		})
	}
}
