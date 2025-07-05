import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import { Content } from "./content"

// 1. Drizzle prepared statements
const getCourseByPathQuery = db
	.select({ title: schema.niceCourses.title, path: schema.niceCourses.path })
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("coursePath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_page_get_course_by_path")

const getUnitByPathQuery = db
	.select({ title: schema.niceUnits.title, path: schema.niceUnits.path })
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.path, sql.placeholder("unitPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_page_get_unit_by_path")

// This query is illustrative; a more complex query joining children would be needed for production
const getLessonByPathQuery = db
	.select({ title: schema.niceLessons.title, path: schema.niceLessons.path })
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_page_get_lesson_by_path")

// 2. Export derived types
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitByPathQuery.execute>>[0] & { children: LessonInfo[] } // Mocking children for now
export type Lesson = Awaited<ReturnType<typeof getLessonByPathQuery.execute>>[0] & { children: LessonChild[] }

// 3. The page component is NOT async. It orchestrates promises.
export default function LessonPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
}) {
	logger.info("lesson page: received request, initiating data fetches")

	const dataPromise = params.then(async (p) => {
		const coursePath = `/${p.subject}/${p.course}`
		const unitPath = `${coursePath}/${p.unit}`
		const lessonPath = `${unitPath}/${p.lesson}`

		// In a real scenario, these would fetch children as well
		const courseResult = await getCourseByPathQuery.execute({ coursePath })
		const unitResult = await getUnitByPathQuery.execute({ unitPath })
		const lessonResult = await getLessonByPathQuery.execute({ lessonPath })

		const course = courseResult[0]
		const unitResultData = unitResult[0]
		const lessonResultData = lessonResult[0]

		if (!course || !unitResultData || !lessonResultData) {
			notFound()
		}

		// Create fully-typed objects including the mocked children property
		const unit: Unit = {
			...unitResultData,
			children: [] // Mocked data for component props
		}
		const lesson: Lesson = {
			...lessonResultData,
			children: [] // Mocked data for component props
		}

		return {
			subject: p.subject,
			courseData: course,
			unitData: unit,
			lessonData: lesson,
			children: <></>
		}
	})

	return (
		<React.Suspense fallback={<div>Loading lesson...</div>}>
			<Content dataPromise={dataPromise} />
		</React.Suspense>
	)
}
