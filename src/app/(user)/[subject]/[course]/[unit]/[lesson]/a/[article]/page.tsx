import * as React from "react"
import { fetchArticlePageData } from "@/lib/data/content"
import type { ArticlePageData } from "@/lib/types/page"
import { Content } from "./components/content"

// --- REMOVED: The local ArticlePageData type definition ---

export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	const articlePromise: Promise<ArticlePageData> = params.then(fetchArticlePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading article...</div>}>
			<Content articlePromise={articlePromise} />
		</React.Suspense>
	)
}
