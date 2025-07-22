"use client"

import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import type { QuizPageData } from "@/lib/types/page"

export function QuizContent({ quizPromise }: { quizPromise: Promise<QuizPageData> }) {
	const { quiz, questions, layoutData } = React.use(quizPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Quiz"
				onerosterComponentResourceSourcedId={quiz.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={quiz.id} // The quiz resource sourcedId for OneRoster results
				assessmentTitle={quiz.title}
				unitData={layoutData.unitData}
			/>
		)
	}

	return (
		<AssessmentStartScreen
			headerTitle={quiz.title}
			title="Ready to take the quiz?"
			subtitle="Test your knowledge!"
			subtitleColorClass="text-purple-100"
			questionsCount={questions.length}
			onStart={() => setHasStarted(true)}
			bgClass="bg-purple-900"
			contentType="Quiz"
		/>
	)
}
