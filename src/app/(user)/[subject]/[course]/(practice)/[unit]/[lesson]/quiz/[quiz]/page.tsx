import { connection } from "next/server"
import * as React from "react"
import { getCachedQuizPageData } from "@/lib/oneroster/react/assessment-data"
import type { QuizPageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { Content } from "./components/content"
import { getAssessmentItem } from "@/lib/qti/redis/api"

// --- REMOVED: The local QuizPageData type definition ---

export default async function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
const quizPromise: Promise<QuizPageData> = normalizedParamsPromise.then((resolvedParams) =>
	getCachedQuizPageData(
		resolvedParams.subject,
		resolvedParams.course,
		resolvedParams.unit,
		resolvedParams.lesson,
		resolvedParams.quiz
	)
)

	const expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> = quizPromise.then((data) =>
		data.questions.map((q) => getAssessmentItem(q.id).then((item) => (item.responseDeclarations ?? []).map((d) => d.identifier)))
	)

	return (
		<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
			<Content quizPromise={quizPromise} expectedIdentifiersPromisesPromise={expectedIdentifiersPromisesPromise} />
		</React.Suspense>
	)
}
