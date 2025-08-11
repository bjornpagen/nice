import * as React from "react"
import { Sidebar } from "@/app/(user)/[subject]/[course]/(overview)/components/sidebar"
import { Footer } from "@/components/footer"
import { fetchCoursePageData } from "@/lib/data/course"
import type { AssessmentProgress, UnitProficiency } from "@/lib/data/progress"
import type { CoursePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"

// Re-define CourseProgressData here as it's a shared concept
export interface CourseProgressData {
	progressMap: Map<string, AssessmentProgress>
	unitProficiencies: UnitProficiency[]
}

// This layout component is NOT async. It orchestrates promises and renders immediately.
export default function CourseLayout({
	params,
	children
}: {
	params: Promise<{ subject: string; course: string }>
	children: React.ReactNode
}) {
	// Normalize params to handle encoded characters
	const normalizedParamsPromise = normalizeParams(params)

	// Initiate the data fetch for the course, which is needed by the sidebar.
	// We do not await it here; the promise is passed down.
	const courseDataPromise: Promise<CoursePageData> = normalizedParamsPromise.then((resolvedParams) =>
		fetchCoursePageData(resolvedParams, { skip: { questions: true } })
	)

	return (
		<div className="h-full overflow-y-auto overflow-x-hidden max-w-full">
			<div className="flex max-w-full min-h-screen">
				{/* Sidebar */}
				<div className="flex-shrink-0 w-96">
					<div className="sticky top-0 w-96 max-h-screen overflow-y-auto">
						{/*
						  Wrap the sidebar in a Suspense boundary. This allows the main page content
						  ({children}) to be rendered and streamed to the client immediately,
						  while the sidebar fetches its data in parallel.
						*/}
						<React.Suspense fallback={<div className="w-96 bg-gray-100 animate-pulse h-screen" />}>
							{/*
							  Pass the promise directly to the sidebar component. The sidebar will
							  need to be updated to use React.use() to consume the promise.
							*/}
							<Sidebar
								course={courseDataPromise.then((data) => data.course)}
								lessonCount={courseDataPromise.then((data) => data.lessonCount)}
								challenges={courseDataPromise.then((data) => data.course.challenges)}
							/>
						</React.Suspense>
					</div>
				</div>

				{/* Main Content Area - Standardized CSS classes */}
				<div className="flex-1 p-6 bg-gray-50 min-w-0">{children}</div>
			</div>

			{/* Footer moved outside flex container to span full width */}
			<Footer />
		</div>
	)
}
