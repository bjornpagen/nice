import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchExercisePageData } from "@/lib/data-fetching"
import { Content } from "./content"

// --- DEFINED IN-FILE: Data types required by the Content component ---
export type ExercisePageData = {
	exercise: {
		id: string
		title: string
		type: "Exercise"
	}
	questions: Array<{
		id: string
		exerciseId: string
		qtiIdentifier: string
	}>
}

// --- REMOVED: The local fetchExerciseData function ---

export default function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	logger.info("exercise page: received request, rendering layout immediately")

	const exerciseDataPromise = params.then(fetchExercisePageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading exercise...</div>}>
			<Content exerciseDataPromise={exerciseDataPromise} />
		</React.Suspense>
	)
}
