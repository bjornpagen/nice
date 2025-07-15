import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchArticlePageData } from "@/lib/data-fetching"
import type { ArticlePageData } from "@/lib/types" // Import from canonical types
import { Content } from "./components/content"

// --- REMOVED: The local ArticlePageData type definition ---

export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	logger.info("article page: received request, rendering layout immediately")

	const articlePromise: Promise<ArticlePageData> = params.then(fetchArticlePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading article...</div>}>
			<Content articlePromise={articlePromise} />
		</React.Suspense>
	)
}
