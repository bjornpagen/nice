import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { getActiveEnrollmentsForUser, getClass } from "@/lib/oneroster/redis/api"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"

/**
 * Gets the OneRoster sourcedId for the currently authenticated user.
 * This is the unified way to get user sourcedId from Clerk session.
 *
 * @param clerkId The Clerk user ID to resolve to a OneRoster sourcedId
 * @returns The user's OneRoster sourcedId
 * @throws Error if clerkId is missing or the user is not synced with OneRoster
 */
export async function getCurrentUserSourcedId(clerkId: string): Promise<string> {
	if (!clerkId) {
		logger.error("clerkId is required to get user sourcedId")
		throw errors.new("clerkId is required")
	}

	const clerk = await clerkClient()
	const user = await clerk.users.getUser(clerkId)
	const metadata = parseUserPublicMetadata(user.publicMetadata)
	const onerosterUserSourcedId = metadata.sourceId

	if (!onerosterUserSourcedId) {
		logger.error("user not synced with OneRoster", { clerkId })
		throw errors.new("user not synced with OneRoster")
	}

	return onerosterUserSourcedId
}

async function getCourseIdForQuestion(questionId: string): Promise<string | null> {
	const result = await errors.try(
		db
			.select({ courseId: schema.niceCourses.id })
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
			.innerJoin(schema.niceCourses, eq(schema.niceUnits.courseId, schema.niceCourses.id))
			.where(and(eq(schema.niceQuestions.id, questionId), eq(schema.niceLessonContents.contentType, "Exercise")))
			.limit(1)
	)

	if (result.error) {
		logger.error("failed to get course for question", { questionId, error: result.error })
		throw errors.wrap(result.error, "get course for question")
	}

	return result.data[0]?.courseId ?? null
}

export async function isUserAuthorizedForQuestion(userSourcedId: string, questionId: string): Promise<boolean> {
	logger.debug("checking user authorization for question", { userSourcedId, questionId })

	// Step 1: Find the course the question belongs to.
	const courseId = await getCourseIdForQuestion(questionId)
	if (!courseId) {
		logger.warn("could not find course for question, denying authorization", { questionId })
		return false
	}

	const onerosterCourseSourcedId = `nice_${courseId}`

	// Step 2: Get the user's enrolled courses.
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourcedId))
	if (enrollmentsResult.error) {
		logger.error("failed to get user enrollments for auth check", { userSourcedId, error: enrollmentsResult.error })
		throw errors.wrap(enrollmentsResult.error, "get user enrollments for auth check")
	}

	const enrollments = enrollmentsResult.data
	if (enrollments.length === 0) {
		logger.debug("user has no active enrollments, denying authorization", { userSourcedId })
		return false
	}

	const uniqueClassIds = [...new Set(enrollments.map((e) => e.class.sourcedId))]

	// Step 3: Check if any of the user's enrolled classes belong to the target course.
	const classPromises = uniqueClassIds.map(async (classId) => {
		const classResult = await errors.try(getClass(classId))
		if (classResult.error) {
			logger.error("failed to get class details for auth check", { classId, error: classResult.error })
			return null // Skip this class on error
		}
		return classResult.data
	})

	const classes = (await Promise.all(classPromises)).filter((c): c is NonNullable<typeof c> => c !== null)

	const isEnrolled = classes.some((c) => c.course.sourcedId === onerosterCourseSourcedId)

	logger.info("user authorization check complete", {
		userSourcedId,
		questionId,
		targetCourseId: onerosterCourseSourcedId,
		isEnrolled
	})

	return isEnrolled
}
