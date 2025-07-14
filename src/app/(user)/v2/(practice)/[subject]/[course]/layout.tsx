import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Footer } from "@/components/footer"
import { CourseSidebar } from "@/components/practice/course/sidebar/course-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type Course, getCourseBlob } from "@/lib/v2/types"

export default async function PracticeCourseLayout({
	children,
	params
}: {
	children: React.ReactNode
	params: Promise<{ subject: string; course: string }>
}) {
	const coursePromise = params
		.then(({ subject, course }) => {
			logger.debug("initializing course layout", { subject, course })
			return getCourseSidebarData(subject, course)
		})
		.catch((error) => {
			logger.error("error retrieving course sidebar data", { error })
			throw errors.wrap(error, "error retrieving course sidebar data")
		})

	return (
		<div id="practice-course-layout">
			<div className="flex flex-row">
				<nav id="practice-course-layout-sidebar" className="flex-none hidden md:block lg:block sticky top-14 h-screen">
					<ErrorBoundary fallback={<PracticeCourseLayoutErrorFallback />}>
						<React.Suspense>
							<CourseSidebar coursePromise={coursePromise} className="w-112" />
						</React.Suspense>
					</ErrorBoundary>
				</nav>

				<main id="practice-course-layout-main" className="flex-1 bg-gray-50 px-8 py-4 w-screen">
					{children}
				</main>
			</div>

			<div id="practice-course-layout-footer flex-none">
				<Footer />
			</div>
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
