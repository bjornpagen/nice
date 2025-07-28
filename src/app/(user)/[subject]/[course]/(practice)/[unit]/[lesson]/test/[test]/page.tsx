import * as React from "react"
import { fetchUnitTestPageData } from "@/lib/data/assessment"
import type { UnitTestPageData } from "@/lib/types/page"
import { Content } from "./components/content"

// --- REMOVED: The local UnitTestPageData type definition ---

export default function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	const testPromise: Promise<UnitTestPageData> = params.then(fetchUnitTestPageData)

	return (
		<React.Suspense fallback={<div>Loading test...</div>}>
			<Content testPromise={testPromise} />
		</React.Suspense>
	)
}
