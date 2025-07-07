import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { Content } from "./content"

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

export type CourseData = {
	params: { subject: string; course: string }
	course: Course
	units: Unit[]
	lessonCount: number
	challenges: CourseChallenge[]
}

// Shared data fetching function - separated for clarity and reusability
async function fetchCourseData(params: { subject: string; course: string }): Promise<CourseData> {
	const path = `/${params.subject}/${params.course}`
	logger.debug("course page: fetching course by path", { path })

	const courseResult = await getCourseByPathQuery.execute({ path })
	const course = courseResult[0]

	if (!course) {
		logger.warn("course page: course not found for path", { path })
		notFound()
	}

	// Fetch all related data in parallel
	const [units, lessonCountResult, challenges] = await Promise.all([
		getUnitsByCourseIdQuery.execute({ courseId: course.id }),
		getLessonCountByCourseIdQuery.execute({ courseId: course.id }),
		getCourseChallengesQuery.execute({ courseId: course.id })
	])

	const lessonCount = lessonCountResult[0]?.count ?? 0

	return {
		params,
		course,
		units,
		lessonCount,
		challenges
	}
}

// 3. The page component is NOT async. It orchestrates promises and renders immediately.
export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	logger.info("course page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchCourseData)

	return <Content dataPromise={dataPromise} />
}
