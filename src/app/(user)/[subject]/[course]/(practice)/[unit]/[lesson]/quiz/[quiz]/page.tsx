import { connection } from "next/server"
import * as React from "react"
import { fetchQuizPageData } from "@/lib/data/assessment"
import type { QuizPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"

// --- REMOVED: The local QuizPageData type definition ---

export default async function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
	const quizPromise: Promise<QuizPageData> = normalizedParamsPromise.then(fetchQuizPageData)

	return (
		<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
			<Content quizPromise={quizPromise} />
		</React.Suspense>
	)
}
