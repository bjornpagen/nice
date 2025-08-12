import { connection } from "next/server"
import * as React from "react"
import { fetchArticlePageData } from "@/lib/data/content"
import type { ArticlePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

// --- REMOVED: The local ArticlePageData type definition ---

export default async function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	await connection()
	// Normalize URLs by replacing %3A with : (for Khan Academy IDs)
	const normalizedParamsPromise = normalizeParams(params)

	const articlePromise: Promise<ArticlePageData> = normalizedParamsPromise.then(fetchArticlePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading article...</div>}>
			<Content articlePromise={articlePromise} paramsPromise={normalizedParamsPromise} />
		</React.Suspense>
	)
}
