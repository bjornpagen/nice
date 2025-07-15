import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchVideoPageData } from "@/lib/data-fetching"
import type { VideoPageData } from "@/lib/types"
import { Content } from "./content"

// --- REMOVED: The local fetchVideoData function ---

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	logger.info("video page: received request, rendering layout immediately")

	const videoPromise: Promise<VideoPageData> = params.then(fetchVideoPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
			<Content videoPromise={videoPromise} />
		</React.Suspense>
	)
}
