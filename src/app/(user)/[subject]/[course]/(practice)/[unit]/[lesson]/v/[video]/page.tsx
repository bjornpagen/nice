import * as React from "react"
import { fetchVideoPageData } from "@/lib/data/content"
import type { VideoPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

// --- REMOVED: The local fetchVideoData function ---

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	const normalizedParamsPromise = normalizeParams(params)
	const videoPromise: Promise<VideoPageData> = normalizedParamsPromise.then(fetchVideoPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
			<Content videoPromise={videoPromise} paramsPromise={normalizedParamsPromise} />
		</React.Suspense>
	)
}
