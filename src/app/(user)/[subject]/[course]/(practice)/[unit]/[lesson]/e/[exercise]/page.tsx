import * as React from "react"
import { connection } from "next/server"
import { getCachedExercisePageData } from "@/lib/oneroster/react/content-data"
import type { ExercisePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "@/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content"
import { getAssessmentItem } from "@/lib/qti/redis/api"

export default async function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	// Ensure this route is treated as dynamic and has request context
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
const exercisePromise: Promise<ExercisePageData> = normalizedParamsPromise.then((resolvedParams) =>
	getCachedExercisePageData(
		resolvedParams.subject,
		resolvedParams.course,
		resolvedParams.unit,
		resolvedParams.lesson,
		resolvedParams.exercise
	)
)

	// Derive expected identifiers for each question
	const expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> = exercisePromise.then((data) =>
		data.questions.map((q) =>
			getAssessmentItem(q.id).then((item) => (item.responseDeclarations ?? []).map((d) => d.identifier))
		)
	)

	return (
		<React.Suspense>
			<Content exercisePromise={exercisePromise} expectedIdentifiersPromisesPromise={expectedIdentifiersPromisesPromise} />
		</React.Suspense>
	)
}
