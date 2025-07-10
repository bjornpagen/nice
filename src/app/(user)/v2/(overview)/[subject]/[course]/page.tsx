import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { CourseContent } from "@/components/overview/course/content/course-content"
import { type Course, getCourseBlob } from "@/components/overview/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	const coursePromise = params
		.then(({ subject, course }) => {
			logger.debug("initializing course page", { subject, course })
			return getCourseData(subject, course)
		})
		.catch((error) => {
			logger.error("error retrieving course data", { error })
			throw errors.wrap(error, "error retrieving course data")
		})

	return (
		<div id="course-page">
			<ErrorBoundary fallback={<CoursePageErrorFallback />}>
				<React.Suspense>
					<CourseContent coursePromise={coursePromise} />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function CoursePageErrorFallback({ className }: { className?: string }) {
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

	const data = { ..._.pick(blob, ["slug", "path", "title", "description", "resources"]), units: blob.units }
	logger.debug("retrieving course data: data", { keys: _.keys(data), units: data.units.length })

	return data
}
