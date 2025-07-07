import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { LessonLayout } from "../../lesson-layout"
import { fetchLessonData } from "../../page"
import { ArticleContent } from "./article-content"

// Article-specific query
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
	.prepare("article_get_by_path")

export type Article = Awaited<ReturnType<typeof getArticleByPathQuery.execute>>[0]

// Server component for fetching article data
async function StreamingArticleContent({
	params
}: {
	params: { subject: string; course: string; unit: string; lesson: string; article: string }
}) {
	const decodedArticle = decodeURIComponent(params.article)
	const decodedUnit = decodeURIComponent(params.unit)
	const decodedLesson = decodeURIComponent(params.lesson)

	const coursePath = `/${params.subject}/${params.course}`
	const unitPath = `${coursePath}/${decodedUnit}`
	const lessonPath = `${unitPath}/${decodedLesson}`
	const articlePath = `${lessonPath}/a/${decodedArticle}`

	const articleResult = await getArticleByPathQuery.execute({ articlePath })
	const article = articleResult[0]

	if (!article) {
		notFound()
	}

	return <ArticleContent article={article} />
}

export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	logger.info("article page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading article...</div>}>
				<StreamingArticleContent params={React.use(params)} />
			</React.Suspense>
		</LessonLayout>
	)
}
