import { invalidateCache, userProgressByCourse } from "@/lib/cache"

/**
 * Service layer wrapper for cache operations.
 * This provides a clean interface for services to interact with the cache
 * without direct dependency on the cache module implementation.
 */

/**
 * Invalidates the user progress cache for a specific course.
 * Called after any operation that modifies user progress (assessments, videos, articles).
 */
export async function invalidateUserCourseProgress(userSourcedId: string, courseSourcedId: string): Promise<void> {
	const cacheKey = userProgressByCourse(userSourcedId, courseSourcedId)
	await invalidateCache([cacheKey])
}
