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

// --- TYPES ---
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitByPathQuery.execute>>[0] & { children: LessonInfo[] }
export type Lesson = Awaited<ReturnType<typeof getLessonByPathQuery.execute>>[0] & { children: LessonChild[] }
export type Article = Awaited<ReturnType<typeof getArticleByPathQuery.execute>>[0]

// --- PAGE COMPONENT ---
export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	logger.info("article page: received request, initiating data fetches")

	// Promise for the article data, passed directly to the article content
	const articlePromise: Promise<Article> = params.then(async (p) => {
		// Decode URL segments to handle colons in ID-prefixed slugs
		const decodedUnit = decodeURIComponent(p.unit)
		const decodedLesson = decodeURIComponent(p.lesson)
		const articlePath = `/${p.subject}/${p.course}/${decodedUnit}/${decodedLesson}/a/${p.article}`
		const articleResult = await getArticleByPathQuery.execute({ articlePath })
		const article = articleResult[0]
		if (!article) {
			notFound()
		}
		return article
	})

	// Promise for the page layout data (sidebar, breadcrumbs, etc.)
	const dataPromise = params.then(async (p) => {
		// Decode URL segments to handle colons in ID-prefixed slugs
		const decodedUnit = decodeURIComponent(p.unit)
		const decodedLesson = decodeURIComponent(p.lesson)

		const coursePath = `/${p.subject}/${p.course}`
		const unitPath = `${coursePath}/${decodedUnit}`
		const lessonPath = `${unitPath}/${decodedLesson}`

		// Fetch sidebar context data in parallel
		const [courseResult, unitResult, lessonResult] = await Promise.all([
			getCourseByPathQuery.execute({ coursePath }),
			getUnitByPathQuery.execute({ unitPath }),
			getLessonByPathQuery.execute({ lessonPath })
		])

		const course = courseResult[0]
		const unitData = unitResult[0]
		const lessonData = lessonResult[0]

		if (!course || !unitData || !lessonData) {
			notFound()
		}

		// Hydrate with empty children arrays to satisfy component prop types
		const hydratedUnit: Unit = { ...unitData, children: [] }
		const hydratedLesson: Lesson = { ...lessonData, children: [] }

		return {
			subject: p.subject,
			courseData: course,
			unitData: hydratedUnit,
			lessonData: hydratedLesson,
			children: <ArticleContent articlePromise={articlePromise} />
		}
	})

	return (
		<React.Suspense fallback={<div>Loading article...</div>}>
			<Content dataPromise={dataPromise} />
		</React.Suspense>
	)
}
