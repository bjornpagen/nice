import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import { LessonLayout } from "./lesson-layout"

// Shared queries for all lesson pages
const getCourseByPathQuery = db
	.select({ title: schema.niceCourses.title, path: schema.niceCourses.path })
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("coursePath")))
	.limit(1)
	.prepare("lesson_shared_get_course_by_path")

const getUnitByPathQuery = db
	.select({ title: schema.niceUnits.title, path: schema.niceUnits.path })
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.path, sql.placeholder("unitPath")))
	.limit(1)
	.prepare("lesson_shared_get_unit_by_path")

const getLessonByPathQuery = db
	.select({
		id: schema.niceLessons.id,
		title: schema.niceLessons.title,
		path: schema.niceLessons.path
	})
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("lesson_shared_get_lesson_by_path")

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
	.prepare("lesson_shared_get_lesson_content")

// Shared data fetching function
export async function fetchLessonData(params: { subject: string; course: string; unit: string; lesson: string }) {
	const decodedUnit = decodeURIComponent(params.unit)
	const decodedLesson = decodeURIComponent(params.lesson)

	const coursePath = `/${params.subject}/${params.course}`
	const unitPath = `${coursePath}/${decodedUnit}`
	const lessonPath = `${unitPath}/${decodedLesson}`

	const [courseResult, unitResult, lessonResult] = await Promise.all([
		getCourseByPathQuery.execute({ coursePath }),
		getUnitByPathQuery.execute({ unitPath }),
		getLessonByPathQuery.execute({ lessonPath })
	])

	const course = courseResult[0]
	const unitResultData = unitResult[0]
	const lessonResultData = lessonResult[0]

	if (!course || !unitResultData || !lessonResultData) {
		notFound()
	}

	// Fetch lesson content
	const lessonContentResult = await getLessonContentQuery.execute({ lessonId: lessonResultData.id })

	// Build lesson children array
	const children: LessonChild[] = []
	for (const row of lessonContentResult) {
		if (row.contentType === "Video" && row.video) {
			children.push({
				type: "Video",
				id: row.video.id,
				slug: row.video.slug,
				title: row.video.title,
				path: row.video.path
			})
		} else if (row.contentType === "Article" && row.article) {
			children.push({
				type: "Article",
				id: row.article.id,
				slug: row.article.slug,
				title: row.article.title,
				description: "",
				path: row.article.path
			})
		} else if (row.contentType === "Exercise" && row.exercise) {
			children.push({
				type: "Exercise",
				id: row.exercise.id,
				slug: row.exercise.slug,
				title: row.exercise.title,
				description: row.exercise.description || "",
				path: row.exercise.path
			})
		}
	}

	const emptyChildren: LessonInfo[] = []
	return {
		subject: params.subject,
		courseData: course,
		unitData: { ...unitResultData, children: emptyChildren },
		lessonData: { ...lessonResultData, children }
	}
}

// Export types for other pages
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitByPathQuery.execute>>[0] & { children: LessonInfo[] }
export type Lesson = Awaited<ReturnType<typeof getLessonByPathQuery.execute>>[0] & { children: LessonChild[] }
export type LessonData = Awaited<ReturnType<typeof fetchLessonData>>

// Main lesson page - renders layout immediately, shows overview content
export default function LessonPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
}) {
	logger.info("lesson page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<div className="p-8">
				<h1 className="text-2xl font-bold mb-4">Lesson Overview</h1>
				<p className="text-gray-600 mb-6">
					Select an article, exercise, or video from the navigation to begin learning.
				</p>
				<div className="bg-gray-100 p-6 rounded-lg">
					<h2 className="text-lg font-semibold mb-3">What you'll learn in this lesson:</h2>
					<ul className="space-y-2 text-gray-700">
						<li>• Core concepts and fundamentals</li>
						<li>• Practical exercises to reinforce learning</li>
						<li>• Video explanations and demonstrations</li>
					</ul>
				</div>
			</div>
		</LessonLayout>
	)
}
