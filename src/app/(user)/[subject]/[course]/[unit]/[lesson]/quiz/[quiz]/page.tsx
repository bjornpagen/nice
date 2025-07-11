import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { oneroster, qti } from "@/lib/clients"
import type { TestQuestionsResponse } from "@/lib/qti"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { QuizContent } from "./quiz-content"

// Types are now derived from the QTI API response
export type Quiz = TestQuestionsResponse
export type QuizQuestion = TestQuestionsResponse["questions"][number]["question"] & {
	qtiIdentifier: string
}

export type QuizData = {
	quiz: Pick<Quiz, "title" | "totalQuestions"> & { description: string }
	questions: QuizQuestion[]
}

// Consolidated data fetching function for the quiz page
async function fetchQuizData(params: { quiz: string }): Promise<QuizData> {
	// ✅ NEW: Look up resource by slug with namespace filter
	const filter = `sourcedId~'nice:' AND metadata.khanSlug='${params.quiz}' AND metadata.type='qti' AND metadata.subType='qti-test'`
	const resourceResult = await errors.try(oneroster.getAllResources(filter))
	if (resourceResult.error) {
		logger.error("failed to fetch quiz resource by slug", { error: resourceResult.error, slug: params.quiz })
		throw errors.wrap(resourceResult.error, "failed to fetch quiz resource by slug")
	}
	const resource = resourceResult.data[0]
	if (!resource) {
		notFound()
	}
	const quizSourcedId = resource.sourcedId

	const fullQuizData = await qti.getAllQuestionsForTest(quizSourcedId)

	if (!fullQuizData) {
		notFound()
	}

	const questions = fullQuizData.questions.map((q) => ({
		...q.question,
		qtiIdentifier: q.question.identifier // Use the identifier directly from QTI
	}))

	return {
		quiz: {
			title: fullQuizData.title,
			totalQuestions: fullQuizData.totalQuestions,
			description: "" // QTI tests don't have descriptions, use empty string
		},
		questions
	}
}

export default function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	logger.info("quiz page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)
	const quizDataPromise = params.then(fetchQuizData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
				<QuizContent quizDataPromise={quizDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
