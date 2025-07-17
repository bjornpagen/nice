import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CourseContent } from "@/components/overview/course/content/course-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type Course, getCourseBlob } from "@/lib/v2/types"

export default async function OverviewCoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	const coursePromise = params.then(({ subject, course }) => {
		logger.debug("initializing course page", { subject, course })
		return getCourseData(subject, course)
	})

	return (
		<div id="overview-course-page">
			<ErrorBoundary fallback={<OverviewCoursePageErrorFallback />}>
				<React.Suspense>
					<CourseContent coursePromise={coursePromise} />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function OverviewCoursePageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve course page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getCourseData(subject: string, course: string): Course | undefined {
	logger.debug("retrieving course data", { subject, course })

	const blob = getCourseBlob(subject, course)
	logger.debug("retrieving course data: blob", { keys: _.keys(blob) })

	const data = {
		..._.pick(blob, ["slug", "path", "title", "description", "resources"]),
		type: "Course" as const,
		units: blob.units
	}
	logger.debug("retrieving course data: data", { keys: _.keys(data), units: data.units.length })

	return data
}
