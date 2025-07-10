import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { count, eq, inArray, sql } from "drizzle-orm"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { oneroster } from "@/lib/clients"
import { Content } from "./content"

// OneRoster configuration
const ONEROSTER_ORG_ID = "nice-academy"

// Type definitions for OneRoster course selector
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

// Moved from courses.ts - OneRoster data fetching function
async function getOneRosterClassesForSelector(): Promise<SubjectWithCourses[]> {
	logger.info("fetching course selector data from oneroster api", { orgId: ONEROSTER_ORG_ID })

	const [classesResult, coursesResult] = await Promise.all([
		errors.try(oneroster.getClassesForSchool(ONEROSTER_ORG_ID)),
		errors.try(oneroster.getAllCourses())
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

	// We still need to get the internal IDs from the database for the save functionality
	const niceCoursesResult = await errors.try(
		db
			.select({ id: schema.niceCourses.id, slug: schema.niceCourses.slug })
			.from(schema.niceCourses)
			.where(inArray(schema.niceCourses.slug, Array.from(relevantCourseSlugs)))
	)

	if (niceCoursesResult.error) {
		logger.error("failed to map oneroster slugs to internal db ids", { error: niceCoursesResult.error })
		throw errors.wrap(niceCoursesResult.error, "db course slug mapping")
	}
	const niceCoursesMap = new Map(niceCoursesResult.data.map((c) => [c.slug, c.id]))

	for (const oneRosterClass of allClasses) {
		const course = coursesMap.get(oneRosterClass.course.sourcedId)
		if (!course || !course.subjects || course.subjects.length === 0) continue

		const courseSlug = course.sourcedId.replace(/^nice:/, "")
		const niceCourseId = niceCoursesMap.get(courseSlug)
		if (!niceCourseId) continue

		// Get path from OneRoster metadata instead of database
		// metadata is Record<string, unknown> | undefined, so we need to safely access it
		const pathFromMetadata =
			course.metadata && typeof course.metadata === "object" && "path" in course.metadata
				? String(course.metadata.path)
				: undefined

		if (!pathFromMetadata) {
			logger.debug("course missing metadata path", { courseSlug, sourcedId: course.sourcedId })
			continue
		}

		const courseForSelector: CourseForSelector = {
			id: niceCourseId,
			slug: courseSlug,
			title: course.title,
			path: pathFromMetadata // Using path from OneRoster metadata
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
}

// 1. Drizzle prepared statements are colocated and explicitly select columns.
const getUserCoursesQuery = db
	.select({
		id: schema.niceCourses.id,
		title: schema.niceCourses.title,
		description: schema.niceCourses.description,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.innerJoin(schema.niceUsersCourses, eq(schema.niceCourses.id, schema.niceUsersCourses.courseId))
	.where(eq(schema.niceUsersCourses.clerkId, sql.placeholder("clerkId")))
	.prepare("src_app_user_profile_me_courses_page_get_user_courses")

const getAllUnitsQuery = db
	.select({
		id: schema.niceUnits.id,
		courseId: schema.niceUnits.courseId,
		title: schema.niceUnits.title,
		path: schema.niceUnits.path,
		slug: schema.niceUnits.slug,
		description: schema.niceUnits.description,
		ordering: schema.niceUnits.ordering
	})
	.from(schema.niceUnits)
	.prepare("src_app_user_profile_me_courses_page_get_all_units")

// Query to check if user has any courses
const getUserCourseCountQuery = db
	.select({ count: count() })
	.from(schema.niceUsersCourses)
	.where(eq(schema.niceUsersCourses.clerkId, sql.placeholder("clerkId")))
	.prepare("src_app_user_profile_me_courses_page_get_user_course_count")

// 2. Types are derived from the queries and exported for use in child components.
export type Course = Awaited<ReturnType<typeof getUserCoursesQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getAllUnitsQuery.execute>>[0]

// Define types based on the new action's return value
export type AllSubject = Awaited<ReturnType<typeof getOneRosterClassesForSelector>>[number]
export type AllCourse = AllSubject["courses"][number]

// Force this page to be dynamic to avoid external API calls during build time
export const dynamic = "force-dynamic"

// 3. The page component is NOT async. It orchestrates promises.
export default function CoursesPage() {
	// 4. Get the auth promise and chain other fetches
	const authPromise = auth()

	// Chain all data fetches based on the user's clerkId
	const coursesPromise = authPromise.then(({ userId }) => {
		if (!userId) throw errors.new("User not authenticated")
		return getUserCoursesQuery.execute({ clerkId: userId })
	})

	const userCourseCountPromise = authPromise.then(({ userId }) => {
		if (!userId) throw errors.new("User not authenticated")
		return getUserCourseCountQuery.execute({ clerkId: userId }).then((results) => results[0] || { count: 0 })
	})

	// Unit data is still from the local database
	const unitsPromise = getAllUnitsQuery.execute()

	// ✅ Call the OneRoster function directly since this is a server component
	const allSubjectsAndCoursesPromise = getOneRosterClassesForSelector()

	// 5. Render a Suspense boundary and pass all promises to the client component.
	return (
		<React.Suspense fallback={<div>Loading courses...</div>}>
			<Content
				coursesPromise={coursesPromise}
				unitsPromise={unitsPromise}
				allSubjectsPromise={allSubjectsAndCoursesPromise}
				userCourseCountPromise={userCourseCountPromise}
			/>
		</React.Suspense>
	)
}
