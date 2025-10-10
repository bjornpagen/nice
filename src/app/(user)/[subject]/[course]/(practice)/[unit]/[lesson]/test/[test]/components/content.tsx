"use client"

import Image from "next/image"
import * as React from "react"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import testIllustration from "@/components/practice/course/unit/test/images/test-illustration.png"
import type { UnitTestPageData } from "@/lib/types/page"

export function Content({ testPromise, expectedIdentifiersPromisesPromise }: { testPromise: Promise<UnitTestPageData>; expectedIdentifiersPromisesPromise: Promise<Promise<string[]>[]> }) {
	const { test, questions, layoutData } = React.use(testPromise)
	const expectedIdentifiersPromises = React.use(expectedIdentifiersPromisesPromise)
	const { resourceLockStatus } = useCourseLockStatus()
	const isLocked = resourceLockStatus[test.componentResourceSourcedId] === true
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
				unitData={layoutData.unitData}
				expectedXp={test.expectedXp}
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
				headerTitle={test.title}
				title="All set for the unit test?"
				subtitle="Welcome to the unit test — where you get to test your skills for the entire unit!"
				subtitleColorClass="text-blue-100"
				questionsCount={questions.length}
				expectedXp={test.expectedXp}
				onStart={() => setHasStarted(true)}
				bgClass="bg-blue-950"
				contentType="Test"
				isLocked={isLocked}
			>
				{/* Test Illustration - Much Larger */}
				<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-2/3 max-h-96 w-full hidden [@media(min-height:600px)]:block">
					<Image src={testIllustration} alt="Test illustration" className="w-full h-full object-contain" />
				</div>
			</AssessmentStartScreen>
		</div>
	)
}
