import { z } from "zod"

export const ENROLLMENT_CACHE_TTL_SECONDS = 4 * 60 * 60 // 4 hours
export const SYNC_LOCK_TTL_SECONDS = 60 // 60 seconds
export const ON_DEMAND_SYNC_RATE_LIMIT_SECONDS = 60 // 60 seconds

export const EnrollmentCacheSchema = z.object({
    enrolledCourseIds: z.array(z.string()),
    lastSyncAt: z.string().datetime(),
    lastSuccessAt: z.string().datetime().nullable(),
    failureCount: z.number().int().nonnegative()
})
export type EnrollmentCache = z.infer<typeof EnrollmentCacheSchema>

export function getEnrollmentCacheKey(userId: string): string {
    return `enrollments:v2:${userId}`
}

export function getSyncLockKey(userId: string): string {
    return `enrollments:v2:lock:${userId}`
}

export function getOnDemandRateLimitKey(userId: string): string {
    return `enrollments:v2:ratelimit:${userId}`
}


