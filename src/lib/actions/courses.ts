"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, inArray } from "drizzle-orm"
import { unstable_cache } from "next/cache"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { OneRosterApiClient } from "@/lib/oneroster-client"

// Database queries for fetching subjects and courses
const getAllSubjects = db
	.select({
		slug: schema.niceSubjects.slug,
		title: schema.niceSubjects.title
	})
	.from(schema.niceSubjects)
	.prepare("src_lib_actions_courses_get_all_subjects")

const getAllCourses = db
	.select({
		id: schema.niceCourses.id,
		slug: schema.niceCourses.slug,
		title: schema.niceCourses.title,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.prepare("src_lib_actions_courses_get_all_courses")

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

export async function getCoursesGroupedBySubject() {
	const allSubjectsResult = await errors.try(getAllSubjects.execute())
	if (allSubjectsResult.error) {
		logger.error("failed to fetch subjects", { error: allSubjectsResult.error })
		throw errors.wrap(allSubjectsResult.error, "subjects fetch")
	}

	const allCoursesResult = await errors.try(getAllCourses.execute())
	if (allCoursesResult.error) {
		logger.error("failed to fetch courses", { error: allCoursesResult.error })
		throw errors.wrap(allCoursesResult.error, "courses fetch")
	}

	const allSubjects = allSubjectsResult.data
	const allCourses = allCoursesResult.data

	// Group courses by subject based on path pattern
	type Course = (typeof allCourses)[number]
	const coursesBySubject = new Map<string, Course[]>()

	// Initialize map with all subjects
	for (const subject of allSubjects) {
		coursesBySubject.set(subject.slug, [])
	}

	// Group courses
	for (const course of allCourses) {
		// Extract subject from course path (e.g., /math/arithmetic -> math)
		const pathParts = course.path.split("/")
		const subjectSlug = pathParts[1] // First part after leading /

		if (subjectSlug && coursesBySubject.has(subjectSlug)) {
			coursesBySubject.get(subjectSlug)?.push(course)
		}
		// Note: courses without matching subjects are simply ignored
	}

	// Convert to array format for easier consumption
	const subjectsWithCourses = Array.from(coursesBySubject.entries())
		.map(([slug, coursesForSubject]) => {
			const subject = allSubjects.find((s) => s.slug === slug)
			return {
				slug,
				title: subject?.title || slug,
				courses: coursesForSubject.sort((a, b) => a.title.localeCompare(b.title))
			}
		})
		.filter((s) => s.courses.length > 0) // Only include subjects with courses

	return subjectsWithCourses
}

// Type definitions for OneRoster course selector
const ONEROSTER_ORG_ID = "nice-academy"

type CourseForSelector = {
	id: string // This MUST be our internal nice.courses.id
	slug: string
	title: string
	path: string
}

type SubjectWithCourses = {
	slug: string
	title: string
	courses: CourseForSelector[]
}

export const getOneRosterClassesForSelector = unstable_cache(
	async (): Promise<SubjectWithCourses[]> => {
		logger.info("fetching course selector data from oneroster api", { orgId: ONEROSTER_ORG_ID })

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
		const coursesBySubject = new Map<string, CourseForSelector[]>()
		const relevantCourseSlugs = new Set<string>()

		for (const oneRosterClass of allClasses) {
			const course = coursesMap.get(oneRosterClass.course.sourcedId)
			if (course) {
				const courseSlug = course.sourcedId.replace(/^nice:/, "")
				if (courseSlug) {
					relevantCourseSlugs.add(courseSlug)
				}
			}
		}

		if (relevantCourseSlugs.size === 0) return []

		const niceCoursesResult = await errors.try(
			db
				.select({ id: schema.niceCourses.id, slug: schema.niceCourses.slug, path: schema.niceCourses.path })
				.from(schema.niceCourses)
				.where(inArray(schema.niceCourses.slug, Array.from(relevantCourseSlugs)))
		)

		if (niceCoursesResult.error) {
			logger.error("failed to map oneroster slugs to internal db ids", { error: niceCoursesResult.error })
			throw errors.wrap(niceCoursesResult.error, "db course slug mapping")
		}
		const niceCoursesMap = new Map(niceCoursesResult.data.map((c) => [c.slug, { id: c.id, path: c.path }]))

		for (const oneRosterClass of allClasses) {
			const course = coursesMap.get(oneRosterClass.course.sourcedId)
			if (!course || !course.subjects || course.subjects.length === 0) continue

			const courseSlug = course.sourcedId.replace(/^nice:/, "")
			const niceCourseInfo = niceCoursesMap.get(courseSlug)
			if (!niceCourseInfo) continue

			const courseForSelector: CourseForSelector = {
				id: niceCourseInfo.id,
				slug: courseSlug,
				title: course.title,
				path: niceCourseInfo.path
			}

			for (const subject of course.subjects) {
				if (!coursesBySubject.has(subject)) {
					coursesBySubject.set(subject, [])
				}
				const subjectCourses = coursesBySubject.get(subject)
				if (subjectCourses && !subjectCourses.some((c) => c.id === courseForSelector.id)) {
					subjectCourses.push(courseForSelector)
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
	},
	["oneroster-classes-for-selector"],
	{ revalidate: 3600 } // Cache for 1 hour
)
