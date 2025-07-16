"use client"

import _ from "lodash"
import Image from "next/image"
import { notFound } from "next/navigation"
import * as React from "react"
import { PracticeProgressionFooter } from "@/components/practice/practice-progression-footer"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"
import testIllustration from "./images/test-illustration.png"

export function UnitTestContent({
	unitTestPromise,
	className
}: {
	unitTestPromise: Promise<Extract<CourseMaterial, { type: "UnitTest" }> | undefined>
	className?: string
}) {
	const unitTest = React.use(unitTestPromise)
	if (unitTest == null) {
		notFound()
	}

	const [index, setIndex] = React.useState(-1)

	return (
		<div id="unit-test-content" className="flex flex-col h-full">
			<div id="unit-test-content-body" className={cn("flex flex-col items-center flex-1 relative", className)}>
				<div className="flex-1" />
				<div className="flex flex-col items-center gap-2 flex-none text-center p-4">
					<h1 className="text-3xl font-medium">All set for the unit test?</h1>
					<h2 className="text-lg">Welcome to the unit test — where you get to test your skills for the entire unit!</h2>
					<div className="flex flex-row items-center gap-4">
						<p className="text-sm font-bold">{unitTest.data.questions.length} questions</p>
						<p className="text-sm font-bold">•</p>
						<p className="text-sm font-bold">
							{unitTest.data.questions.length} - {_.round(unitTest.data.questions.length * 1.5)} minutes
						</p>
					</div>
				</div>
				<div className="flex-[2]" />
				<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/3 max-h-64 hidden [@media(min-height:600px)]:block">
					<Image
						src={testIllustration}
						alt="Test illustration"
						className="max-w-full max-h-full min-h-0 min-w-0 object-contain"
					/>
				</div>
			</div>

			<PracticeProgressionFooter
				questions={unitTest.data.questions}
				next={unitTest.meta?.next}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
