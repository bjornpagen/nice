import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { oneroster } from "@/lib/clients"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { ArticleContent } from "./article-content"

// The Article type now contains the identifier for QTI rendering
export type Article = {
	id: string
	title: string
	identifier: string // QTI stimulus identifier
}

// New data fetching function for the article page
async function fetchArticleData(params: { article: string }): Promise<Article> {
	const articleSourcedId = `nice:${params.article}`

	// Get the OneRoster resource to extract the Khan Academy ID
	const resource = await oneroster.getResource(articleSourcedId)

	if (!resource || !resource.metadata?.khanId) {
		notFound()
	}

	// Construct the QTI stimulus identifier using the Khan Academy ID
	const qtiIdentifier = `nice:${resource.metadata.khanId}`

	return {
		id: resource.sourcedId,
		title: resource.title,
		identifier: qtiIdentifier
	}
}

// Server component for streaming the article content
async function StreamingArticleContent({
	params
}: {
	params: { subject: string; course: string; unit: string; lesson: string; article: string }
}) {
	const article = await fetchArticleData(params)
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
