import { connection } from "next/server"
import * as React from "react"
import { Content } from "@/app/(user)/profile/me/metrics/content"
import { Skeleton } from "@/components/ui/skeleton"
import { type CourseMetrics, getAllCourseMetrics, type MetricsDateRange } from "@/lib/data/metrics"
import { getStrugglingStudents, type StrugglingStudentsData } from "@/lib/actions/metrics"

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
	const strugglingPromise: Promise<StrugglingStudentsData> = metricsPromise.then((metrics) => {
		const courseIds = metrics.map(m => m.courseId)
		return getStrugglingStudents(courseIds)
	})

	return (
		<React.Suspense
			fallback={
				<div className="space-y-6">
					<div className="flex items-center justify-between gap-4">
						<Skeleton className="h-8 w-40" />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="rounded-lg border border-gray-200 p-5 bg-white">
								<Skeleton className="h-5 w-56 mb-2" />
								<Skeleton className="h-4 w-32" />
							</div>
						))}
					</div>
				</div>
			}
		>
			<Content metricsPromise={metricsPromise} strugglingPromise={strugglingPromise} />
		</React.Suspense>
	)
}
