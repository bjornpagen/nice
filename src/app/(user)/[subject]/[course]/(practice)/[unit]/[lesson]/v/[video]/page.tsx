import { connection } from "next/server"
import * as React from "react"
import { fetchVideoPageData } from "@/lib/data/content"
import type { VideoPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

// --- REMOVED: The local fetchVideoData function ---

export default async function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	// Opt into dynamic rendering to ensure external fetches occur during request lifecycle
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
	const videoPromise: Promise<VideoPageData> = normalizedParamsPromise.then((normalizedParams) => 
		fetchVideoPageData({
			video: normalizedParams.video,
			lesson: normalizedParams.lesson,
			unit: normalizedParams.unit,
			subject: normalizedParams.subject,
			course: normalizedParams.course
		})
	)

	return (
		<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
			<Content videoPromise={videoPromise} paramsPromise={normalizedParamsPromise} />
		</React.Suspense>
	)
}
