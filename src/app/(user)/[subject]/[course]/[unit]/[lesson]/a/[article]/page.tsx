import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import { Content } from "../../content"
import { ArticleContent } from "./article-content"

// --- QUERIES ---
const getCourseByPathQuery = db
	.select({ title: schema.niceCourses.title, path: schema.niceCourses.path })
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("coursePath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_a_article_page_get_course_by_path")

const getUnitByPathQuery = db
	.select({ title: schema.niceUnits.title, path: schema.niceUnits.path })
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.path, sql.placeholder("unitPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_a_article_page_get_unit_by_path")

const getLessonByPathQuery = db
	.select({
		id: schema.niceLessons.id,
		title: schema.niceLessons.title,
		path: schema.niceLessons.path
	})
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_a_article_page_get_lesson_by_path")

const getArticleByPathQuery = db
	.select({
		id: schema.niceArticles.id,
		title: schema.niceArticles.title,
		slug: schema.niceArticles.slug,
		perseusContent: schema.niceArticles.perseusContent
	})
	.from(schema.niceArticles)
	.where(eq(schema.niceArticles.path, sql.placeholder("articlePath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_a_article_page_get_article_by_path")

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
	.prepare("src_app_user_subject_course_unit_lesson_a_article_page_get_lesson_content")

// --- TYPES ---
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitByPathQuery.execute>>[0] & { children: LessonInfo[] }
export type Lesson = Awaited<ReturnType<typeof getLessonByPathQuery.execute>>[0] & { children: LessonChild[] }
export type Article = Awaited<ReturnType<typeof getArticleByPathQuery.execute>>[0]

export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	logger.info("article page: received request, initiating data fetches")

	const dataPromise = params.then(async (p) => {
		const decodedUnit = decodeURIComponent(p.unit)
		const decodedLesson = decodeURIComponent(p.lesson)
		const decodedArticle = decodeURIComponent(p.article)

		const coursePath = `/${p.subject}/${p.course}`
		const unitPath = `${coursePath}/${decodedUnit}`
		const lessonPath = `${unitPath}/${decodedLesson}`
		const articlePath = `${lessonPath}/a/${decodedArticle}`

		const courseResult = await getCourseByPathQuery.execute({ coursePath })
		const unitResult = await getUnitByPathQuery.execute({ unitPath })
		const lessonResult = await getLessonByPathQuery.execute({ lessonPath })
		const articleResult = await getArticleByPathQuery.execute({ articlePath })

		const course = courseResult[0]
		const unitResultData = unitResult[0]
		const lessonResultData = lessonResult[0]
		const article = articleResult[0]

		if (!course || !unitResultData || !lessonResultData || !article) {
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
				})
			} else if (row.contentType === "Article" && row.article) {
				children.push({
					type: "Article",
					id: row.article.id,
					slug: row.article.slug,
					title: row.article.title,
					description: "", // Articles don't have a description field in the schema
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

		const unit: Unit = {
			...unitResultData,
			children: []
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
			children: (
				<React.Suspense fallback={<div>Loading article...</div>}>
					<ArticleContent articlePromise={Promise.resolve(article)} />
				</React.Suspense>
			)
		}
	})

	return (
		<React.Suspense fallback={<div>Loading article page...</div>}>
			<Content dataPromise={dataPromise} />
		</React.Suspense>
	)
}
