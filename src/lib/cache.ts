import { env } from "@/env.js"

/**
 * Creates a base key array that automatically invalidates on new deployments.
 * Uses Vercel's deployment info to ensure cache clears on every commit.
 * @param base - The base parts of the key (e.g., ["user-progress", userId]).
 * @returns An array of strings for use with unstable_cache.
 */
function createBaseKey(base: string[]): string[] {
	const parts = [...base, env.NODE_ENV]
	if (env.VERCEL_DEPLOYMENT_ID) {
		parts.push(env.VERCEL_DEPLOYMENT_ID)
	}
	return parts
}

/**
 * Legacy cache key function for backward compatibility.
 * @deprecated Use the new cache utility functions instead
 */
export function createCacheKey(baseKey: string[]): string[] {
	return createBaseKey(baseKey)
}

/**
 * Generates cache keys and tags for user progress within a specific course.
 * All keys and tags are in kebab-case.
 *
 * @param userId - The user's OneRoster sourcedId.
 * @param onerosterCourseSourcedId - The course's OneRoster sourcedId.
 * @returns An object containing `keyParts` for unstable_cache and a `tag` for revalidateTag.
 */
export function userProgressByCourse(userId: string, onerosterCourseSourcedId: string) {
	const base = ["user-progress", userId, onerosterCourseSourcedId]
	return {
		// Key parts for unstable_cache, including deployment-awareness
		keyParts: createBaseKey(base),
		// Tag for on-demand revalidation via revalidateTag
		tag: base.join("-")
	}
}

// Future cache key generators can be added here as exported functions.
