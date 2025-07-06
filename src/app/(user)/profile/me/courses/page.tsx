import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import { count, eq, sql } from "drizzle-orm"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
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

// Add these prepared statements for course selector data
const getAllSubjects = db
	.select({
		slug: schema.niceSubjects.slug,
		title: schema.niceSubjects.title
	})
	.from(schema.niceSubjects)
	.prepare("src_app_user_profile_me_courses_page_get_all_subjects")

const getAllCourses = db
	.select({
		id: schema.niceCourses.id,
		slug: schema.niceCourses.slug,
		title: schema.niceCourses.title,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.prepare("src_app_user_profile_me_courses_page_get_all_courses")

// Query to check if user has any courses
const getUserCourseCountQuery = db
	.select({ count: count() })
	.from(schema.niceUsersCourses)
	.where(eq(schema.niceUsersCourses.clerkId, sql.placeholder("clerkId")))
	.prepare("src_app_user_profile_me_courses_page_get_user_course_count")

// 2. Types are derived from the queries and exported for use in child components.
export type Course = Awaited<ReturnType<typeof getUserCoursesQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getAllUnitsQuery.execute>>[0]

// Export types for course selector
export type AllSubject = Awaited<ReturnType<typeof getAllSubjects.execute>>[number]
export type AllCourse = Awaited<ReturnType<typeof getAllCourses.execute>>[number]

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

	// These don't depend on user auth, so they can be executed immediately
	const unitsPromise = getAllUnitsQuery.execute()
	const allSubjectsPromise = getAllSubjects.execute()
	const allCoursesPromise = getAllCourses.execute()

	// 5. Render a Suspense boundary and pass all promises to the client component.
	return (
		<React.Suspense fallback={<div>Loading courses...</div>}>
			<Content
				coursesPromise={coursesPromise}
				unitsPromise={unitsPromise}
				allSubjectsPromise={allSubjectsPromise}
				allCoursesPromise={allCoursesPromise}
				userCourseCountPromise={userCourseCountPromise}
			/>
		</React.Suspense>
	)
}
