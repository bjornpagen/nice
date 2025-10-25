import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env.js"
import { redis } from "@/lib/redis"

// Cache stampede protection: track keys currently being fetched
const keysBeingFetched = new Set<string>()

/**
 * A replacement for Next.js's unstable_cache that uses Redis.
 * It serializes the result of the given callback and stores it in Redis.
 * On subsequent calls with the same key, it retrieves the data from the cache.
 *
 * Features:
 * - Simple stampede protection (logs concurrent requests)
 * - Graceful degradation when Redis is unavailable
 * - Type-safe generic implementation
 * - Automatic deployment-based cache invalidation
 *
 * @param callback The async function to execute to get the data on a cache miss.
 * @param keyParts An array of strings and numbers to form the cache key.
 * @param options Configuration for caching, including TTL in seconds.
 * @returns The result of the callback, either from cache or freshly executed.
 */
export async function redisCache<T>(
	callback: () => Promise<T>,
	keyParts: (string | number)[],
	options: { revalidate: number | false }
): Promise<T> {
	const key = createCacheKey(keyParts)

	// Handle infinite cache (revalidate: false)
	const ttlSeconds = options.revalidate === false ? undefined : options.revalidate

	// Quick return if Redis is not available
	if (!redis || !redis.isReady) {
		logger.warn("redis not available, executing callback without caching", { keyParts })
		return callback()
	}

	// Check if this key is already being fetched (potential stampede)
	if (keysBeingFetched.has(key)) {
		logger.warn("concurrent request for same cache key detected", { key })
		// In a production system, you might want to implement proper request coalescing
		// For now, we'll just log and continue
	}

	// 1. Try to get the value from the cache
	const getResult = await errors.try(redis.get(key))
	if (getResult.error) {
		logger.error("failed to get value from redis", { key, error: getResult.error })
		// Fallback: execute the callback directly if Redis fails
		return executeCallback()
	}

	const cachedValue = getResult.data
	if (cachedValue) {
		logger.debug("cache hit", { key })
		// Parse the cached JSON string and handle it as the expected type
		const parseResult = errors.trySync<T>(() => JSON.parse(cachedValue))
		if (parseResult.error) {
			logger.error("failed to parse cached json", { key, error: parseResult.error })
			// Cache corruption - delete the bad entry and fetch fresh
			const delResult = await errors.try(redis.del(key))
			if (delResult.error) {
				logger.error("failed to delete corrupted cache entry", { key, error: delResult.error })
			}
			return executeCallback()
		}
		// The generic type parameter ensures parseResult.data is of type T
		return parseResult.data
	}

	// 2. Cache miss - execute callback
	return executeCallback()

	async function executeCallback(): Promise<T> {
		logger.info("cache miss", { key })

		// Mark this key as being fetched
		keysBeingFetched.add(key)

		const callbackResult = await errors.try(callback())

		// Always clean up tracking
		keysBeingFetched.delete(key)

		if (callbackResult.error) {
			logger.error("callback failed in cache", { error: callbackResult.error, key })
			throw callbackResult.error
		}

		const result = callbackResult.data

		// 3. Store the new value in the cache (fire-and-forget)
		// Check redis availability again since this is async
		if (redis?.isReady) {
			const stringifiedResult = JSON.stringify(result)
			const setOptions = ttlSeconds !== undefined ? { EX: ttlSeconds } : {}

			const setResult = await errors.try(redis.set(key, stringifiedResult, setOptions))
			if (setResult.error) {
				// Log the error but don't throw; the app can continue with the fresh data
				logger.error("failed to set value in redis", { key, error: setResult.error })
			}
		}

		return result
	}
}

/**
 * Invalidates one or more cache entries by deleting them from Redis.
 * Used in server actions when data is mutated.
 *
 * @param keys An array of cache keys to invalidate
 */
export async function invalidateCache(keys: string[]): Promise<void> {
	// Snapshot and narrow redis client locally to avoid non-null assertions
	const clientRef = redis
	if (!clientRef || !clientRef.isReady) {
		logger.warn("redis not available for cache invalidation", { keys })
		return
	}

	if (keys.length === 0) return

	// Delete keys; when multiple, delete sequentially and sum results to avoid type issues
	const client = clientRef
	let deleted = 0
	if (keys.length === 1) {
		const singleKey = keys[0]
		if (singleKey === undefined) {
			logger.warn("invalidateCache called with an array containing an undefined key")
			return
		}
		const result = await errors.try(client.del(singleKey))
		if (result.error) {
			logger.error("failed to invalidate cache", { keys, error: result.error })
			return
		}
		deleted = result.data ?? 0
	} else {
		const results = await Promise.all(keys.map((k) => errors.try(client.del(k))))
		for (const r of results) {
			if (r.error) {
				logger.error("failed to invalidate cache (partial)", { error: r.error })
				continue
			}
			deleted += r.data ?? 0
		}
	}

	logger.info("cache invalidated", { keys, deleted })
}

/**
 * Creates a base key array with deployment info.
 * This ensures caches are automatically invalidated on new deployments.
 */
function createBaseKey(base: (string | number)[]): string[] {
	// Sanitize inputs to prevent injection attacks
	const sanitized = base.map((part) => String(part).replace(/[:\s]/g, "_"))

	const parts = [...sanitized]
	if (env.VERCEL_DEPLOYMENT_ID) {
		parts.push(env.VERCEL_DEPLOYMENT_ID)
	}
	return parts
}

/**
 * Creates a Redis-compatible cache key from parts.
 * Keys are namespaced by deployment ID when available.
 */
export function createCacheKey(baseKey: (string | number)[]): string {
	return createBaseKey(baseKey).join(":")
}

/**
 * Generates a cache key for user progress data.
 * Pattern: "user-progress:{userId}:{courseId}:{deploymentId}"
 */
export const userProgressByCourse = (userId: string, onerosterCourseSourcedId: string): string => {
	const base = ["user-progress", userId, onerosterCourseSourcedId]
	return createCacheKey(base)
}

// Future cache key generators can be added here following the same pattern
