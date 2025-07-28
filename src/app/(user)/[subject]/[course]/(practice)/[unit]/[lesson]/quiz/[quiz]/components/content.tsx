"use client"

import Image from "next/image"
import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import quizIllustration from "@/components/practice/course/unit/quiz/images/quiz-illustration.png"
import type { QuizPageData } from "@/lib/types/page"

export function Content({ quizPromise }: { quizPromise: Promise<QuizPageData> }) {
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
				assessmentPath={quiz.path}
				unitData={layoutData.unitData}
				expectedXp={quiz.expectedXp}
			/>
		)
	}

	return (
		<AssessmentStartScreen
			headerTitle={quiz.title}
			title="Time for a quiz?"
			subtitle="Get ready for questions on the unit so far."
			subtitleColorClass="text-blue-100"
			questionsCount={questions.length}
			expectedXp={quiz.expectedXp}
			onStart={() => setHasStarted(true)}
			bgClass="bg-blue-950"
			contentType="Quiz"
			textPositioning="justify-start pt-24"
		>
			{/* Quiz Illustration - Slightly Smaller */}
			<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/2 max-h-80 w-full hidden [@media(min-height:600px)]:block">
				<Image src={quizIllustration} alt="Quiz illustration" className="w-full h-full object-contain" />
			</div>
		</AssessmentStartScreen>
	)
}
