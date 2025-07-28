"use client"

import Image from "next/image"
import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import courseChallengeIllustration from "@/components/practice/course/challenge/images/course-challenge-illustration.png"
import type { CourseChallengePageData } from "@/lib/types/page"

export function Content({ testDataPromise }: { testDataPromise: Promise<CourseChallengePageData> }) {
	const { test, questions } = React.use(testDataPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Test"
				onerosterComponentResourceSourcedId={test.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={test.id} // The test resource sourcedId for OneRoster results
				onerosterCourseSourcedId={test.onerosterCourseSourcedId} // Pass the onerosterCourseSourcedId
				assessmentTitle={test.title}
				assessmentPath={test.path}
				expectedXp={test.expectedXp}
			/>
		)
	}

	return (
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
	)
}
