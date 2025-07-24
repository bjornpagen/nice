import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CourseContentHeader } from "@/components/practice/course/content/course-content-header"
import { CourseSidebar } from "@/components/practice/course/sidebar/course-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { type AssessmentProgress, getUserUnitProgress } from "@/lib/data/progress"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { type Course, getCourseBlob } from "@/lib/v2/types"

export default async function PracticeCourseLayout({
	children,
	params
}: {
	children: React.ReactNode
	params: Promise<{ subject: string; course: string }>
}) {
	const coursePromise = params.then(({ subject, course }) => {
		logger.debug("initializing course layout", { subject, course })
		return getCourseSidebarData(subject, course)
	})

	// Get progress data similar to main lesson layout
	const progressPromise = params.then(async ({ course }) => {
		const user = await currentUser()
		if (user?.publicMetadata) {
			const publicMetadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
			if (publicMetadataResult.error) {
				logger.warn("invalid user public metadata, cannot fetch progress", {
					userId: user.id,
					error: publicMetadataResult.error
				})
				return new Map<string, AssessmentProgress>()
			}
			if (publicMetadataResult.data.sourceId) {
				return getUserUnitProgress(publicMetadataResult.data.sourceId, course)
			}
		}
		return new Map<string, AssessmentProgress>()
	})

	return (
		<div id="practice-course-layout">
			<SidebarProvider>
				<div className="flex flex-row w-full">
					<nav id="practice-course-layout-sidebar" className="flex-none hidden md:block lg:block sticky top-14 h-full">
						<ErrorBoundary fallback={<PracticeCourseLayoutErrorFallback />}>
							<React.Suspense>
								<CourseSidebar coursePromise={coursePromise} progressPromise={progressPromise} className="w-96" />
							</React.Suspense>
						</ErrorBoundary>
					</nav>

					<main id="practice-course-layout-main" className="relative flex-1 bg-gray-50 flex flex-col h-full w-full">
						<SidebarTrigger className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-none z-10 rounded-l-none rounded-r-md hover:cursor-pointer hidden md:flex" />

						<ErrorBoundary fallback={<PracticeCourseLayoutErrorFallback />}>
							<React.Suspense>
								<CourseContentHeader coursePromise={coursePromise} className="bg-white p-8 flex-none" />
								<div className="flex-1 h-full">{children}</div>
							</React.Suspense>
						</ErrorBoundary>
					</main>
				</div>
			</SidebarProvider>
		</div>
	)
}

function PracticeCourseLayoutErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve course sidebar content.</AlertTitle>
			<AlertDescription>
				<p>Please try again later.</p>
			</AlertDescription>
		</Alert>
	)
}

function getCourseSidebarData(subject: string, course: string): Course | undefined {
	logger.debug("retrieving course data", { subject, course })

	const blob = getCourseBlob(subject, course)
	logger.debug("retrieving course data: blob", { keys: _.keys(blob) })

	return blob
}
