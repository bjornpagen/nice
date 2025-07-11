import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { fetchLessonData } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-data"
import { LessonLayout } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-layout"
import { oneroster, qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { Content } from "./content"

// Type for enriched exercise data
export type ExerciseQuestion = {
	id: string
	identifier: string
	title: string
}

export type Exercise = {
	id: string
	title: string
	identifier: string
}

export type ExerciseData = {
	exercise: Exercise
	questions: ExerciseQuestion[]
}

// Consolidated data fetching function for the exercise page
async function fetchExerciseData(params: { exercise: string }): Promise<ExerciseData> {
	logger.info("fetchExerciseData: starting", { params })

	// ✅ NEW: Look up resource by slug with namespace filter
	const filter = `sourcedId~'nice:' AND metadata.khanSlug='${params.exercise}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources(filter))
	if (resourceResult.error) {
		logger.error("failed to fetch exercise resource by slug", { error: resourceResult.error, slug: params.exercise })
		throw errors.wrap(resourceResult.error, "failed to fetch exercise resource by slug")
	}
	const resource = resourceResult.data[0]
	if (!resource) {
		notFound()
	}
	const exerciseSourcedId = resource.sourcedId

	logger.info("fetchExerciseData: constructed sourced id", { exerciseSourcedId, originalParam: params.exercise })

	logger.info("fetching test questions from QTI", { exerciseSourcedId })

	// Fetch questions from QTI
	const testQuestionsResult = await errors.try(qti.getAllQuestionsForTest(exerciseSourcedId))
	if (testQuestionsResult.error) {
		logger.error("failed to fetch test questions", { error: testQuestionsResult.error, exerciseSourcedId })
		if (testQuestionsResult.error.constructor.name === ErrQtiNotFound.name) {
			notFound()
		}
		throw errors.wrap(testQuestionsResult.error, "fetch test questions")
	}

	const testQuestions = testQuestionsResult.data

	logger.info("successfully fetched test questions", {
		exerciseSourcedId,
		testTitle: testQuestions.title,
		questionCount: testQuestions.questions.length
	})

	// Transform the questions
	const questions = testQuestions.questions.map((q) => ({
		id: q.question.identifier,
		identifier: q.question.identifier,
		title: q.question.title || "Question"
	}))

	return {
		exercise: {
			id: exerciseSourcedId,
			title: testQuestions.title,
			identifier: testQuestions.assessmentTest
		},
		questions
	}
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
				<Content exerciseDataPromise={exerciseDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
