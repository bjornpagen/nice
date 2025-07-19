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
			<AssessmentStepper questions={questions} contentType="Test" assessmentId={test.id} assessmentTitle={test.title} />
		)
	}

	return (
		<AssessmentStartScreen
			headerTitle={test.title}
			headerDescription={test.description}
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
