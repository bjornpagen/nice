import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { LessonExerciseContent } from "@/components/practice/lesson/exercise/lesson-exercise-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCourseBlob, type LessonResource } from "@/lib/v2/types"

export default function PracticeExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	// Chain the promise properly to handle the error case
	const exercisePromise = params.then(({ subject, course, unit, lesson, exercise }) => {
		logger.debug("initializing exercise page", { subject, course, unit, lesson, exercise })
		return getExerciseData(subject, course, unit, lesson, exercise)
	})

	return (
		<div id="practice-exercise-page" className="h-full">
			<ErrorBoundary fallback={<PracticeExercisePageErrorFallback />}>
				<React.Suspense>
					<LessonExerciseContent exercisePromise={exercisePromise} className="h-full bg-blue-950 text-white" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeExercisePageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve exercise page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getExerciseData(
	subject: string,
	course: string,
	unit: string,
	lesson: string,
	exercise: string
): Extract<LessonResource, { type: "Exercise" }> | undefined {
	logger.debug("lesson exercise data: initializing lesson exercise data", { subject, course, unit, lesson, exercise })

	const blob = getCourseBlob(subject, course)
	logger.debug("lesson exercise data: blob", { blob })

	const unitData = _.find(blob.units, (u) => u.slug === unit)
	if (unitData == null) {
		logger.error("lesson exercise data: unit not found", { subject, course, unit })
		return undefined
	}

	const lessonData = _.find(unitData.lessons, (l) => l.slug === lesson)
	if (lessonData == null) {
		logger.debug("lesson exercise data: no lessons found for unit", { subject, course, unit })
		return undefined
	}

	const exerciseData = _.find(
		lessonData.resources,
		(r): r is Extract<LessonResource, { type: "Exercise" }> => r.type === "Exercise" && r.slug === exercise
	)
	if (exerciseData == null) {
		logger.debug("lesson exercise data: no exercises found for lesson", { subject, course, unit, lesson })
		return undefined
	}

	return exerciseData
}
