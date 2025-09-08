import { connection } from "next/server"
import * as React from "react"
import { Content } from "@/app/(user)/profile/me/metrics/content"
import { type CourseMetrics, getAllCourseMetrics, type MetricsDateRange } from "@/lib/data/metrics"

export default async function MetricsPage() {
	// Await connection to ensure dynamic rendering
	await connection()

	// Default to current month range (UTC)
	const now = new Date()
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
	const range: MetricsDateRange = {
		fromIso: monthStart.toISOString(),
		toIso: now.toISOString()
	}

	const metricsPromise: Promise<CourseMetrics[]> = getAllCourseMetrics(range)

	return (
		<React.Suspense fallback={<div className="text-gray-500">Loading metrics...</div>}>
			<Content metricsPromise={metricsPromise} />
		</React.Suspense>
	)
}
