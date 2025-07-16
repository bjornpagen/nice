import type * as React from "react"
import { fetchLessonLayoutData } from "@/lib/data/lesson"
import type { LessonLayoutData } from "@/lib/types/page"
import { LessonLayout } from "./components/lesson-layout"

// The layout component is NOT async. It orchestrates promises and renders immediately.
export default function Layout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
	children: React.ReactNode
}) {
	const dataPromise: Promise<LessonLayoutData> = params.then(fetchLessonLayoutData)

	return <LessonLayout dataPromise={dataPromise}>{children}</LessonLayout>
}
