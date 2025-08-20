import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { createCacheKey } from "@/lib/cache"
import { redis } from "@/lib/redis"

const CALIPER_VIDEO_STATE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export const CaliperVideoWatchStateSchema = z.object({
	cumulativeWatchTimeSeconds: z.number().nonnegative(),
	lastKnownPositionSeconds: z.number().nonnegative(),
	canonicalDurationSeconds: z.number().positive().nullable(),
	finalizedAt: z.string().datetime().nullable(),
	lastServerSyncAt: z.string().datetime().nullable()
})

type CaliperVideoWatchState = z.infer<typeof CaliperVideoWatchStateSchema>

function getCaliperVideoStateKey(userId: string, videoId: string): string {
	return createCacheKey(["caliper:video:state", userId, videoId])
}

export function getCaliperFinalizationLockKey(userId: string, videoId: string): string {
	return createCacheKey(["caliper:video:finalizing", userId, videoId])
}

export async function getCaliperVideoWatchState(
	userId: string,
	videoId: string
): Promise<CaliperVideoWatchState | null> {
	if (!redis) {
		logger.error("redis unavailable for caliper video state")
		throw errors.new("persistence service unavailable")
	}
	const key = getCaliperVideoStateKey(userId, videoId)
	const getResult = await errors.try(redis.get(key))
	if (getResult.error) {
		logger.error("get caliper video state", { error: getResult.error, key })
		throw errors.wrap(getResult.error, "get caliper video state")
	}
	if (!getResult.data) {
		return null
	}
	const dataRaw = getResult.data
	const parseResult = errors.trySync(() => (typeof dataRaw === "string" ? JSON.parse(dataRaw) : dataRaw))
	if (parseResult.error) {
		logger.error("parse caliper video state", { error: parseResult.error, key })
		throw errors.wrap(parseResult.error, "parse caliper video state")
	}
	const validation = CaliperVideoWatchStateSchema.safeParse(parseResult.data)
	if (!validation.success) {
		logger.error("validate caliper video state", { error: validation.error, key })
		throw errors.wrap(validation.error, "validate caliper video state")
	}
	const expireResult = await errors.try(redis.expire(key, CALIPER_VIDEO_STATE_TTL_SECONDS))
	if (expireResult.error) {
		logger.error("redis expire", { error: expireResult.error, key })
		throw errors.wrap(expireResult.error, "redis expire caliper video state")
	}
	return validation.data
}

export async function setCaliperVideoWatchState(
	userId: string,
	videoId: string,
	state: CaliperVideoWatchState
): Promise<void> {
	if (!redis) {
		logger.error("redis unavailable for caliper video state set")
		throw errors.new("persistence service unavailable")
	}
	const key = getCaliperVideoStateKey(userId, videoId)
	const validation = CaliperVideoWatchStateSchema.safeParse(state)
	if (!validation.success) {
		logger.error("invalid caliper video state input", { error: validation.error })
		throw errors.wrap(validation.error, "invalid caliper video state")
	}
	const setResult = await errors.try(
		redis.set(key, JSON.stringify(validation.data), { EX: CALIPER_VIDEO_STATE_TTL_SECONDS })
	)
	if (setResult.error) {
		logger.error("set caliper video state", { error: setResult.error, key })
		throw errors.wrap(setResult.error, "set caliper video state")
	}
}
