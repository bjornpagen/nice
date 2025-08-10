import { currentUser } from "@clerk/nextjs/server"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { Sidebar } from "@/app/(user)/[subject]/[course]/(overview)/components/sidebar"
import { Footer } from "@/components/footer"
import { fetchCoursePageData } from "@/lib/data/course"
import { type AssessmentProgress, getUserUnitProgress, type UnitProficiency } from "@/lib/data/progress"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { CoursePageData } from "@/lib/types/page"
import { buildResourceLockStatus, normalizeParams } from "@/lib/utils"
import { aggregateUnitProficiencies } from "@/lib/utils/progress"

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

	const userPromise = currentUser()

	// Fetch progress data for the course. This is needed for the lock status calculation.
	const progressPromise: Promise<CourseProgressData> = Promise.all([courseDataPromise, userPromise]).then(
		([courseData, user]) => {
			if (user) {
				const parsed = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
				if (!parsed.success) {
					logger.warn("invalid user public metadata, cannot fetch progress", {
						userId: user.id,
						error: parsed.error
					})
					return { progressMap: new Map<string, AssessmentProgress>(), unitProficiencies: [] }
				}
				if (parsed.data.sourceId) {
					return getUserUnitProgress(parsed.data.sourceId, courseData.course.id).then((progressMap) => {
						const unitProficiencies = aggregateUnitProficiencies(progressMap, courseData.course.units)
						return { progressMap, unitProficiencies }
					})
				}
			}
			return { progressMap: new Map<string, AssessmentProgress>(), unitProficiencies: [] }
		}
	)

	// Calculate the lock status for all resources in the course.
	const resourceLockStatusPromise: Promise<Record<string, boolean>> = Promise.all([
		courseDataPromise,
		progressPromise,
		userPromise
	]).then(([courseData, progressData, user]) => {
		const lockingEnabled = Boolean(user)
		return buildResourceLockStatus(courseData.course, progressData.progressMap, lockingEnabled)
	})

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
								resourceLockStatusPromise={resourceLockStatusPromise}
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
