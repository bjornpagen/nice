import { redirect } from "next/navigation"
import * as React from "react"
import { Content } from "@/app/(user)/profile/me/progress/components/content"
import { fetchProgressPageData, type ProgressPageData } from "@/lib/data/progress"

export default function ProgressPage() {
	redirect("/profile/me/courses")
	const progressPromise: Promise<ProgressPageData> = fetchProgressPageData()

	return (
		<React.Suspense fallback={<div className="text-gray-500">Loading progress...</div>}>
			<Content progressPromise={progressPromise} />
		</React.Suspense>
	)
}
