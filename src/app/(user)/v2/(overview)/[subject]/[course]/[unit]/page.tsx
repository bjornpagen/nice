import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { getCourseBlob } from "@/components/overview/types"
import { UnitContent, type UnitContentData } from "@/components/overview/unit/content/unit-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

function getUnitData(subject: string, course: string, unit: string): UnitContentData {
	logger.debug("retrieving unit data", { subject, course, unit })

	const unitData = getCourseBlob(subject, course).units.find((u) => u.slug === unit)
	if (!unitData) {
		throw errors.new(`unit not found: ${unit}`)
	}

	return unitData
}
