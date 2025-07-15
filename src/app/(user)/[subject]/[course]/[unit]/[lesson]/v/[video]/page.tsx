import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchVideoPageData } from "@/lib/data-fetching"
import { Content } from "./content"

// --- DEFINED IN-FILE: Data types required by the Content component ---
export type VideoPageData = {
	id: string
	title: string
	description: string
	youtubeId: string
}

// --- REMOVED: The local fetchVideoData function ---

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	logger.info("video page: received request, rendering layout immediately")

	const videoPromise = params.then(fetchVideoPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
			<Content videoPromise={videoPromise} />
		</React.Suspense>
	)
}
