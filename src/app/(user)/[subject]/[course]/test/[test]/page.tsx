import * as logger from "@superbuilders/slog"
import * as React from "react"
import { fetchCourseChallengePage_LayoutData, fetchCourseChallengePage_TestData } from "@/lib/data-fetching"
import type { CourseChallengeLayoutData, CourseChallengePageData } from "@/lib/types"
import { TestContent } from "./components/test-content"
import { TestLayout } from "./components/test-layout"

export default function CourseChallengePage({
	params
}: {
	params: Promise<{ subject: string; course: string; test: string }>
}) {
	logger.info("course challenge page: received request, rendering layout immediately")

	const layoutDataPromise: Promise<CourseChallengeLayoutData> = params.then(fetchCourseChallengePage_LayoutData)
	const testDataPromise: Promise<CourseChallengePageData> = params.then(fetchCourseChallengePage_TestData)

	return (
		<TestLayout courseDataPromise={layoutDataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading course challenge...</div>}>
				<TestContent testDataPromise={testDataPromise} />
			</React.Suspense>
		</TestLayout>
	)
}
