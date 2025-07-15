import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchExercisePageData } from "@/lib/data/content"
import type { ExercisePageData } from "@/lib/types/page"
import { Content } from "./components/content"

// --- REMOVED: The local ExercisePageData type definition ---

export default function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	logger.info("exercise page: received request, rendering layout immediately")

	const exercisePromise: Promise<ExercisePageData> = params.then(fetchExercisePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading exercise...</div>}>
			<Content exercisePromise={exercisePromise} />
		</React.Suspense>
	)
}
