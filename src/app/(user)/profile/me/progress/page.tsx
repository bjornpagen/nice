import * as React from "react"
import { fetchProgressPageData, type ProgressPageData } from "@/lib/data/progress"
import { Content } from "./components/content"

export default function ProgressPage() {
	const progressPromise: Promise<ProgressPageData> = fetchProgressPageData()

	return (
		<React.Suspense fallback={<div className="text-gray-500">Loading progress...</div>}>
			<Content progressPromise={progressPromise} />
		</React.Suspense>
	)
}
