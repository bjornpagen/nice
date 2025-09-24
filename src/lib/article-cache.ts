import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { createCacheKey } from "@/lib/cache"
import { redis } from "@/lib/redis"

const ARTICLE_STATE_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

export const CaliperArticleReadStateSchema = z.object({
	cumulativeReadTimeSeconds: z.number().nonnegative(),
	reportedReadTimeSeconds: z.number().nonnegative(),
	canonicalDurationSeconds: z.number().positive().nullable(),
	lastServerSyncAt: z.string().datetime().nullable(),
	finalizedAt: z.string().datetime().nullable()
})

export type CaliperArticleReadState = z.infer<typeof CaliperArticleReadStateSchema>

function getCaliperArticleStateKey(userId: string, articleId: string): string {
	return createCacheKey(["caliper:article:state", userId, articleId])
}

export function getCaliperFinalizationLockKey(userId: string, articleId: string): string {
	return createCacheKey(["caliper:article:finalizing", userId, articleId])
}

export async function getCaliperArticleReadState(
	userId: string,
	articleId: string
): Promise<CaliperArticleReadState | null> {
	if (!redis) {
		logger.error("redis unavailable for article state")
		throw errors.new("persistence service unavailable")
	}
	const key = getCaliperArticleStateKey(userId, articleId)
	const getResult = await errors.try(redis.get(key))
	if (getResult.error) {
		logger.error("get caliper article state failed", { error: getResult.error, key })
		throw errors.wrap(getResult.error, "get caliper article state")
	}
	if (!getResult.data) {
		return null
	}
	const dataRaw = getResult.data
	const parseResult = errors.trySync(() => (typeof dataRaw === "string" ? JSON.parse(dataRaw) : dataRaw))
	if (parseResult.error) {
		logger.error("parse caliper article state failed", { error: parseResult.error, key })
		throw errors.wrap(parseResult.error, "parse caliper article state")
	}
	const validation = CaliperArticleReadStateSchema.safeParse(parseResult.data)
	if (!validation.success) {
		logger.error("validate caliper article state failed", { error: validation.error, key })
		throw errors.wrap(validation.error, "validate caliper article state")
	}
	const state = validation.data
	const expireResult = await errors.try(redis.expire(key, ARTICLE_STATE_TTL_SECONDS))
	if (expireResult.error) {
		logger.error("redis expire failed for article state", { error: expireResult.error, key })
		throw errors.wrap(expireResult.error, "redis expire caliper article state")
	}
	return state
}

export async function setCaliperArticleReadState(
	userId: string,
	articleId: string,
	state: CaliperArticleReadState
): Promise<void> {
	if (!redis) {
		logger.error("redis unavailable for article state set")
		throw errors.new("persistence service unavailable")
	}
	const key = getCaliperArticleStateKey(userId, articleId)
	const validation = CaliperArticleReadStateSchema.safeParse(state)
	if (!validation.success) {
		logger.error("invalid caliper article state input", { error: validation.error })
		throw errors.wrap(validation.error, "invalid caliper article state")
	}
	const setResult = await errors.try(
		redis.set(key, JSON.stringify(validation.data), { EX: ARTICLE_STATE_TTL_SECONDS })
	)
	if (setResult.error) {
		logger.error("set caliper article state failed", { error: setResult.error, key })
		throw errors.wrap(setResult.error, "set caliper article state")
	}
}
