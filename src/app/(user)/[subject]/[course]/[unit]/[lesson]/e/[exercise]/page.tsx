import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { qti } from "@/lib/clients"
import type { TestQuestionsResponse } from "@/lib/qti"
import { ErrQtiNotFound } from "@/lib/qti"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { ExerciseContent } from "./exercise-content"

// Types are now derived from the QTI API response
export type Exercise = TestQuestionsResponse
export type ExerciseQuestion = TestQuestionsResponse["questions"][number]["question"] & {
	qtiIdentifier: string
}

export type ExerciseData = {
	exercise: Pick<Exercise, "title" | "totalQuestions"> & { description: string }
	questions: ExerciseQuestion[]
}

// Consolidated data fetching function for the exercise page
async function fetchExerciseData(params: { exercise: string }): Promise<ExerciseData> {
	logger.info("fetchExerciseData: starting", { params })

	const exerciseSourcedId = `nice:${params.exercise}`
	logger.info("fetchExerciseData: constructed sourced id", { exerciseSourcedId, originalParam: params.exercise })

	logger.info("fetchExerciseData: about to call qti.getAllQuestionsForTest", { exerciseSourcedId })

	const qtiResult = await errors.try(qti.getAllQuestionsForTest(exerciseSourcedId))
	if (qtiResult.error) {
		logger.error("fetchExerciseData: qti call failed", {
			exerciseSourcedId,
			error: qtiResult.error,
			errorType: qtiResult.error.constructor.name,
			errorMessage: qtiResult.error.message,
			isQtiNotFound: errors.is(qtiResult.error, ErrQtiNotFound)
		})

		// Handle QTI 404 errors specifically
		if (errors.is(qtiResult.error, ErrQtiNotFound)) {
			logger.error("fetchExerciseData: assessment test not found in QTI", {
				exerciseSourcedId,
				message: "This exercise exists in the database but has no corresponding Assessment Test in QTI"
			})
			// Return an empty exercise instead of throwing
			return {
				exercise: {
					title: params.exercise.charAt(0).toUpperCase() + params.exercise.slice(1),
					totalQuestions: 0,
					description: ""
				},
				questions: []
			}
		}

		throw errors.wrap(qtiResult.error, "failed to fetch exercise data from QTI")
	}

	const fullExerciseData = qtiResult.data
	logger.info("fetchExerciseData: qti call succeeded", {
		exerciseSourcedId,
		hasData: !!fullExerciseData,
		dataKeys: fullExerciseData ? Object.keys(fullExerciseData) : null,
		title: fullExerciseData?.title,
		totalQuestions: fullExerciseData?.totalQuestions,
		questionsCount: fullExerciseData?.questions?.length
	})

	if (!fullExerciseData) {
		logger.error("fetchExerciseData: no data returned from QTI", { exerciseSourcedId })
		notFound()
	}

	logger.debug("fetchExerciseData: processing questions", {
		exerciseSourcedId,
		questionsLength: fullExerciseData.questions?.length,
		questions: fullExerciseData.questions?.map((q) => ({
			identifier: q.question.identifier,
			title: q.question.title
		}))
	})

	const questions = fullExerciseData.questions.map((q, index) => {
		logger.debug("fetchExerciseData: processing question", {
			index,
			questionIdentifier: q.question.identifier,
			questionTitle: q.question.title,
			questionKeys: Object.keys(q.question)
		})

		return {
			...q.question,
			qtiIdentifier: q.question.identifier // Use the identifier directly from QTI
		}
	})

	const result: ExerciseData = {
		exercise: {
			title: fullExerciseData.title,
			totalQuestions: fullExerciseData.totalQuestions,
			description: "" // QTI tests don't have descriptions, use empty string
		},
		questions
	}

	logger.info("fetchExerciseData: completed successfully", {
		exerciseSourcedId,
		resultKeys: Object.keys(result),
		exerciseTitle: result.exercise.title,
		exerciseTotalQuestions: result.exercise.totalQuestions,
		questionsCount: result.questions.length
	})

	return result
}

export default function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	logger.info("exercise page: received request, rendering layout immediately")

	const dataPromise = params.then((resolvedParams) => {
		logger.info("exercise page: resolving lesson data params", { resolvedParams })
		return fetchLessonData(resolvedParams)
	})

	const exerciseDataPromise = params.then(async (resolvedParams) => {
		logger.info("exercise page: resolving exercise data params", { resolvedParams })
		const result = await errors.try(fetchExerciseData(resolvedParams))
		if (result.error) {
			logger.error("exercise page: exercise data promise failed", {
				error: result.error,
				resolvedParams,
				errorType: result.error.constructor.name,
				errorMessage: result.error.message
			})
			throw result.error
		}

		logger.info("exercise page: exercise data promise resolved successfully", {
			exerciseTitle: result.data.exercise.title,
			questionsCount: result.data.questions.length
		})
		return result.data
	})

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading exercise...</div>}>
				<ExerciseContent exerciseDataPromise={exerciseDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
