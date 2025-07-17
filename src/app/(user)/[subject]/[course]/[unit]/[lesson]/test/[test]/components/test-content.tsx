"use client"

import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import type { UnitTestPageData } from "@/lib/types/page"

export function TestContent({ testPromise }: { testPromise: Promise<UnitTestPageData> }) {
	const { test, questions, layoutData } = React.use(testPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Test"
				assessmentId={test.id}
				assessmentTitle={test.title}
				unitChildren={layoutData.unitData.children}
				lessonData={layoutData.lessonData}
				unitData={layoutData.unitData}
			/>
		)
	}

	return (
		<AssessmentStartScreen
			headerTitle={test.title}
			headerDescription={test.description}
			title="Ready to take the unit test?"
			subtitle="Test your understanding of the entire unit!"
			subtitleColorClass="text-blue-100"
			questionsCount={questions.length}
			onStart={() => setHasStarted(true)}
			bgClass="bg-blue-900"
			contentType="Test"
		/>
	)
}
