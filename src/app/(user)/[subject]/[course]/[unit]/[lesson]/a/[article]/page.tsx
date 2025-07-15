import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchArticlePageData } from "@/lib/data-fetching"
import { Content } from "./content"

// --- DEFINED IN-FILE: Data types required by the Content component ---
// The Article type now contains the identifier for QTI rendering
export type ArticlePageData = {
	id: string
	title: string
	identifier: string // QTI stimulus identifier
}

// --- REMOVED: The local fetchArticleData function ---

export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	logger.info("article page: received request, rendering layout immediately")

	const articlePromise = params.then(fetchArticlePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading article...</div>}>
			<Content articlePromise={articlePromise} />
		</React.Suspense>
	)
}
