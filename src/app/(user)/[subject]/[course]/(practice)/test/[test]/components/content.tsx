"use client"

import Image from "next/image"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import courseChallengeIllustration from "@/components/practice/course/challenge/images/course-challenge-illustration.png"
import type { CourseChallengePageData } from "@/lib/types/page"

export function Content({ testDataPromise }: { testDataPromise: Promise<CourseChallengePageData> }) {
	const { test, questions } = React.use(testDataPromise)
	const { resourceLockStatus } = useCourseLockStatus()
	const isLocked = resourceLockStatus[test.id] === true
	const [hasStarted, setHasStarted] = React.useState(false)
	const [retakeKey, setRetakeKey] = React.useState(0)

	if (hasStarted) {
		return (
			<AssessmentStepper
				key={`${test.id}:${retakeKey}`}
				questions={questions}
				contentType="Test"
				onerosterComponentResourceSourcedId={test.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={test.id} // The test resource sourcedId for OneRoster results
				onerosterCourseSourcedId={test.onerosterCourseSourcedId} // Pass the onerosterCourseSourcedId
				assessmentTitle={test.title}
				assessmentPath={test.path}
				expectedXp={test.expectedXp}
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
				headerTitle={test.title}
				title="Ready for the Course Challenge?"
				subtitle="Test your mastery of the skills across the entire course!"
				subtitleColorClass="text-blue-100"
				questionsCount={questions.length}
				expectedXp={test.expectedXp}
				onStart={() => setHasStarted(true)}
				bgClass="bg-blue-950"
				contentType="Test"
				isLocked={isLocked}
			>
				{/* Course Challenge Illustration - Smaller and Shifted Up */}
				<div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/3 max-h-64 w-full hidden [@media(min-height:600px)]:block">
					<Image
						src={courseChallengeIllustration}
						alt="Course Challenge illustration"
						className="w-full h-full object-contain"
					/>
				</div>
			</AssessmentStartScreen>
		</div>
	)
}
