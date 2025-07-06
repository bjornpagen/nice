import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import { Content } from "../../content"
import { VideoPlayer } from "./video-player"

// --- QUERIES ---
const getCourseByPathQuery = db
	.select({ title: schema.niceCourses.title, path: schema.niceCourses.path })
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("coursePath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_v_video_page_get_course_by_path")

const getUnitByPathQuery = db
	.select({ title: schema.niceUnits.title, path: schema.niceUnits.path })
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.path, sql.placeholder("unitPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_v_video_page_get_unit_by_path")

const getLessonByPathQuery = db
	.select({
		id: schema.niceLessons.id,
		title: schema.niceLessons.title,
		path: schema.niceLessons.path
	})
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_v_video_page_get_lesson_by_path")

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
	.prepare("src_app_user_subject_course_unit_lesson_v_video_page_get_video_by_path")

// --- TYPES ---
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitByPathQuery.execute>>[0] & { children: LessonInfo[] }
export type Lesson = Awaited<ReturnType<typeof getLessonByPathQuery.execute>>[0] & { children: LessonChild[] }
export type Video = Awaited<ReturnType<typeof getVideoByPathQuery.execute>>[0]

// --- PAGE COMPONENT ---
export default function VideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	logger.info("video page: received request, initiating data fetches")

	// Promise for the video data, passed directly to the video player
	const videoPromise: Promise<Video> = params.then(async (p) => {
		// Decode URL segments to handle colons in ID-prefixed slugs
		const decodedUnit = decodeURIComponent(p.unit)
		const decodedLesson = decodeURIComponent(p.lesson)
		const videoPath = `/${p.subject}/${p.course}/${decodedUnit}/${decodedLesson}/v/${p.video}`
		const videoResult = await getVideoByPathQuery.execute({ videoPath })
		const video = videoResult[0]
		if (!video) {
			notFound()
		}
		return video
	})

	// Promise for the page layout data (sidebar, breadcrumbs, etc.)
	const dataPromise = params.then(async (p) => {
		// Decode URL segments to handle colons in ID-prefixed slugs
		const decodedUnit = decodeURIComponent(p.unit)
		const decodedLesson = decodeURIComponent(p.lesson)

		const coursePath = `/${p.subject}/${p.course}`
		const unitPath = `${coursePath}/${decodedUnit}`
		const lessonPath = `${unitPath}/${decodedLesson}`

		// Fetch sidebar context data in parallel
		const [courseResult, unitResult, lessonResult] = await Promise.all([
			getCourseByPathQuery.execute({ coursePath }),
			getUnitByPathQuery.execute({ unitPath }),
			getLessonByPathQuery.execute({ lessonPath })
		])

		const course = courseResult[0]
		const unitData = unitResult[0]
		const lessonData = lessonResult[0]

		if (!course || !unitData || !lessonData) {
			notFound()
		}

		// Hydrate with empty children arrays to satisfy component prop types
		const hydratedUnit: Unit = { ...unitData, children: [] }
		const hydratedLesson: Lesson = { ...lessonData, children: [] }

		return {
			subject: p.subject,
			courseData: course,
			unitData: hydratedUnit,
			lessonData: hydratedLesson,
			children: <VideoPlayer videoPromise={videoPromise} />
		}
	})

	return (
		<React.Suspense fallback={<div>Loading video...</div>}>
			<Content dataPromise={dataPromise} />
		</React.Suspense>
	)
}
