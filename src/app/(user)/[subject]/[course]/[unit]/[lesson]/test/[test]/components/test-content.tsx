"use client"

import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import type { Question } from "@/lib/types/domain"
import type { UnitTestPageData } from "@/lib/types/page"

export function TestContent({ testPromise }: { testPromise: Promise<UnitTestPageData> }) {
	const { test, questions, layoutData } = React.use(testPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	const randomizedQuestions = getRandomizedQuestions(questions, questions.length / 4)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={randomizedQuestions}
				contentType="Test"
				assessmentId={test.id}
				assessmentTitle={test.title}
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
			questionsCount={randomizedQuestions.length}
			onStart={() => setHasStarted(true)}
			bgClass="bg-blue-900"
			contentType="Test"
		/>
	)
}

function getRandomizedQuestions(questions: Question[], limit?: number) {
	const shuffledQuestions = questions.sort(() => Math.random() - 0.5)
	return shuffledQuestions.slice(0, limit ?? questions.length)
}
