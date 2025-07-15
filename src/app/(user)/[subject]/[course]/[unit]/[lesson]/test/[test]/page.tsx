import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchUnitTestPageData } from "@/lib/data-fetching"
import { TestContent } from "./test-content"

// --- DEFINED IN-FILE: Data types required by the TestContent component ---
export type UnitTestPageData = {
	test: {
		id: string
		title: string
		description: string
		type: "UnitTest"
	}
	questions: Array<{
		id: string
		exerciseId: string
		qtiIdentifier: string
	}>
}

// --- REMOVED: The local fetchTestData function ---

export default function UnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	logger.info("unit test page: received request, rendering layout immediately")

	const testDataPromise = params.then(fetchUnitTestPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading test...</div>}>
			<TestContent testDataPromise={testDataPromise} />
		</React.Suspense>
	)
}
