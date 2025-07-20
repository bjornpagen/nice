"use client"

import Image from "next/image"
import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import type { ExercisePageData } from "@/lib/types/page"

export function Content({ exercisePromise }: { exercisePromise: Promise<ExercisePageData> }) {
	const { exercise, questions, layoutData } = React.use(exercisePromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Exercise"
				assessmentId={exercise.id}
				resourceId={exercise.id}
				assessmentTitle={exercise.title}
				unitData={layoutData.unitData}
			/>
		)
	}

	return (
		<AssessmentStartScreen
			headerTitle={exercise.title}
			title="Ready to practice?"
			subtitle="Test your knowledge with this exercise!"
			subtitleColorClass="text-blue-100"
			questionsCount={questions.length}
			onStart={() => setHasStarted(true)}
			bgClass="bg-blue-950"
			contentType="Exercise"
		>
			{/* Character Images */}
			<div className="absolute bottom-0 flex flex-row w-full justify-center items-end overflow-hidden h-1/3 max-h-64">
				<Image
					src={spaceFriend}
					alt="Exercise illustration"
					className="max-w-full max-h-full min-h-0 min-w-0 object-contain object-bottom flex-1"
				/>
				<Image
					src={greenFriend}
					alt="Exercise illustration"
					className="max-w-full max-h-full min-h-0 min-w-0 object-contain object-bottom flex-1"
				/>
				<Image
					src={lightBlueFriend}
					alt="Exercise illustration"
					className="max-w-full max-h-full min-h-0 min-w-0 object-contain object-bottom flex-1"
				/>
			</div>
		</AssessmentStartScreen>
	)
}
