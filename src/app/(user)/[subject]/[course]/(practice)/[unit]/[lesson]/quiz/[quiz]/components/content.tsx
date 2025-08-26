"use client"

import Image from "next/image"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import quizIllustration from "@/components/practice/course/unit/quiz/images/quiz-illustration.png"
import type { QuizPageData } from "@/lib/types/page"

export function Content({ quizPromise }: { quizPromise: Promise<QuizPageData> }) {
	const { quiz, questions, layoutData } = React.use(quizPromise)
	const { resourceLockStatus } = useCourseLockStatus()
	const isLocked = resourceLockStatus[quiz.componentResourceSourcedId] === true
	const [hasStarted, setHasStarted] = React.useState(false)
	const [retakeKey, setRetakeKey] = React.useState(0)

	if (hasStarted) {
		return (
			<AssessmentStepper
				key={`${quiz.id}:${retakeKey}`}
				questions={questions}
				contentType="Quiz"
				onerosterComponentResourceSourcedId={quiz.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={quiz.id} // The quiz resource sourcedId for OneRoster results
				onerosterCourseSourcedId={quiz.onerosterCourseSourcedId} // Pass the onerosterCourseSourcedId
				assessmentTitle={quiz.title}
				assessmentPath={quiz.path}
				unitData={layoutData.unitData}
				expectedXp={quiz.expectedXp}
				layoutData={layoutData}
				onRetake={(_newAttemptNumber) => {
					// Return to start screen to make retake explicit and ensure full reset
					setHasStarted(false)
					// Bump key so the assessment stepper remounts on next start
					setRetakeKey((k) => k + 1)
					// Force a route data refresh to get a newly rotated question set
					// Use location.reload to guarantee a full reload since replace/refresh are client navigations
					if (typeof window !== "undefined") {
						window.location.reload()
					}
				}}
			/>
		)
	}

	return (
		<div className="relative h-full">
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
				isLocked={isLocked}
			>
				{/* Quiz Illustration - Slightly Smaller */}
				<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/2 max-h-80 w-full hidden [@media(min-height:600px)]:block">
					<Image src={quizIllustration} alt="Quiz illustration" className="w-full h-full object-contain" />
				</div>
			</AssessmentStartScreen>
		</div>
	)
}
