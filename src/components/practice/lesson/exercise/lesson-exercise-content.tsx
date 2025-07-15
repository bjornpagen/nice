"use client"

import { notFound } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { LessonResource } from "@/lib/v2/types"
import { LessonExerciseContentFooter } from "./lesson-exercise-content-footer"

export function LessonExerciseContent({
	exercisePromise,
	className
}: {
	exercisePromise: Promise<Extract<LessonResource, { type: "Exercise" }> | undefined>
	className?: string
}) {
	const exercise = React.use(exercisePromise)
	if (exercise == null) {
		notFound()
	}

	const [index, setIndex] = React.useState(-1)

	return (
		<div id="lesson-exercise-content" className="flex flex-col h-full">
			<div
				id="lesson-exercise-content-body"
				className={cn("flex flex-col items-center justify-center gap-2 flex-1", className)}
			>
				<h1 className="text-3xl font-medium">Ready to practice?</h1>
				<h2 className="text-lg">Okay, show us what you can do!</h2>
				<p className="text-sm font-bold">{exercise.data.questions.length} questions</p>
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
