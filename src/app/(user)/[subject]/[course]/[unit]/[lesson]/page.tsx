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

const getLessonByPathQuery = db
	.select({
		id: schema.niceLessons.id,
		title: schema.niceLessons.title,
		path: schema.niceLessons.path
	})
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_page_get_lesson_by_path")

// NEW: Get lesson children content
const getLessonContentQuery = db
	.select({
		contentId: schema.niceLessonContents.contentId,
		contentType: schema.niceLessonContents.contentType,
		ordering: schema.niceLessonContents.ordering,
		video: schema.niceVideos,
		article: schema.niceArticles,
		exercise: schema.niceExercises
	})
	.from(schema.niceLessonContents)
	.leftJoin(schema.niceVideos, eq(schema.niceLessonContents.contentId, schema.niceVideos.id))
	.leftJoin(schema.niceArticles, eq(schema.niceLessonContents.contentId, schema.niceArticles.id))
	.leftJoin(schema.niceExercises, eq(schema.niceLessonContents.contentId, schema.niceExercises.id))
	.where(eq(schema.niceLessonContents.lessonId, sql.placeholder("lessonId")))
	.orderBy(schema.niceLessonContents.ordering)
	.prepare("src_app_user_subject_course_unit_lesson_page_get_lesson_content")

// 2. Export derived types
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitByPathQuery.execute>>[0] & { children: LessonInfo[] }
export type Lesson = Awaited<ReturnType<typeof getLessonByPathQuery.execute>>[0] & { children: LessonChild[] }

// 3. The page component is NOT async. It orchestrates promises.
export default function LessonPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
}) {
	logger.info("lesson page: received request, initiating data fetches")

	const dataPromise = params.then(async (p) => {
		// Decode URL segments to handle colons in ID-prefixed slugs
		const decodedUnit = decodeURIComponent(p.unit)
		const decodedLesson = decodeURIComponent(p.lesson)

		const coursePath = `/${p.subject}/${p.course}`
		const unitPath = `${coursePath}/${decodedUnit}`
		const lessonPath = `${unitPath}/${decodedLesson}`

		// Fetch basic lesson data
		const courseResult = await getCourseByPathQuery.execute({ coursePath })
		const unitResult = await getUnitByPathQuery.execute({ unitPath })
		const lessonResult = await getLessonByPathQuery.execute({ lessonPath })

		const course = courseResult[0]
		const unitResultData = unitResult[0]
		const lessonResultData = lessonResult[0]

		if (!course || !unitResultData || !lessonResultData) {
			notFound()
		}

		// NEW: Fetch lesson content
		const lessonContentResult = await getLessonContentQuery.execute({ lessonId: lessonResultData.id })

		// NEW: Build lesson children array
		const children: LessonChild[] = []

		for (const row of lessonContentResult) {
			if (row.contentType === "Video" && row.video) {
				children.push({
					type: "Video",
					id: row.video.id,
					slug: row.video.slug,
					title: row.video.title,
					path: row.video.path
					// Add other video properties as needed
				})
			} else if (row.contentType === "Article" && row.article) {
				children.push({
					type: "Article",
					id: row.article.id,
					slug: row.article.slug,
					title: row.article.title,
					description: "", // Articles don't have a description field in the schema
					path: row.article.path
					// Add other article properties as needed
				})
			} else if (row.contentType === "Exercise" && row.exercise) {
				children.push({
					type: "Exercise",
					id: row.exercise.id,
					slug: row.exercise.slug,
					title: row.exercise.title,
					description: row.exercise.description || "",
					path: row.exercise.path
					// Add other exercise properties as needed
				})
			}
		}

		// Create fully-typed objects with actual lesson children
		const unit: Unit = {
			...unitResultData,
			children: [] // Unit children still mocked for this page
		}
		const lesson: Lesson = {
			...lessonResultData,
			children: children // ✅ Now populated with actual data!
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
