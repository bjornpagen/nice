import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { NextResponse } from "next/server"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
import { getAllCoursesBySlug } from "@/lib/oneroster/redis/api"
import { redis } from "@/lib/redis"
import { triggerUserEnrollmentSync } from "@/lib/actions/user-sync"
import { EnrollmentCacheSchema, getEnrollmentCacheKey } from "@/lib/cache/enrollment-cache"

export const runtime = "nodejs"

export async function GET(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const subject = url.searchParams.get("subject") || ""
    const courseSlug = url.searchParams.get("course") || ""

    if (!subject || !courseSlug) {
        logger.warn("course access api: missing subject or course")
        return NextResponse.json({ allowed: false }, { status: 400 })
    }

    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ allowed: false }, { status: 401 })
    }

    const clerk = await clerkClient()
    const userResult = await errors.try(clerk.users.getUser(userId))
    if (userResult.error) {
        logger.error("course access api: user lookup", { userId, error: userResult.error })
        return NextResponse.json({ allowed: false }, { status: 500 })
    }
    const user = userResult.data

    const metadata = parseUserPublicMetadata(user.publicMetadata)
    const hasNonStudentRole = metadata.roles.some((r) => (r.role ?? "").toLowerCase() !== "student")
    if (hasNonStudentRole) {
        return NextResponse.json({ allowed: true })
    }

    const userSourcedId = metadata.sourceId
    if (!userSourcedId) {
        return NextResponse.json({ allowed: false })
    }

    const courseResult = await errors.try(getAllCoursesBySlug(courseSlug))
    if (courseResult.error) {
        logger.error("course access api: resolve course by slug", { courseSlug, error: courseResult.error })
        return NextResponse.json({ allowed: false }, { status: 500 })
    }
    const courseRecord = courseResult.data.find((c) => {
        const parsed = CourseMetadataSchema.safeParse(c.metadata)
        return parsed.success && parsed.data.khanSubjectSlug === subject
    })
    if (!courseRecord) {
        return NextResponse.json({ allowed: false }, { status: 404 })
    }
    const targetCourseId = courseRecord.sourcedId

    // --- Redis-backed enrollment cache (PRD) ---
    const cacheKey = getEnrollmentCacheKey(userId)
    const cachedResult = await errors.try(redis.get(cacheKey))
    if (cachedResult.error) {
        logger.error("course access api: redis read", { userId, error: cachedResult.error })
        return NextResponse.json({ allowed: false }, { status: 503 })
    }

    if (cachedResult.data === null) {
        logger.warn("course access api: enrollment cache miss", { userId })
        void triggerUserEnrollmentSync()
        return NextResponse.json({ allowed: false })
    }

    const parsedJsonResult = errors.trySync(() => JSON.parse(cachedResult.data as string))
    if (parsedJsonResult.error) {
        logger.error("course access api: parse cache json", { userId, error: parsedJsonResult.error })
        return NextResponse.json({ allowed: false }, { status: 500 })
    }

    const parsedCache = EnrollmentCacheSchema.safeParse(parsedJsonResult.data)
    if (!parsedCache.success) {
        logger.error("course access api: invalid cache schema", { userId, error: parsedCache.error })
        return NextResponse.json({ allowed: false }, { status: 500 })
    }

    const cacheAgeMs = Date.now() - new Date(parsedCache.data.lastSyncAt).getTime()
    const isEnrolled = parsedCache.data.enrolledCourseIds.includes(targetCourseId)

    return NextResponse.json({ allowed: isEnrolled, cacheHit: true, cacheAgeMs, failureCount: parsedCache.data.failureCount })
}


