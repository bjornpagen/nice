"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { CourseResource } from "@/lib/v2/types"
import { CourseChallengeContentFooter } from "./course-challenge-content-footer"

export function CourseChallengeContent({
	challengePromise,
	className
}: {
	challengePromise: Promise<Extract<CourseResource, { type: "CourseChallenge" }> | undefined>
	className?: string
}) {
	const challenge = React.use(challengePromise)
	if (challenge == null) {
		notFound()
	}

	const [index, setIndex] = React.useState(-1)

	return (
		<div id="course-challenge-content" className="flex flex-col h-full">
			<div
				id="course-challenge-content-body"
				className={cn("flex flex-col items-center justify-center gap-2 flex-1", className)}
			>
				<h1 className="text-3xl font-medium">Ready to practice?</h1>
				<h2 className="text-lg font-medium">Okay, show us what you can do!</h2>
				<p className="text-sm font-bold">{challenge.data.questions.length} questions</p>
			</div>

			<CourseChallengeContentFooter
				questions={challenge.data.questions}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
