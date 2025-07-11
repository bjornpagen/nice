import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { fetchLessonData } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-data"
import { LessonLayout } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-layout"
import { oneroster } from "@/lib/clients"
import { Content } from "./content"

// Define the shape of the video data from OneRoster
export type Video = {
	id: string
	title: string
	description: string
	youtubeId: string
}

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
	const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/, /^([a-zA-Z0-9_-]{11})$/]

	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match?.[1]) {
			return match[1]
		}
	}

	return null
}

async function fetchVideoData(params: { video: string }): Promise<Video> {
	// ✅ NEW: Look up resource by slug with namespace filter
	const filter = `sourcedId~'nice:' AND metadata.khanSlug='${params.video}' AND metadata.type='video'`
	const resourceResultFromAPI = await errors.try(oneroster.getAllResources(filter))
	if (resourceResultFromAPI.error) {
		logger.error("failed to fetch video resource by slug", { error: resourceResultFromAPI.error, slug: params.video })
		throw errors.wrap(resourceResultFromAPI.error, "failed to fetch video resource by slug")
	}
	const resource = resourceResultFromAPI.data[0]

	if (!resource || !resource.metadata?.url || typeof resource.metadata.url !== "string") {
		notFound()
	}

	const youtubeId = extractYouTubeId(resource.metadata.url)
	if (!youtubeId) {
		notFound()
	}

	return {
		id: resource.sourcedId,
		title: resource.title,
		description: typeof resource.metadata?.description === "string" ? resource.metadata.description : "",
		youtubeId
	}
}

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	const dataPromise = params.then(fetchLessonData)
	const videoPromise = params.then(fetchVideoData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
				<Content videoPromise={videoPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
