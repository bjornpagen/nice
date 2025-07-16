"use client"

import _ from "lodash"
import Image from "next/image"
import { notFound } from "next/navigation"
import * as React from "react"
import { PracticeProgressionFooter } from "@/components/practice/course/progression/practice-progression-footer"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"
import challengeIllustration from "./images/course-challenge-illustration.png"

export function CourseChallengeContent({
	challengePromise,
	className
}: {
	challengePromise: Promise<Extract<CourseMaterial, { type: "CourseChallenge" }> | undefined>
	className?: string
}) {
	const challenge = React.use(challengePromise)
	if (challenge == null) {
		notFound()
	}

	const [index, setIndex] = React.useState(-1)

	return (
		<div id="course-challenge-content" className="flex flex-col h-full">
			<div id="course-challenge-content-body" className={cn("flex flex-col items-center flex-1 relative", className)}>
				<div className="flex-1" />
				<div className="flex flex-col items-center gap-2 flex-none text-center p-4">
					<h1 className="text-3xl font-medium">Ready for a challenge?</h1>
					<h2 className="text-lg">
						Test yourself on the skills in this course and earn mastery points for what you already know!
					</h2>
					<div className="flex flex-row items-center gap-4">
						<p className="text-sm font-bold">{challenge.data.questions.length} questions</p>
						<p className="text-sm font-bold">•</p>
						<p className="text-sm font-bold">
							{challenge.data.questions.length} - {_.round(challenge.data.questions.length * 1.5)} minutes
						</p>
					</div>
				</div>
				<div className="flex-[2]" />
				<div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/3 max-h-64 hidden [@media(min-height:600px)]:block">
					<Image
						src={challengeIllustration}
						alt="Challenge illustration"
						className="max-w-full max-h-full min-h-0 min-w-0 object-contain"
					/>
				</div>
			</div>

			<PracticeProgressionFooter
				questions={challenge.data.questions}
				next={challenge.meta.next}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
