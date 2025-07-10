import { notFound } from "next/navigation"
import * as React from "react"
import { oneroster } from "@/lib/clients"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { VideoPlayer } from "./video-player"

// Define the shape of the video data from OneRoster
export type Video = {
	id: string
	title: string
	description: string
	youtubeId: string
}

// Helper function to extract YouTube ID from URL
function extractYouTubeId(url: string): string | null {
	const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
	return match?.[1] || null
}

// Server component for fetching video data
async function StreamingVideoContent({
	params
}: {
	params: { subject: string; course: string; unit: string; lesson: string; video: string }
}) {
	const videoSourcedId = `nice:${params.video}`

	// Fetch the resource from OneRoster
	const resource = await oneroster.getResource(videoSourcedId)

	if (!resource || !resource.metadata?.url || typeof resource.metadata.url !== "string") {
		notFound()
	}

	// Extract YouTube ID from the URL
	const youtubeId = extractYouTubeId(resource.metadata.url)
	if (!youtubeId) {
		notFound()
	}

	const video: Video = {
		id: resource.sourcedId,
		title: resource.title,
		description: typeof resource.metadata?.description === "string" ? resource.metadata.description : "",
		youtubeId
	}

	return <VideoPlayer video={video} />
}

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	const dataPromise = params.then(fetchLessonData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
				<StreamingVideoContent params={React.use(params)} />
			</React.Suspense>
		</LessonLayout>
	)
}
