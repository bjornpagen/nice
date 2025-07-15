import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchUnitPageData } from "@/lib/data-fetching"
import { Content } from "./content"

// Export Page/Component-specific types to avoid importing from khan-academy-api
export type UnitPage_Course = {
	id: string
	title: string
	path: string
	description: string
}

export type UnitPage_Unit = {
	id: string
	title: string
	path: string
	ordering: number
	slug: string
	description: string
	metadata: Record<string, unknown>
}

export type UnitPage_Lesson = {
	id: string
	title: string
	path: string
	ordering: number
	type: "Lesson"
	videos: UnitPage_Video[]
	articles: UnitPage_Article[]
	exercises: UnitPage_Exercise[]
	unitId: string
	slug: string
	description: string
}

export type UnitPage_Video = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	youtubeId: string
	duration: number
	ordering: number
}

export type UnitPage_Article = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	perseusContent: string | null
	ordering: number
}

export type UnitPage_Exercise = {
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

export type UnitPage_Quiz = {
	id: string
	title: string
	path: string
	ordering: number
	type: "Quiz"
	parentId: string
	slug: string
	description: string
}

export type UnitPage_UnitTest = {
	id: string
	title: string
	path: string
	ordering: number
	type: "UnitTest"
	parentId: string
	slug: string
	description: string
}

export type UnitPage_CourseChallenge = {
	id: string
	title: string
	path: string
	slug: string
	description: string
}

export type UnitPage_UnitChild = UnitPage_Lesson | UnitPage_Quiz | UnitPage_UnitTest

export type UnitPage_UnitWithChildren = UnitPage_Unit & {
	children: UnitPage_UnitChild[]
}

export type UnitPageData = {
	params: { subject: string; course: string; unit: string }
	course: UnitPage_Course
	allUnits: UnitPage_UnitWithChildren[]
	lessonCount: number
	challenges: UnitPage_CourseChallenge[]
	unit: UnitPage_Unit
	unitChildren: UnitPage_UnitChild[]
}

export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	logger.info("unit page: received request, rendering layout immediately")

	const unitDataPromise = params.then(fetchUnitPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading unit...</div>}>
			<Content dataPromise={unitDataPromise} />
		</React.Suspense>
	)
}
