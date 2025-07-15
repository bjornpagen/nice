import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { QuizContent } from "@/components/practice/course/unit/quiz/quiz-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob } from "@/lib/v2/types"

export default function PracticeQuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; quiz: string }>
}) {
	// Chain the promise properly to handle the error case
	const quizPromise = params.then(({ subject, course, unit, quiz }) => {
		logger.debug("initializing quiz page", { subject, course, unit, quiz })
		return getQuizData(subject, course, unit, quiz)
	})

	return (
		<div id="practice-quiz-page" className="h-full">
			<ErrorBoundary fallback={<PracticeQuizPageErrorFallback />}>
				<React.Suspense>
					<QuizContent quizPromise={quizPromise} className="h-full bg-blue-950 text-white" />
				</React.Suspense>
			</ErrorBoundary>
		</div>
	)
}

function PracticeQuizPageErrorFallback({ className }: { className?: string }) {
	return (
		<Alert variant="destructive" className={className}>
			<AlertCircleIcon />
			<AlertTitle>Unable to retrieve quiz page content.</AlertTitle>
			<AlertDescription>Please try again later.</AlertDescription>
		</Alert>
	)
}

function getQuizData(
	subject: string,
	course: string,
	unit: string,
	quiz: string
): Extract<CourseMaterial, { type: "Quiz" }> | undefined {
	logger.debug("lesson quiz data: initializing lesson quiz data", { subject, course, unit, quiz })

	const blob = getCourseBlob(subject, course)
	logger.debug("lesson quiz data: blob", { blob })

	const unitData = _.find(blob.units, (u) => u.slug === unit)
	if (unitData == null) {
		logger.error("lesson quiz data: unit not found", { subject, course, unit })
		return undefined
	}

	const quizData = _.find(
		unitData.resources,
		(r): r is Extract<CourseMaterial, { type: "Quiz" }> => r.type === "Quiz" && r.slug === quiz
	)
	if (quizData == null) {
		logger.debug("lesson quiz data: no quiz found for unit", { subject, course, unit })
		return undefined
	}

	return quizData
}
