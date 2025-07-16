import * as logger from "@superbuilders/slog"
import _ from "lodash"
import { AlertCircleIcon } from "lucide-react"
import * as React from "react"
import { ErrorBoundary } from "react-error-boundary"
import { QuizContent } from "@/components/practice/course/unit/quiz/quiz-content"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type CourseMaterial, getCourseBlob, getCourseMaterials, type LessonResource } from "@/lib/v2/types"

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
	logger.info("lesson quiz data: initializing lesson quiz data", { subject, course, unit, quiz })

	const blob = getCourseBlob(subject, course)
	logger.info("lesson quiz data: blob retrieved", { subject, course, unit, quiz, blobKeys: _.keys(blob) })

	const materials = getCourseMaterials(blob)
	logger.info("lesson quiz data: materials extracted", { subject, course, unit, quiz, materialCount: materials.length })

	const quizIndex = materials.findIndex(
		(u): u is Extract<CourseMaterial, { type: "Quiz" }> => u.type === "Quiz" && u.slug === quiz
	)
	if (quizIndex === -1) {
		logger.error("lesson quiz data: quiz not found", { subject, course, unit, quiz })
		return undefined
	}
	logger.info("lesson quiz data: quiz index found", { subject, course, unit, quiz, quizIndex })

	const quizData = materials[quizIndex]
	if (quizData == null || quizData.type !== "Quiz") {
		logger.error("lesson quiz data: quiz data not found", { subject, course, unit, quiz })
		return undefined
	}
	logger.info("lesson quiz data: quiz data retrieved", { subject, course, unit, quiz, quizDataKeys: _.keys(quizData) })

	let nextMaterial:
		| { type: CourseMaterial["type"]; path: string; title: string; resources?: LessonResource[] }
		| undefined = materials[quizIndex + 1]
	if (nextMaterial != null && nextMaterial.type === "Lesson") {
		const nextFromLesson = nextMaterial.resources?.find(
			(r): r is Extract<CourseMaterial, { type: "Article" | "Exercise" | "Video" }> => r != null
		)
		if (nextFromLesson != null) {
			nextMaterial = { type: nextFromLesson.type, path: nextFromLesson.path, title: nextFromLesson.title }
		}
	}
	logger.info("lesson quiz data: next material identified", {
		subject,
		course,
		unit,
		quiz,
		nextMaterial
	})

	if (nextMaterial != null) {
		quizData.meta = {
			...quizData.meta,
			next: { type: nextMaterial.type, path: nextMaterial.path, title: nextMaterial.title }
		}
		logger.info("lesson quiz data: quiz data enhanced with next material", {
			subject,
			course,
			unit,
			quiz,
			nextMaterial
		})
	}

	return quizData
}
