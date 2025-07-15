import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchCoursePageData } from "@/lib/data-fetching"
import { Content } from "./content"

// Export Page/Component-specific types to avoid importing from khan-academy-api
export type CoursePage_Course = {
	id: string
	title: string
	description: string
	path: string
}

export type CoursePage_Unit = {
	id: string
	title: string
	path: string
	ordering: number
	metadata: Record<string, unknown>
}

export type CoursePage_Lesson = {
	id: string
	unitId: string
	slug: string
	title: string
	description: string
	path: string
	ordering: number
}

export type CoursePage_Video = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	youtubeId: string
	duration: number
	ordering: number
}

export type CoursePage_Article = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	perseusContent: string | null
	ordering: number
}

export type CoursePage_Exercise = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	questions: Array<{
		id: string
		khanId: string
		perseusContent: string
	}>
	ordering: number
}

export type CoursePage_UnitAssessment = {
	id: string
	type: "Quiz" | "UnitTest"
	parentId: string
	title: string
	slug: string
	path: string
	ordering: number
	description: string
}

export type CoursePage_CourseChallenge = {
	id: string
	title: string
	slug: string
	path: string
	description: string
}

export type CoursePage_UnitChild = 
	| (CoursePage_Lesson & { type: "Lesson"; videos: CoursePage_Video[]; articles: CoursePage_Article[]; exercises: CoursePage_Exercise[] })
	| (CoursePage_UnitAssessment & { type: "Quiz" | "UnitTest" })

export type CoursePage_UnitWithChildren = CoursePage_Unit & {
	children: CoursePage_UnitChild[]
}

export type CoursePageData = {
	params: { subject: string; course: string }
	course: CoursePage_Course
	units: CoursePage_UnitWithChildren[]
	lessonCount: number
	challenges: CoursePage_CourseChallenge[]
}

export default function CoursePage({
	params
}: {
	params: Promise<{ subject: string; course: string }>
}) {
	logger.info("course page: received request, rendering layout immediately")

	const courseDataPromise = params.then(fetchCoursePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading course...</div>}>
			<Content dataPromise={courseDataPromise} />
		</React.Suspense>
	)
}
