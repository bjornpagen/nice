import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import { count, eq, sql } from "drizzle-orm"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
// Import the new server action
import { getOneRosterClassesForSelector } from "@/lib/actions/courses"
import { Content } from "./content"

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

	// ✅ Call the new, cached server action for OneRoster data
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
