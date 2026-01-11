import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, isNull } from "drizzle-orm"
import { inngest } from "@/inngest/client"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { oneroster } from "@/lib/clients"
import { SCIENCE_COURSE_SEQUENCE } from "@/lib/constants/course-mapping"
import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"
import { getActiveEnrollmentsForUser, getClass, getClassesForSchool } from "@/lib/oneroster/redis/api"
import { createCacheKey, invalidateCache } from "@/lib/cache"

const ONEROSTER_ORG_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"

/**
 * Check if a progression notification was already sent (deduplication)
 */
async function wasNotificationSent(
    userId: string,
    fromCourseId: string,
    toCourseId: string | null,
    notificationType: "enrollment" | "completion"
): Promise<boolean> {
    const conditions = [
        eq(schema.niceSentProgressionNotifications.userId, userId),
        eq(schema.niceSentProgressionNotifications.fromCourseId, fromCourseId),
        eq(schema.niceSentProgressionNotifications.notificationType, notificationType)
    ]

    if (toCourseId === null) {
        conditions.push(isNull(schema.niceSentProgressionNotifications.toCourseId))
    } else {
        conditions.push(eq(schema.niceSentProgressionNotifications.toCourseId, toCourseId))
    }

    const existing = await db
        .select({ id: schema.niceSentProgressionNotifications.id })
        .from(schema.niceSentProgressionNotifications)
        .where(and(...conditions))
        .limit(1)

    return existing.length > 0
}

/**
 * Record that a notification was sent (for deduplication)
 */
async function recordNotificationSent(
    userId: string,
    fromCourseId: string,
    toCourseId: string | null,
    notificationType: "enrollment" | "completion"
): Promise<void> {
    await db.insert(schema.niceSentProgressionNotifications).values({
        userId,
        fromCourseId,
        toCourseId,
        notificationType
    })
}

/**
 * Build canonical class map for course -> class resolution
 */
async function buildCanonicalClassMap(): Promise<Map<string, string>> {
    const classesResult = await errors.try(getClassesForSchool(ONEROSTER_ORG_ID))
    if (classesResult.error) {
        throw errors.wrap(classesResult.error, "failed to fetch classes for canonical mapping")
    }
    const classes = classesResult.data
    const byCourse = new Map<string, string>()
    const grouped = new Map<string, typeof classes>()

    for (const cls of classes) {
        const courseId = cls.course.sourcedId
        const arr = grouped.get(courseId)
        if (arr) arr.push(cls)
        else grouped.set(courseId, [cls])
    }

    for (const [courseId, group] of grouped.entries()) {
        const sorted = [...group].sort((a, b) => {
            const aCode = typeof a.classCode === "string" ? a.classCode : ""
            const bCode = typeof b.classCode === "string" ? b.classCode : ""
            const ac = aCode.localeCompare(bCode)
            if (ac !== 0) return ac
            const at = a.title.localeCompare(b.title)
            if (at !== 0) return at
            return a.sourcedId.localeCompare(b.sourcedId)
        })
        const canonical = sorted[0]
        if (canonical) {
            byCourse.set(courseId, canonical.sourcedId)
        }
    }
    return byCourse
}

/**
 * Get user's currently enrolled course IDs
 */
async function getEnrolledCourseIds(userSourceId: string): Promise<Set<string>> {
    const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourceId))
    if (enrollmentsResult.error) {
        throw errors.wrap(enrollmentsResult.error, "failed to fetch user enrollments")
    }

    const uniqueClassIds = [...new Set(enrollmentsResult.data.map((e) => e.class.sourcedId))]
    const enrolledCourseIds = new Set<string>()

    const classResults = await Promise.all(
        uniqueClassIds.map(async (classId) => {
            const clsResult = await errors.try(getClass(classId))
            if (clsResult.error) {
                logger.error("failed to fetch class details", { classId, error: clsResult.error })
                return null
            }
            return clsResult.data
        })
    )

    for (const cls of classResults) {
        if (cls && typeof cls.course?.sourcedId === "string" && cls.course.sourcedId.startsWith("nice_")) {
            enrolledCourseIds.add(cls.course.sourcedId)
        }
    }

    return enrolledCourseIds
}

/**
 * Enroll user in a course by courseId.
 * Returns true if enrollment was created, false if already enrolled.
 */
async function enrollUserInCourse(userSourceId: string, courseId: string): Promise<boolean> {
    // Pre-check: skip if already enrolled (prevents duplicate enrollment errors)
    const alreadyEnrolled = await getEnrolledCourseIds(userSourceId)
    if (alreadyEnrolled.has(courseId)) {
        logger.info("user already enrolled in course, skipping enrollment", { userSourceId, courseId })
        return false
    }

    const courseToClassMap = await buildCanonicalClassMap()
    const classId = courseToClassMap.get(courseId)

    if (!classId) {
        logger.error("canonical class not found for course", { courseId })
        throw errors.new("canonical class not found")
    }

    const enrollResult = await errors.try(
        oneroster.createEnrollment({
            status: "active",
            role: "student",
            user: { sourcedId: userSourceId, type: "user" },
            class: { sourcedId: classId, type: "class" }
        })
    )

    if (enrollResult.error) {
        throw errors.wrap(enrollResult.error, "failed to create enrollment")
    }

    // Invalidate caches
    const cacheKeysToInvalidate = [
        createCacheKey(["oneroster-getEnrollmentsForUser", userSourceId]),
        createCacheKey(["oneroster-getActiveEnrollmentsForUser", userSourceId])
    ]
    await invalidateCache(cacheKeysToInvalidate)

    return true
}

/**
 * Inngest function that handles course challenge completions and triggers progression.
 * This runs server-side, independent of the client, ensuring progression happens
 * even if the user closes their browser immediately after completing a course challenge.
 */
export const handleCourseChallengeCompletion = inngest.createFunction(
    { id: "handle-course-challenge-completion" },
    { event: "app/course-challenge.completed" },
    async ({ event, step }) => {
        const { userId, userSourceId, userEmail, userName, courseSourcedId, score } = event.data

        // Step 1: Check if score meets proficiency threshold
        if (score < XP_PROFICIENCY_THRESHOLD) {
            logger.info("course challenge score below threshold, skipping progression", {
                userId,
                courseSourcedId,
                score,
                threshold: XP_PROFICIENCY_THRESHOLD
            })
            return { skipped: true, reason: "score below threshold" }
        }

        // Step 2: Find the course in the progression sequence
        const currentIndex = SCIENCE_COURSE_SEQUENCE.findIndex((c) => c.courseId === courseSourcedId)
        if (currentIndex === -1) {
            logger.info("course not in science progression sequence, skipping", {
                userId,
                courseSourcedId
            })
            return { skipped: true, reason: "course not in progression sequence" }
        }

        const currentConfig = SCIENCE_COURSE_SEQUENCE[currentIndex]!
        const nextConfig = SCIENCE_COURSE_SEQUENCE[currentIndex + 1]

        // Step 3: Check if there's a next course to enroll in
        if (!nextConfig) {
            // This is a terminal course (or the last in sequence)
            if (currentConfig.terminal) {
                // Handle terminal course completion notification
                const alreadySent = await step.run("check-terminal-notification", async () => {
                    return await wasNotificationSent(userId, currentConfig.courseId, null, "completion")
                })

                if (!alreadySent) {
                    await step.run("send-terminal-notification", async () => {
                        const pipelinePosition = currentIndex + 1
                        await inngest.send({
                            name: "app/course.progression.completed",
                            data: {
                                userId,
                                userSourceId,
                                studentName: userName,
                                studentEmail: userEmail,
                                fromCourseId: currentConfig.courseId,
                                fromCourseTitle: currentConfig.title,
                                toCourseId: null,
                                toCourseTitle: null,
                                isTerminal: true,
                                pipelinePosition,
                                totalCourses: SCIENCE_COURSE_SEQUENCE.length,
                                timestamp: new Date().toISOString()
                            }
                        })
                        await recordNotificationSent(userId, currentConfig.courseId, null, "completion")
                    })
                    logger.info("terminal course completion notification sent", {
                        userId,
                        course: currentConfig.title
                    })
                }
            }
            return { skipped: false, reason: "terminal course completed", enrolled: false }
        }

        // Step 4: Check if user is already enrolled in next course
        const enrolledCourseIds = await step.run("get-enrolled-courses", async () => {
            const ids = await getEnrolledCourseIds(userSourceId)
            return Array.from(ids)
        })

        if (enrolledCourseIds.includes(nextConfig.courseId)) {
            logger.info("user already enrolled in next course, skipping enrollment", {
                userId,
                currentCourse: currentConfig.title,
                nextCourse: nextConfig.title
            })
            return { skipped: false, reason: "already enrolled in next course", enrolled: false }
        }

        // Step 5: Enroll user in next course
        await step.run("enroll-in-next-course", async () => {
            logger.info("enrolling user in next course via server-side progression", {
                userId,
                currentCourse: currentConfig.title,
                nextCourse: nextConfig.title
            })
            await enrollUserInCourse(userSourceId, nextConfig.courseId)
        })

        // Step 6: Send progression notification (with deduplication)
        const alreadySentEnrollment = await step.run("check-enrollment-notification", async () => {
            return await wasNotificationSent(userId, currentConfig.courseId, nextConfig.courseId, "enrollment")
        })

        if (!alreadySentEnrollment) {
            await step.run("send-enrollment-notification", async () => {
                const pipelinePosition = currentIndex + 2 // +2 because we're now in the next course
                await inngest.send({
                    name: "app/course.progression.completed",
                    data: {
                        userId,
                        userSourceId,
                        studentName: userName,
                        studentEmail: userEmail,
                        fromCourseId: currentConfig.courseId,
                        fromCourseTitle: currentConfig.title,
                        toCourseId: nextConfig.courseId,
                        toCourseTitle: nextConfig.title,
                        isTerminal: !!nextConfig.terminal,
                        pipelinePosition,
                        totalCourses: SCIENCE_COURSE_SEQUENCE.length,
                        timestamp: new Date().toISOString()
                    }
                })
                await recordNotificationSent(userId, currentConfig.courseId, nextConfig.courseId, "enrollment")
            })
            logger.info("progression notification sent", {
                userId,
                from: currentConfig.title,
                to: nextConfig.title
            })
        }

        return {
            skipped: false,
            enrolled: true,
            from: currentConfig.title,
            to: nextConfig.title
        }
    }
)
