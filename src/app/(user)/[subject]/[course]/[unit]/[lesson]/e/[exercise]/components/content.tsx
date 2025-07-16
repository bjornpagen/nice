"use client"

import Image from "next/image"
import * as React from "react"
import { AssessmentBottomNav } from "@/components/practice/assessment-bottom-nav"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import type { ExercisePageData } from "@/lib/types/page"

export function Content({ exercisePromise }: { exercisePromise: Promise<ExercisePageData> }) {
	const { exercise, questions } = React.use(exercisePromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Exercise"
				assessmentId={exercise.id}
				assessmentTitle={exercise.title}
			/>
		)
	}

	return (
		<div className="flex flex-col h-full">
			{/* Exercise Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
			</div>

			{/* Ready to Take Exercise Section */}
			<div className="bg-blue-950 text-white flex-1 flex flex-col items-center justify-center p-12 pb-32 relative">
				<div className="text-center max-w-md z-10">
					<h2 className="text-3xl font-bold mb-4">Ready to practice?</h2>
					<p className="text-lg text-blue-100 mb-8">Test your knowledge with this exercise!</p>
					<p className="text-lg font-medium mb-8">{questions.length} questions</p>
				</div>

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
			</div>
			<AssessmentBottomNav
				contentType="Exercise"
				onContinue={() => setHasStarted(true)}
				isEnabled={true}
				isStartScreen={true}
			/>
		</div>
	)
}
