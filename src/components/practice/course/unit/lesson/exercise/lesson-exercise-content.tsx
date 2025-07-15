"use client"

import Image from "next/image"
import { notFound } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"
import greenFriend from "./images/green-friend_v3.png"
import lightBlueFriend from "./images/light-blue-friend_v3.png"
import spaceFriend from "./images/space-friend_v3.png"
import { LessonExerciseContentFooter } from "./lesson-exercise-content-footer"

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
		<div id="lesson-exercise-content" className="flex flex-col h-full">
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

			<LessonExerciseContentFooter
				questions={exercise.data.questions}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
