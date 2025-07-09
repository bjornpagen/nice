"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { OneRosterApiClient } from "@/lib/oneroster"

const getCourseForEnrollmentQuery = db
	.select({
		id: schema.niceCourses.id,
		slug: schema.niceCourses.slug,
		title: schema.niceCourses.title,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.id, sql.placeholder("courseId")))
	.limit(1)
	.prepare("src_lib_actions_enrollments_get_course_for_enrollment")

const ORG_SOURCED_ID = "nice-academy"
const ACADEMIC_SESSION_SOURCED_ID = "nice-academy-perpetual-year"

export async function enrollUserInCourse(courseId: string) {
	logger.info("enrollment action started", { courseId })

	// 1. Authenticate the user
	const authResult = await errors.try(auth())
	if (authResult.error) {
		logger.error("enrollment authentication failed", { error: authResult.error })
		throw errors.wrap(authResult.error, "authentication")
	}
	const { userId } = authResult.data
	if (!userId) {
		throw errors.new("user not authenticated for enrollment")
	}

	// 2. Fetch course details from our database
	const courseResult = await errors.try(getCourseForEnrollmentQuery.execute({ courseId }))
	if (courseResult.error) {
		logger.error("failed to fetch course for enrollment", { courseId, error: courseResult.error })
		throw errors.wrap(courseResult.error, "db query for course")
	}
	const course = courseResult.data[0]
	if (!course) {
		throw errors.new(`course not found for id: ${courseId}`)
	}

	const client = new OneRosterApiClient({
		serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})
	const classSourcedId = `class-nice:${course.slug}`
	const oneRosterCourseSourcedId = `nice:${course.slug}`

	// 3. Idempotently find or create the OneRoster Class
	let existingClass = await client.getClass(classSourcedId)

	if (!existingClass) {
		logger.info("class not found, creating new one", { classSourcedId })
		const createResult = await errors.try(
			client.createClass({
				sourcedId: classSourcedId,
				title: course.title,
				classType: "scheduled", // Required by spec
				course: { sourcedId: oneRosterCourseSourcedId, type: "course" },
				school: { sourcedId: ORG_SOURCED_ID, type: "org" },
				terms: [{ sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "schoolYear" }]
			})
		)
		if (createResult.error) {
			logger.error("failed to create class", { error: createResult.error })
			throw errors.wrap(createResult.error, "class creation")
		}

		existingClass = await client.getClass(classSourcedId)
		if (!existingClass) {
			throw errors.new("failed to create or retrieve class after creation attempt")
		}
	} else {
		logger.info("class already exists, proceeding with enrollment", { classSourcedId })
	}

	// 4. Create the enrollment
	const enrollmentSourcedId = `enrollment-${userId}-${classSourcedId}`
	const existingEnrollment = await client.getEnrollment(enrollmentSourcedId)
	if (existingEnrollment) {
		logger.warn("user is already enrolled in this class", { userId, classSourcedId })
		return // Gracefully exit if already enrolled
	}

	const enrollmentResult = await errors.try(
		client.createEnrollment({
			sourcedId: enrollmentSourcedId,
			role: "student",
			user: { sourcedId: userId, type: "user" },
			class: { sourcedId: classSourcedId, type: "class" }
		})
	)
	if (enrollmentResult.error) {
		logger.error("failed to create enrollment", { error: enrollmentResult.error })
		throw errors.wrap(enrollmentResult.error, "enrollment creation")
	}

	logger.info("user successfully enrolled", { userId, classSourcedId })

	// 5. Revalidate the course page path to reflect any UI changes
	revalidatePath(course.path)
}
