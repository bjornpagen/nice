import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchCourseChallengePage_LayoutData, fetchCourseChallengePage_TestData } from "@/lib/data-fetching"
import { TestContent } from "./test-content"
import { TestLayout } from "./test-layout"

// --- DEFINED IN-FILE: Data types required by components ---
export type CourseChallengePage_LayoutData = {
	subject: string
	course: { title: string; path: string }
	test: {
		id: string
		type: "CourseChallenge"
		title: string
		slug: string
		description: string
	}
	unit: { title: string; path: string; sortOrder: number; children: [] }
	lesson: { title: string; path: string; children: [] }
}

export type CourseChallengePageData = {
	test: {
		id: string
		type: "CourseChallenge"
		title: string
		slug: string
		description: string
	}
	questions: Array<{
		id: string
		exerciseId: string
		qtiIdentifier: string
	}>
}

export default function CourseChallengePage({
	params
}: {
	params: Promise<{ subject: string; course: string; test: string }>
}) {
	logger.info("course challenge page: received request, rendering layout immediately")

	const layoutDataPromise = params.then(fetchCourseChallengePage_LayoutData)
	const testDataPromise = params.then(fetchCourseChallengePage_TestData)

	return (
		<TestLayout courseDataPromise={layoutDataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading test...</div>}>
				<TestContent testDataPromise={testDataPromise} />
			</React.Suspense>
		</TestLayout>
	)
}
