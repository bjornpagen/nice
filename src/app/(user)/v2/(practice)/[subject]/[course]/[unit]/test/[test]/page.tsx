import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { UnitTestContent } from "@/components/practice/course/unit/test/unit-test-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob } from "@/lib/v2/types"

export default function PracticeUnitTestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; test: string }>
}) {
	// Chain the promise properly to handle the error case
	const unitTestPromise = params.then(({ subject, course, unit, test }) => {
		logger.debug("initializing unit test page", { subject, course, unit, test })
		return getUnitTestData(subject, course, unit, test)
	})

	return (
		<div id="practice-unit-test-page" className="h-full">
			<ErrorBoundary fallback={<PracticeUnitTestPageErrorFallback />}>
				<React.Suspense>
					<UnitTestContent unitTestPromise={unitTestPromise} className="h-full bg-blue-950 text-white" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeUnitTestPageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve quiz page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getUnitTestData(
	subject: string,
	course: string,
	unit: string,
	test: string
): Extract<CourseMaterial, { type: "UnitTest" }> | undefined {
	logger.debug("lesson unit test data: initializing lesson unit test data", { subject, course, unit, test })

	const blob = getCourseBlob(subject, course)
	logger.debug("lesson unit test data: blob", { blob })

	const unitData = _.find(blob.units, (u) => u.slug === unit)
	if (unitData == null) {
		logger.error("lesson unit test data: unit not found", { subject, course, unit })
		return undefined
	}

	const unitTestData = _.find(
		unitData.resources,
		(r): r is Extract<CourseMaterial, { type: "UnitTest" }> => r.type === "UnitTest" && r.slug === test
	)
	if (unitTestData == null) {
		logger.debug("lesson unit test data: no unit test found for unit", { subject, course, unit })
		return undefined
	}

	return unitTestData
}
