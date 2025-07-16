import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { LessonVideoContent } from "@/components/practice/course/unit/lesson/video/lesson-video-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob, getCourseMaterials, type LessonResource } from "@/lib/v2/types"

export default function PracticeVideoPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; video: string }>
}) {
	// Chain the promise properly to handle the error case
	const videoPromise = params.then(({ subject, course, unit, lesson, video }) => {
		logger.debug("initializing video page", { subject, course, unit, lesson, video })
		return getVideoData(subject, course, unit, lesson, video)
	})

	return (
		<div id="practice-video-page" className="h-full">
			<ErrorBoundary fallback={<PracticeVideoPageErrorFallback />}>
				<React.Suspense>
					<LessonVideoContent videoPromise={videoPromise} className="h-full bg-blue-950 text-white" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeVideoPageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve video page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getVideoData(
	subject: string,
	course: string,
	unit: string,
	lesson: string,
	video: string
): Extract<CourseMaterial, { type: "Video" }> | undefined {
	logger.info("lesson video data: initializing lesson video data", { subject, course, unit, lesson, video })

	const blob = getCourseBlob(subject, course)
	logger.info("lesson video data: blob retrieved", {
		subject,
		course,
		unit,
		lesson,
		video,
		blobKeys: _.keys(blob)
	})

	const materials = getCourseMaterials(blob)
	logger.info("lesson video data: materials extracted", {
		subject,
		course,
		unit,
		lesson,
		video,
		materialCount: materials.length
	})

	const lessonIndex = materials.findIndex(
		(m): m is Extract<CourseMaterial, { type: "Lesson" }> => m.type === "Lesson" && m.slug === lesson
	)
	if (lessonIndex === -1) {
		logger.error("lesson video data: lesson index not found", { subject, course, unit, lesson, video })
		return undefined
	}
	logger.info("lesson video data: lesson index found", { subject, course, unit, lesson, lessonIndex })

	const lessonData = materials[lessonIndex]
	if (lessonData == null || lessonData.type !== "Lesson") {
		logger.error("lesson video data: lesson data not found", { subject, course, unit, lesson, video })
		return undefined
	}
	logger.info("lesson video data: lesson data retrieved", {
		subject,
		course,
		unit,
		lesson,
		lessonDataKeys: _.keys(lessonData)
	})

	const videoIndex = lessonData.resources.findIndex(
		(r): r is Extract<CourseMaterial, { type: "Video" }> => r.type === "Video" && r.slug === video
	)
	if (videoIndex === -1) {
		logger.error("lesson video data: video index not found", { subject, course, unit, lesson, video })
		return undefined
	}
	logger.info("lesson video data: video index found", { subject, course, unit, lesson, video, videoIndex })

	const videoData = lessonData.resources[videoIndex]
	if (videoData == null || videoData.type !== "Video") {
		logger.error("lesson video data: video data not found", { subject, course, unit, lesson, video })
		return undefined
	}
	logger.info("lesson video data: video data retrieved", {
		subject,
		course,
		unit,
		lesson,
		video,
		videoDataKeys: _.keys(videoData)
	})

	// Stupid typescript fuckery to get the compiler to understand that the meta object is valid.
	const enhancedVideoData: Extract<CourseMaterial, { type: "Video" }> = {
		...videoData,
		meta: {
			...videoData.meta,
			unit: lessonData.meta.unit
		}
	}
	logger.info("lesson video data: video data enhanced with unit", {
		subject,
		course,
		unit,
		lesson,
		video,
		videoDataKeys: _.keys(enhancedVideoData)
	})

	let nextMaterial: { type: CourseMaterial["type"]; title: string; resources?: LessonResource[] } | undefined =
		lessonData.resources[videoIndex + 1]
	if (nextMaterial == null) {
		nextMaterial = materials[lessonIndex + 1]
	}
	if (nextMaterial != null && nextMaterial.type === "Lesson") {
		nextMaterial = nextMaterial.resources?.find(
			(r): r is Extract<CourseMaterial, { type: "Article" | "Exercise" | "Video" }> => r != null
		)
	}
	logger.info("lesson video data: next material identified", {
		subject,
		course,
		unit,
		lesson,
		video,
		nextMaterialKeys: _.keys(nextMaterial)
	})

	if (nextMaterial != null) {
		enhancedVideoData.meta = {
			...enhancedVideoData.meta,
			next: { type: nextMaterial.type, title: nextMaterial.title }
		}
		logger.info("lesson video data: video data enhanced with next material", {
			subject,
			course,
			unit,
			lesson,
			video,
			nextType: nextMaterial.type,
			nextTitle: nextMaterial.title
		})
	}

	return enhancedVideoData
}
