"use client"

import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import type { CourseChallengePageData } from "@/lib/types/page"

export function TestContent({ testDataPromise }: { testDataPromise: Promise<CourseChallengePageData> }) {
	const { test, questions } = React.use(testDataPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Test"
				onerosterComponentResourceSourcedId={test.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={test.id} // The test resource sourcedId for OneRoster results
				assessmentTitle={test.title}
				expectedXp={test.expectedXp}
			/>
		)
	}

	return (
		<AssessmentStartScreen
			headerTitle={test.title}
			title="Ready for the Course Challenge?"
			subtitle="Test your mastery of the entire course!"
			subtitleColorClass="text-purple-100"
			questionsCount={questions.length}
			onStart={() => setHasStarted(true)}
			bgClass="bg-purple-700"
			contentType="Test"
		/>
	)
}
