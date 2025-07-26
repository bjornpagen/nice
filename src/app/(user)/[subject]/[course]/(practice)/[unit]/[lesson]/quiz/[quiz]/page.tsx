import * as React from "react"
import { fetchQuizPageData } from "@/lib/data/assessment"
import type { QuizPageData } from "@/lib/types/page"
import { QuizContent } from "./components/quiz-content"

// --- REMOVED: The local QuizPageData type definition ---

export default function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	const quizPromise: Promise<QuizPageData> = params.then(fetchQuizPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
			<QuizContent quizPromise={quizPromise} />
		</React.Suspense>
	)
}
