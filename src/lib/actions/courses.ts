"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { OneRosterApiClient } from "@/lib/oneroster-client"

export async function saveUserCourses(courseIds: string[]) {
	const authResult = await errors.try(auth())
	if (authResult.error) {
		logger.error("authentication failed", { error: authResult.error })
		throw errors.wrap(authResult.error, "authentication")
	}

	const { userId } = authResult.data
	if (!userId) {
		throw errors.new("user not authenticated")
	}

	logger.info("saving user courses", { userId, courseIds, count: courseIds.length })

	// Start a transaction to ensure both operations succeed or fail together
	const transactionResult = await errors.try(
		db.transaction(async (tx) => {
			// First, delete all existing courses for this user
			const deleteResult = await errors.try(
				tx.delete(schema.niceUsersCourses).where(eq(schema.niceUsersCourses.clerkId, userId))
			)

			if (deleteResult.error) {
				logger.error("failed to delete existing user courses", { error: deleteResult.error, userId })
				throw errors.wrap(deleteResult.error, "course deletion")
			}

			// If no courses selected, we're done (user removed all courses)
			if (courseIds.length === 0) {
				logger.info("user removed all courses", { userId })
				return { success: true, count: 0 }
			}

			// Prepare the data for insertion
			const userCoursesToInsert = courseIds.map((courseId) => ({
				clerkId: userId,
				courseId
			}))

			// Insert the new set of courses
			const insertResult = await errors.try(tx.insert(schema.niceUsersCourses).values(userCoursesToInsert))

			if (insertResult.error) {
				logger.error("failed to insert user courses", { error: insertResult.error, userId, courseIds })
				throw errors.wrap(insertResult.error, "course insertion")
			}

			return { success: true, count: courseIds.length }
		})
	)

	if (transactionResult.error) {
		logger.error("transaction failed", { error: transactionResult.error, userId })
		throw errors.wrap(transactionResult.error, "course update transaction")
	}

	logger.info("successfully updated user courses", { userId, courseIds, count: courseIds.length })

	return transactionResult.data
}

// Type definitions for OneRoster explore dropdown (no DB dependency)
const ONEROSTER_ORG_ID = "nice-academy"

type CourseForExplore = {
	id: string // Using OneRoster sourcedId as the key
	title: string
	path: string
}

type SubjectWithCoursesForExplore = {
	slug: string
	title: string
	courses: CourseForExplore[]
}

export async function getOneRosterCoursesForExplore(): Promise<SubjectWithCoursesForExplore[]> {
	logger.info("fetching explore dropdown data from oneroster api", { orgId: ONEROSTER_ORG_ID })

	const client = new OneRosterApiClient({
		serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	const [classesResult, coursesResult] = await Promise.all([
		errors.try(client.getClassesForSchool(ONEROSTER_ORG_ID)),
		errors.try(client.getAllCourses())
	])

	if (classesResult.error) {
		logger.error("failed to fetch classes from oneroster", { error: classesResult.error })
		throw errors.wrap(classesResult.error, "oneroster class fetch")
	}
	if (coursesResult.error) {
		logger.error("failed to fetch courses from oneroster", { error: coursesResult.error })
		throw errors.wrap(coursesResult.error, "oneroster course fetch")
	}

	const allClasses = classesResult.data
	const allCourses = coursesResult.data
	const coursesMap = new Map(allCourses.map((c) => [c.sourcedId, c]))
	const coursesBySubject = new Map<string, CourseForExplore[]>()
	const processedCourseIds = new Set<string>()

	for (const oneRosterClass of allClasses) {
		const course = coursesMap.get(oneRosterClass.course.sourcedId)
		if (!course || !course.subjects || course.subjects.length === 0) continue

		// Skip if we've already processed this course (multiple classes can reference same course)
		if (processedCourseIds.has(course.sourcedId)) continue
		processedCourseIds.add(course.sourcedId)

		// Get path from OneRoster metadata
		const pathFromMetadata =
			course.metadata && typeof course.metadata === "object" && "path" in course.metadata
				? String(course.metadata.path)
				: undefined

		if (!pathFromMetadata) {
			logger.debug("course missing metadata path", { sourcedId: course.sourcedId })
			continue
		}

		const courseForExplore: CourseForExplore = {
			id: course.sourcedId, // Using OneRoster sourcedId as the key
			title: course.title,
			path: pathFromMetadata
		}

		for (const subject of course.subjects) {
			if (!coursesBySubject.has(subject)) {
				coursesBySubject.set(subject, [])
			}
			const subjectCourses = coursesBySubject.get(subject)
			if (subjectCourses) {
				subjectCourses.push(courseForExplore)
			}
		}
	}

	return Array.from(coursesBySubject.entries())
		.map(([subjectTitle, courses]) => ({
			slug: subjectTitle.toLowerCase().replace(/\s+/g, "-"),
			title: subjectTitle,
			courses: courses.sort((a, b) => a.title.localeCompare(b.title))
		}))
		.sort((a, b) => a.title.localeCompare(b.title))
}
