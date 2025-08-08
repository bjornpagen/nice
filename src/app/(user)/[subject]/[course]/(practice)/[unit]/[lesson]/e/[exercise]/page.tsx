import * as React from "react"
import { fetchExercisePageData } from "@/lib/data/content"
import type { ExercisePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

// --- REMOVED: The local ExercisePageData type definition ---

export default function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	const normalizedParamsPromise = normalizeParams(params)
	const exercisePromise: Promise<ExercisePageData> = normalizedParamsPromise.then(fetchExercisePageData)

	return (
		<React.Suspense>
			<Content exercisePromise={exercisePromise} />
		</React.Suspense>
	)
}
