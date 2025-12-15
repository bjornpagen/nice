/**
 * Assessment Time State Cache
 *
 * Provides Redis-backed storage for incremental assessment time tracking.
 * Mirrors the video time tracking pattern from video-cache.ts.
 *
 * The time state is stored separately from the main AssessmentState to:
 * 1. Match the video tracking pattern exactly
 * 2. Enable efficient 3s heartbeat syncs (only 2 small fields)
 * 3. Avoid schema migration for existing assessments
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { createCacheKey } from "@/lib/cache"
import { redis } from "@/lib/redis"

const ASSESSMENT_TIME_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days (matches assessment state TTL)

export const AssessmentTimeStateSchema = z.object({
	cumulativeActiveSeconds: z.number().nonnegative(),
	lastServerSyncAt: z.string().datetime().nullable()
})

export type AssessmentTimeState = z.infer<typeof AssessmentTimeStateSchema>

function getTimeStateKey(userId: string, assessmentId: string, attemptNumber: number): string {
	return createCacheKey(["assess:time", userId, assessmentId, String(attemptNumber)])
}

/**
 * Retrieves the current time tracking state for an assessment attempt.
 *
 * @param userId - The OneRoster user sourcedId
 * @param assessmentId - The OneRoster resource sourcedId for the assessment
 * @param attemptNumber - The attempt number (1-based)
 * @returns The time state if it exists, null otherwise
 */
export async function getAssessmentTimeState(
	userId: string,
	assessmentId: string,
	attemptNumber: number
): Promise<AssessmentTimeState | null> {
	if (!redis) {
		logger.error("redis unavailable for assessment time state")
		throw errors.new("persistence service unavailable")
	}

	const key = getTimeStateKey(userId, assessmentId, attemptNumber)
	const getResult = await errors.try(redis.get(key))
	if (getResult.error) {
		logger.error("get assessment time state", { error: getResult.error, key })
		throw errors.wrap(getResult.error, "get assessment time state")
	}

	if (!getResult.data) {
		return null
	}

	const dataRaw = getResult.data
	const parseResult = errors.trySync(() => (typeof dataRaw === "string" ? JSON.parse(dataRaw) : dataRaw))
	if (parseResult.error) {
		logger.error("parse assessment time state", { error: parseResult.error, key })
		throw errors.wrap(parseResult.error, "parse assessment time state")
	}

	const validation = AssessmentTimeStateSchema.safeParse(parseResult.data)
	if (!validation.success) {
		logger.error("validate assessment time state", { error: validation.error, key })
		throw errors.wrap(validation.error, "validate assessment time state")
	}

	// Refresh TTL on read
	const expireResult = await errors.try(redis.expire(key, ASSESSMENT_TIME_TTL_SECONDS))
	if (expireResult.error) {
		logger.error("redis expire", { error: expireResult.error, key })
		throw errors.wrap(expireResult.error, "redis expire assessment time state")
	}

	return validation.data
}

/**
 * Stores the time tracking state for an assessment attempt.
 *
 * @param userId - The OneRoster user sourcedId
 * @param assessmentId - The OneRoster resource sourcedId for the assessment
 * @param attemptNumber - The attempt number (1-based)
 * @param state - The time state to store
 */
export async function setAssessmentTimeState(
	userId: string,
	assessmentId: string,
	attemptNumber: number,
	state: AssessmentTimeState
): Promise<void> {
	if (!redis) {
		logger.error("redis unavailable for assessment time state set")
		throw errors.new("persistence service unavailable")
	}

	const key = getTimeStateKey(userId, assessmentId, attemptNumber)

	const validation = AssessmentTimeStateSchema.safeParse(state)
	if (!validation.success) {
		logger.error("invalid assessment time state input", { error: validation.error })
		throw errors.wrap(validation.error, "invalid assessment time state")
	}

	const setResult = await errors.try(
		redis.set(key, JSON.stringify(validation.data), { EX: ASSESSMENT_TIME_TTL_SECONDS })
	)
	if (setResult.error) {
		logger.error("set assessment time state", { error: setResult.error, key })
		throw errors.wrap(setResult.error, "set assessment time state")
	}
}

