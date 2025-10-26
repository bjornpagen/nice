import { connection } from "next/server"
import * as React from "react"
import { getCachedVideoPageData } from "@/lib/server-cache/content-data"
import type { VideoPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "@/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/v/[video]/components/content"

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
		getCachedVideoPageData(
			normalizedParams.subject,
			normalizedParams.course,
			normalizedParams.unit,
			normalizedParams.lesson,
			normalizedParams.video
		)
	)

	return (
		<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
			<Content videoPromise={videoPromise} paramsPromise={normalizedParamsPromise} />
		</React.Suspense>
	)
}
