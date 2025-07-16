"use client"

import Image from "next/image"
import { notFound } from "next/navigation"
import * as React from "react"
import { PracticeProgressionFooter } from "@/components/practice/course/progression/practice-progression-footer"
import { PracticeProgressionSummary } from "@/components/practice/course/progression/practice-progression-summary"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"
import greenFriend from "./images/green-friend_v3.png"
import lightBlueFriend from "./images/light-blue-friend_v3.png"
import spaceFriend from "./images/space-friend_v3.png"

export function LessonExerciseContent({
	exercisePromise,
	className
}: {
	exercisePromise: Promise<Extract<CourseMaterial, { type: "Exercise" }> | undefined>
	className?: string
}) {
	const exercise = React.use(exercisePromise)
	if (exercise == null) {
		notFound()
	}

	const [index, setIndex] = React.useState(-1)

	return (
		<div id="lesson-exercise-content" className="flex flex-col h-full divide-y divide-gray-800">
			<PracticeProgressionSummary exercise={exercise} index={index} className="bg-gray-100" />
			<div id="lesson-exercise-content-body" className={cn("flex flex-col items-center flex-1 relative", className)}>
				<div className="flex-1" />
				<div className="flex flex-col items-center gap-2 flex-none text-center p-4">
					<h1 className="text-3xl font-medium">Ready to practice?</h1>
					<h2 className="text-lg">Okay, show us what you can do!</h2>
					<p className="text-sm font-bold">{exercise.data.questions.length} questions</p>
				</div>
				<div className="flex-[2]" />
				<div className="absolute bottom-0 flex flex-row w-full justify-center items-end overflow-hidden h-1/3 max-h-64 hidden [@media(min-height:600px)]:flex">
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

			<PracticeProgressionFooter
				questions={exercise.data.questions}
				next={exercise.meta.next}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
