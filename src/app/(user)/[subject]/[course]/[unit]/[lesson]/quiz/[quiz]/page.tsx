import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchQuizPageData } from "@/lib/data-fetching"
import type { QuizPageData } from "@/lib/types"
import { QuizContent } from "./quiz-content"

// --- REMOVED: The local QuizPageData type definition ---

export default function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	logger.info("quiz page: received request, rendering layout immediately")

	const quizPromise: Promise<QuizPageData> = params.then(fetchQuizPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
			<QuizContent quizPromise={quizPromise} />
		</React.Suspense>
	)
}
