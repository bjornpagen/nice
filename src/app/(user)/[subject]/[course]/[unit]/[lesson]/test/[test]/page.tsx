import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchUnitTestPageData } from "@/lib/data-fetching"
import type { UnitTestPageData } from "@/lib/types"
import { TestContent } from "./components/test-content"

// --- REMOVED: The local UnitTestPageData type definition ---

export default function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	logger.info("unit test page: received request, rendering layout immediately")

	const testPromise: Promise<UnitTestPageData> = params.then(fetchUnitTestPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading test...</div>}>
			<TestContent testPromise={testPromise} />
		</React.Suspense>
	)
}
