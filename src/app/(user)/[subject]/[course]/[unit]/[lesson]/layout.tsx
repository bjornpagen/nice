import * as logger from "@superbuilders/slog"
import type * as React from "react"
import { fetchLessonLayoutData } from "@/lib/data-fetching"
import type { LessonLayoutData } from "@/lib/types"
import { LessonLayout } from "./components/lesson-layout"

// The layout component is NOT async. It orchestrates promises and renders immediately.
export default function Layout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string }>
	children: React.ReactNode
}) {
	logger.info("lesson layout: received request, rendering layout immediately")

	const dataPromise: Promise<LessonLayoutData> = params.then(fetchLessonLayoutData)

	return <LessonLayout dataPromise={dataPromise}>{children}</LessonLayout>
}
