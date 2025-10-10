"use client"

import Image from "next/image"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import type { ExercisePageData } from "@/lib/types/page"

export function Content({ exercisePromise, expectedIdentifiersPromisesPromise }: { exercisePromise: Promise<ExercisePageData>; expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> }) {
	const { exercise, questions, layoutData } = React.use(exercisePromise)
	const expectedIdentifiersPromises = React.use(expectedIdentifiersPromisesPromise)
	const { resourceLockStatus } = useCourseLockStatus()
	const isLocked = resourceLockStatus[exercise.componentResourceSourcedId] === true
	const [hasStarted, setHasStarted] = React.useState(false)
	const [retakeKey, setRetakeKey] = React.useState(0)

	if (hasStarted) {
		return (
			<AssessmentStepper
				key={`${exercise.id}:${retakeKey}`}
				questions={questions}
				contentType="Exercise"
				onerosterComponentResourceSourcedId={exercise.componentResourceSourcedId} // Use the componentResource ID for XP farming prevention
				onerosterResourceSourcedId={exercise.id} // The exercise resource sourcedId for OneRoster results
				onerosterCourseSourcedId={exercise.onerosterCourseSourcedId} // Pass the onerosterCourseSourcedId
				assessmentTitle={exercise.title}
				assessmentPath={exercise.path}
				unitData={layoutData.unitData}
				expectedXp={exercise.expectedXp}
				layoutData={layoutData}
				expectedIdentifiersPromises={expectedIdentifiersPromises}
				onRetake={(_newAttemptNumber) => {
					// Return to start screen to make retake explicit and ensure full reset
					setHasStarted(false)
					// Bump key so the assessment stepper remounts on next start
					setRetakeKey((k) => k + 1)
					// Force a route data refresh to get a newly rotated question set
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
				headerTitle={exercise.title}
				title="Ready to practice?"
				subtitle="Test your knowledge with this exercise!"
				subtitleColorClass="text-blue-100"
				questionsCount={questions.length}
				expectedXp={exercise.expectedXp}
				onStart={() => setHasStarted(true)}
				bgClass="bg-blue-950"
				contentType="Exercise"
				isLocked={isLocked}
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
		</div>
	)
}
