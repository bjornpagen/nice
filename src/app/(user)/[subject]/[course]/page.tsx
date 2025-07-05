import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { Content } from "./_components/content"

// 1. Drizzle prepared statements are colocated and explicitly select columns.
//    Names are prefixed with the file path in snake_case per linting rules.
const getCourseByPathQuery = db
	.select({
		id: schema.niceCourses.id,
		title: schema.niceCourses.title,
		description: schema.niceCourses.description,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("path")))
	.limit(1)
	.prepare("src_app_user_subject_course_page_get_course_by_path")

const getUnitsByCourseIdQuery = db
	.select({
		id: schema.niceUnits.id,
		title: schema.niceUnits.title,
		path: schema.niceUnits.path
	})
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.courseId, sql.placeholder("courseId")))
	.prepare("src_app_user_subject_course_page_get_units_by_course_id")

const getLessonCountByCourseIdQuery = db
	.select({
		count: sql<number>`count(*)::int`
	})
	.from(schema.niceLessons)
	.where(
		inArray(
			schema.niceLessons.unitId,
			db
				.select({ id: schema.niceUnits.id })
				.from(schema.niceUnits)
				.where(eq(schema.niceUnits.courseId, sql.placeholder("courseId")))
		)
	)
	.prepare("src_app_user_subject_course_page_get_lesson_count_by_course_id")

const getCourseChallengesQuery = db
	.select({
		id: schema.niceAssessments.id,
		path: schema.niceAssessments.path
	})
	.from(schema.niceAssessments)
	.where(
		and(
			eq(schema.niceAssessments.parentId, sql.placeholder("courseId")),
			eq(schema.niceAssessments.parentType, "Course")
		)
	)
	.prepare("src_app_user_subject_course_page_get_course_challenges")

// 2. Types are derived from the queries and exported for use in child components.
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitsByCourseIdQuery.execute>>[0]
export type CourseChallenge = Awaited<ReturnType<typeof getCourseChallengesQuery.execute>>[0]

// 3. The page component is NOT async. It orchestrates promises.
export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	logger.info("course page: received request, initiating db queries")

	// 4. Create a promise for the course data, chained from the params promise.
	//    If the course is not found, this will trigger a 404.
	const coursePromise: Promise<Course> = params.then(async (p) => {
		const path = `/${p.subject}/${p.course}`
		logger.debug("course page: fetching course by path", { path })
		const courseResult = await getCourseByPathQuery.execute({ path })
		const course = courseResult[0]
		if (!course) {
			logger.warn("course page: course not found for path, redirecting", { path })
			notFound()
		}
		return course
	})

	// 5. Chain subsequent data fetches off the coursePromise.
	const unitsPromise: Promise<Unit[]> = coursePromise.then((course) => {
		logger.debug("course page: fetching units for course", { courseId: course.id })
		return getUnitsByCourseIdQuery.execute({ courseId: course.id })
	})

	const lessonCountPromise: Promise<number> = coursePromise.then(async (course) => {
		logger.debug("course page: fetching lesson count for course", { courseId: course.id })
		const result = await getLessonCountByCourseIdQuery.execute({ courseId: course.id })
		return result[0]?.count ?? 0
	})

	const challengesPromise: Promise<CourseChallenge[]> = coursePromise.then((course) => {
		logger.debug("course page: fetching challenges for course", { courseId: course.id })
		return getCourseChallengesQuery.execute({ courseId: course.id })
	})

	// 6. Render a Suspense boundary and pass all promises to the client component.
	return (
		<React.Suspense fallback={null}>
			<Content
				paramsPromise={params}
				coursePromise={coursePromise}
				unitsPromise={unitsPromise}
				lessonCountPromise={lessonCountPromise}
				challengesPromise={challengesPromise}
			/>
		</React.Suspense>
	)
}
