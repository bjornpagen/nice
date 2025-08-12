import { connection } from "next/server"
import * as React from "react"
import { fetchUnitTestPageData } from "@/lib/data/assessment"
import type { UnitTestPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

// --- REMOVED: The local UnitTestPageData type definition ---

export default async function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
	const testPromise: Promise<UnitTestPageData> = normalizedParamsPromise.then(fetchUnitTestPageData)

	return (
		<React.Suspense fallback={<div>Loading test...</div>}>
			<Content testPromise={testPromise} />
		</React.Suspense>
	)
}
