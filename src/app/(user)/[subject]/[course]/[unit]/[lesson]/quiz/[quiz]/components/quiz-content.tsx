"use client"

import * as React from "react"
import { AssessmentBottomNav } from "@/components/practice/assessment-bottom-nav"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import type { QuizPageData } from "@/lib/types/page"

export function QuizContent({ quizPromise }: { quizPromise: Promise<QuizPageData> }) {
	const { quiz, questions } = React.use(quizPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return <AssessmentStepper questions={questions} contentType="Quiz" />
	}

	return (
		<div className="flex flex-col h-full">
			{/* Quiz Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
				{quiz.description && <p className="text-gray-600 mt-2">{quiz.description}</p>}
			</div>

			{/* Ready to Take Quiz Section */}
			<div className="bg-purple-900 text-white flex-1 flex flex-col items-center justify-center p-12 pb-32">
				<div className="text-center max-w-md">
					<h2 className="text-3xl font-bold mb-4">Ready to take the quiz?</h2>
					<p className="text-lg text-purple-100 mb-8">Test your knowledge!</p>
					<p className="text-lg font-medium mb-8">{questions.length} questions</p>
				</div>
			</div>
			<AssessmentBottomNav
				contentType="Quiz"
				onContinue={() => setHasStarted(true)}
				isEnabled={true}
				isStartScreen={true}
			/>
		</div>
	)
}
