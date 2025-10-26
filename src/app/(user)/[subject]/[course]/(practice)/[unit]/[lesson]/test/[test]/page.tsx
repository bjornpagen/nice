import { connection } from "next/server"
import * as React from "react"
import { getCachedUnitTestPageData } from "@/lib/server-cache/assessment-data"
import type { UnitTestPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"
import { getAssessmentItem } from "@/lib/data/fetchers/qti"

// --- REMOVED: The local UnitTestPageData type definition ---

export default async function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
const testPromise: Promise<UnitTestPageData> = normalizedParamsPromise.then((resolvedParams) =>
	getCachedUnitTestPageData(
		resolvedParams.subject,
		resolvedParams.course,
		resolvedParams.unit,
		resolvedParams.lesson,
		resolvedParams.test
	)
)

	const expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> = testPromise.then((data) =>
		data.questions.map((q) => getAssessmentItem(q.id).then((item) => (item.responseDeclarations ?? []).map((d) => d.identifier)))
	)

	return (
		<React.Suspense fallback={<div>Loading test...</div>}>
			<Content testPromise={testPromise} expectedIdentifiersPromisesPromise={expectedIdentifiersPromisesPromise} />
		</React.Suspense>
	)
}
