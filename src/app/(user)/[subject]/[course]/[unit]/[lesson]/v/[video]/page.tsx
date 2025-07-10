import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { VideoPlayer } from "./video-player"

// Video-specific query
const getVideoByPathQuery = db
	.select({
		id: schema.niceVideos.id,
		title: schema.niceVideos.title,
		description: schema.niceVideos.description,
		youtubeId: schema.niceVideos.youtubeId
	})
	.from(schema.niceVideos)
	.where(eq(schema.niceVideos.path, sql.placeholder("videoPath")))
	.limit(1)
	.prepare("video_get_by_path")

export type Video = Awaited<ReturnType<typeof getVideoByPathQuery.execute>>[0]

// Server component for fetching video data
async function StreamingVideoContent({
	params
}: {
	params: { subject: string; course: string; unit: string; lesson: string; video: string }
}) {
	const decodedVideo = decodeURIComponent(params.video)
	const decodedUnit = decodeURIComponent(params.unit)
	const decodedLesson = decodeURIComponent(params.lesson)

	const coursePath = `/${params.subject}/${params.course}`
	const unitPath = `${coursePath}/${decodedUnit}`
	const lessonPath = `${unitPath}/${decodedLesson}`
	const videoPath = `${lessonPath}/v/${decodedVideo}`

	const videoResult = await getVideoByPathQuery.execute({ videoPath })
	const video = videoResult[0]

	if (!video) {
		notFound()
	}

	return <VideoPlayer video={video} />
}

export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	// logger.info("video page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading video...</div>}>
				<StreamingVideoContent params={React.use(params)} />
			</React.Suspense>
		</LessonLayout>
	)
}
