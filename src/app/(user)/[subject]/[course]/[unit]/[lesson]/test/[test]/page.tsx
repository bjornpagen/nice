import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { qti } from "@/lib/clients"
import type { TestQuestionsResponse } from "@/lib/qti"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { TestContent } from "./test-content"

// Types are now derived from the QTI API response
export type Test = TestQuestionsResponse
export type TestQuestion = TestQuestionsResponse["questions"][number]["question"] & {
	qtiIdentifier: string
}

export type TestData = {
	test: Pick<Test, "title" | "totalQuestions"> & { description: string }
	questions: TestQuestion[]
}

// Consolidated data fetching function for the test page
async function fetchTestData(params: { test: string }): Promise<TestData> {
	const testSourcedId = `nice:${params.test}`

	const fullTestData = await qti.getAllQuestionsForTest(testSourcedId)

	if (!fullTestData) {
		notFound()
	}

	const questions = fullTestData.questions.map((q) => ({
		...q.question,
		qtiIdentifier: q.question.identifier // Use the identifier directly from QTI
	}))

	return {
		test: {
			title: fullTestData.title,
			totalQuestions: fullTestData.totalQuestions,
			description: "" // QTI tests don't have descriptions, use empty string
		},
		questions
	}
}

export default function TestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	logger.info("test page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)
	const testDataPromise = params.then(fetchTestData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading test...</div>}>
				<TestContent testDataPromise={testDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
