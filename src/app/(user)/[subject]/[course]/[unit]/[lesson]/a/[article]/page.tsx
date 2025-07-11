import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { fetchLessonData } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-data"
import { LessonLayout } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-layout"
import { oneroster } from "@/lib/clients"
import { Content } from "./content"

// The Article type now contains the identifier for QTI rendering
export type Article = {
	id: string
	title: string
	identifier: string // QTI stimulus identifier
}

// New data fetching function for the article page
async function fetchArticleData(params: { article: string }): Promise<Article> {
	// ✅ NEW: Look up resource by slug with namespace filter
	const filter = `sourcedId~'nice:' AND metadata.khanSlug='${params.article}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch article resource by slug", { error: resourceResult.error, slug: params.article })
		throw errors.wrap(resourceResult.error, "failed to fetch article resource by slug")
	}
	const resource = resourceResult.data[0]

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

export default function ArticlePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	logger.info("article page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)
	const articlePromise = params.then(fetchArticleData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading article...</div>}>
				<Content articlePromise={articlePromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
