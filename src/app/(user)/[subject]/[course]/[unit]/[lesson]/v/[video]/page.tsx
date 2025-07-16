import * as React from "react"
import { fetchVideoPageData } from "@/lib/data/content"
import type { VideoPageData } from "@/lib/types/page"
import { Content } from "./components/content"

// --- REMOVED: The local fetchVideoData function ---

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	const videoPromise: Promise<VideoPageData> = params.then(fetchVideoPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
			<Content videoPromise={videoPromise} />
		</React.Suspense>
	)
}
