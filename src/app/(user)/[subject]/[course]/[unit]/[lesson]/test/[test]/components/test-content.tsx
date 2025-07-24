"use client"

import Image from "next/image"
import * as React from "react"
import { AssessmentStartScreen } from "@/components/practice/assessment-start-screen"
import { AssessmentStepper } from "@/components/practice/assessment-stepper"
import testIllustration from "@/components/practice/course/unit/test/images/test-illustration.png"
import type { UnitTestPageData } from "@/lib/types/page"

export function TestContent({ testPromise }: { testPromise: Promise<UnitTestPageData> }) {
	const { test, questions, layoutData } = React.use(testPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return (
			<AssessmentStepper
				questions={questions}
				contentType="Test"
				onerosterComponentResourceSourcedId={test.componentResourceSourcedId} // The componentResource sourcedId that PowerPath uses
				onerosterResourceSourcedId={test.id} // The test resource sourcedId for OneRoster results
				assessmentTitle={test.title}
				assessmentPath={test.path}
				unitData={layoutData.unitData}
				expectedXp={test.expectedXp}
			/>
		)
	}

	return (
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
		>
			{/* Test Illustration - Much Larger */}
			<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-2/3 max-h-96 w-full hidden [@media(min-height:600px)]:block">
				<Image src={testIllustration} alt="Test illustration" className="w-full h-full object-contain" />
			</div>
		</AssessmentStartScreen>
	)
}
