import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { UnitTestContent } from "@/components/practice/course/unit/test/unit-test-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob, getCourseMaterials, type LessonResource } from "@/lib/v2/types"

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
	logger.info("lesson unit test data: initializing lesson unit test data", { subject, course, unit, test })

	const blob = getCourseBlob(subject, course)
	logger.info("lesson unit test data: blob retrieved", { subject, course, unit, test, blobKeys: _.keys(blob) })

	const materials = getCourseMaterials(blob)
	logger.info("lesson unit test data: materials extracted", {
		subject,
		course,
		unit,
		test,
		materialCount: materials.length
	})

	const unitTestIndex = materials.findIndex(
		(u): u is Extract<CourseMaterial, { type: "UnitTest" }> => u.type === "UnitTest" && u.slug === test
	)
	if (unitTestIndex === -1) {
		logger.error("lesson unit test data: unit test not found", { subject, course, unit, test })
		return undefined
	}
	logger.info("lesson unit test data: unit test index found", { subject, course, unit, test, unitTestIndex })

	const unitTestData = materials[unitTestIndex]
	if (unitTestData == null || unitTestData.type !== "UnitTest") {
		logger.error("lesson unit test data: unit test data not found", { subject, course, unit, test })
		return undefined
	}
	logger.info("lesson unit test data: unit test data retrieved", {
		subject,
		course,
		unit,
		test,
		unitTestDataKeys: _.keys(unitTestData)
	})

	let nextMaterial:
		| { type: CourseMaterial["type"]; path: string; title: string; resources?: LessonResource[] }
		| undefined = materials[unitTestIndex + 1]
	if (nextMaterial != null && nextMaterial.type === "Lesson") {
		const nextFromLesson = nextMaterial.resources?.find(
			(r): r is Extract<CourseMaterial, { type: "Article" | "Exercise" | "Video" }> => r != null
		)
		if (nextFromLesson != null) {
			nextMaterial = { type: nextFromLesson.type, path: nextFromLesson.path, title: nextFromLesson.title }
		}
	}

	logger.info("lesson unit test data: next material identified", {
		subject,
		course,
		unit,
		test,
		nextMaterial
	})

	if (nextMaterial != null) {
		unitTestData.meta = {
			...unitTestData.meta,
			next: { type: nextMaterial.type, path: nextMaterial.path, title: nextMaterial.title }
		}
		logger.info("lesson unit test data: unit test data enhanced with next material", {
			subject,
			course,
			unit,
			test,
			nextMaterial
		})
	}

	return unitTestData
}
