import { auth, clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { NextResponse } from "next/server"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
import { getActiveEnrollmentsForUser, getAllCoursesBySlug, getClass } from "@/lib/oneroster/redis/api"

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

    const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourcedId))
    if (enrollmentsResult.error) {
        logger.error("course access api: fetch active enrollments", { userSourcedId, error: enrollmentsResult.error })
        return NextResponse.json({ allowed: false }, { status: 500 })
    }
    const enrollments = enrollmentsResult.data
    if (enrollments.length === 0) {
        return NextResponse.json({ allowed: false })
    }

    const uniqueClassIds = [...new Set(enrollments.map((e) => e.class.sourcedId))]
    const classPromises = uniqueClassIds.map(async (classId) => {
        const clsResult = await errors.try(getClass(classId))
        if (clsResult.error) {
            logger.error("course access api: get class for enrollment", { classId, error: clsResult.error })
            return null
        }
        return clsResult.data
    })
    const classes = (await Promise.all(classPromises)).filter((c): c is NonNullable<typeof c> => c !== null)
    const isEnrolled = classes.some((c) => c?.course?.sourcedId === targetCourseId)

    return NextResponse.json({ allowed: isEnrolled })
}


