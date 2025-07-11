import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import * as React from "react"
import { fetchLessonData } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-data"
import { LessonLayout } from "@/app/(user)/[subject]/[course]/[unit]/[lesson]/lesson-layout"
import { oneroster, qti } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"
import type { TestQuestionsResponse } from "@/lib/qti"
import { TestContent } from "./test-content"

// Types are now derived from the QTI API response
export type Test = TestQuestionsResponse & {
	description: string
}

export type TestQuestion = TestQuestionsResponse["questions"][number]["question"] & {
	qtiIdentifier: string
}

export type TestData = {
	test: Pick<Test, "title" | "totalQuestions"> & { description: string }
	questions: TestQuestion[]
}

// Consolidated data fetching function for the test page
async function fetchTestData(params: { test: string }): Promise<TestData> {
	// ✅ NEW: Look up resource by slug with namespace filter
	const prefixFilter = createPrefixFilter("nice:")
	const filter = `${prefixFilter} AND metadata.khanSlug='${params.test}' AND metadata.type='qti' AND status='active'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch test resource by slug", { error: resourceResult.error, slug: params.test })
		throw errors.wrap(resourceResult.error, "failed to fetch test resource by slug")
	}
	const resource = resourceResult.data[0]
	if (!resource) {
		notFound()
	}
	const testSourcedId = resource.sourcedId

	logger.info("fetchTestData: fetching QTI test details", { testSourcedId })

	const qtiTestData = await qti.getAllQuestionsForTest(testSourcedId)

	logger.info("fetchTestData: test data retrieved", {
		testSourcedId,
		title: qtiTestData.title,
		questionCount: qtiTestData.totalQuestions
	})

	const questions = qtiTestData.questions.map((q) => ({
		...q.question,
		qtiIdentifier: q.question.identifier // Use the identifier directly from QTI
	}))

	return {
		test: {
			title: qtiTestData.title,
			totalQuestions: qtiTestData.totalQuestions,
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
