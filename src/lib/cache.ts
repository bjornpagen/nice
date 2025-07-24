/**
 * Cache key utilities for deployment-aware caching
 */

/**
 * Creates cache keys that automatically invalidate on new deployments
 * Uses Vercel's deployment info to ensure cache clears on every commit
 */
export function createCacheKey(baseKey: string[]): string[] {
	const deploymentId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev"
	return [...baseKey, deploymentId]
}
