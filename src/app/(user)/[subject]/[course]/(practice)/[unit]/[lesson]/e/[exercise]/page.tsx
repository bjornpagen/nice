import * as React from "react"
import { connection } from "next/server"
import { fetchExercisePageData } from "@/lib/data/content"
import type { ExercisePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "@/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content"

export default async function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	// Ensure this route is treated as dynamic and has request context
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
	const exercisePromise: Promise<ExercisePageData> = normalizedParamsPromise.then(fetchExercisePageData)

	return (
		<React.Suspense>
			<Content exercisePromise={exercisePromise} />
		</React.Suspense>
	)
}
