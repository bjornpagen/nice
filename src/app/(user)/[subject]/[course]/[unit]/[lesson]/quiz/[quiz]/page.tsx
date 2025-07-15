import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchQuizPageData } from "@/lib/data-fetching"
import { QuizContent } from "./quiz-content"

// --- DEFINED IN-FILE: Data types required by the QuizContent component ---
export type QuizPageData = {
	quiz: {
		id: string
		title: string
		description: string
		type: "Quiz"
	}
	questions: Array<{
		id: string
		exerciseId: string
		qtiIdentifier: string
	}>
}

// --- REMOVED: The local fetchQuizData function ---

export default function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	logger.info("quiz page: received request, rendering layout immediately")

	const quizDataPromise = params.then(fetchQuizPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
			<QuizContent quizDataPromise={quizDataPromise} />
		</React.Suspense>
	)
}
