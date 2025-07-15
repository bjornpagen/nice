import * as logger from "@superbuilders/slog"
import type * as React from "react"
import { fetchLessonLayoutData } from "@/lib/data-fetching"
import { LessonLayout } from "./lesson-layout"

// Local type definitions instead of importing from khan-academy-api
export type LessonChild = {
	type: "Video" | "Article" | "Exercise"
	id: string
	slug: string
	title: string
	description: string
	path: string
}

export type LessonInfo = {
	type: "Lesson"
	id: string
	slug: string
	title: string
	description: string
	path: string
	children: LessonChild[]
}

// --- DEFINED IN-FILE: Data types required by the LessonLayout component ---
export type LessonLayout_Course = { title: string; path: string }
export type LessonLayout_Unit = {
	id: string
	title: string
	path: string
	sortOrder: number
	children: LessonInfo[]
}
export type LessonLayout_Lesson = { id: string; title: string; path: string; children: LessonChild[] }
export type LessonLayoutData = {
	subject: string
	courseData: LessonLayout_Course
	unitData: LessonLayout_Unit
	lessonData: LessonLayout_Lesson
}

// The layout component is NOT async. It orchestrates promises and renders immediately.
export default function Layout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
	children: React.ReactNode
}) {
	logger.info("lesson layout: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonLayoutData)

	return <LessonLayout dataPromise={dataPromise}>{children}</LessonLayout>
}
