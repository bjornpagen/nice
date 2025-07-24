import { env } from "@/env.js"

/**
 * Cache key utilities for deployment-aware caching
 */

/**
 * Creates cache keys that automatically invalidate on new deployments
 * Uses Vercel's deployment info to ensure cache clears on every commit
 */
export function createCacheKey(baseKey: string[]): string[] {
	// Include node env and deployment id (if available) in cache key
	const parts = [...baseKey, env.NODE_ENV]

	if (env.VERCEL_DEPLOYMENT_ID) {
		parts.push(env.VERCEL_DEPLOYMENT_ID)
	}

	return parts
}
