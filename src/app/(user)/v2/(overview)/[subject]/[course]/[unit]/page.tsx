import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { UnitContent, type UnitContentData } from "@/components/overview/unit/content/unit-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCourseBlob } from "@/lib/v2/types"

export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	// Chain the promise properly to handle the error case
	const unitPromise = params.then(({ subject, course, unit }) => {
		logger.debug("initializing unit page", { subject, course, unit })
		return getUnitData(subject, course, unit)
	})

	return (
		<div id="unit-page">
			<ErrorBoundary fallback={<UnitPageErrorFallback />}>
				<React.Suspense>
					<UnitContent unitPromise={unitPromise} />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function UnitPageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve unit page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getUnitData(subject: string, course: string, unit: string): UnitContentData | undefined {
	logger.debug("retrieving unit data", { subject, course, unit })

	const unitData = _.find(getCourseBlob(subject, course).units, (u) => u.slug === unit)
	if (unitData == null) {
		logger.error("unit not found", { subject, course, unit })
		return undefined
	}

	const lessons = _.map(unitData.lessons, (lesson) => ({ ...lesson, type: "Lesson" as const }))
	if (lessons.length === 0) {
		logger.debug("no lessons found for unit", { subject, course, unit })
	}

	return {
		...unitData,
		lessons
	}
}
