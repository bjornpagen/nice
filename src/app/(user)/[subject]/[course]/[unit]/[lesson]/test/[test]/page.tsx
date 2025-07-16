import * as React from "react"
import { fetchUnitTestPageData } from "@/lib/data/assessment"
import type { UnitTestPageData } from "@/lib/types/page"
import { TestContent } from "./components/test-content"

// --- REMOVED: The local UnitTestPageData type definition ---

export default function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	const testPromise: Promise<UnitTestPageData> = params.then(fetchUnitTestPageData)

	return (
		<React.Suspense fallback={<div>Loading test...</div>}>
			<TestContent testPromise={testPromise} />
		</React.Suspense>
	)
}
