"use client"

import _ from "lodash"
import Image from "next/image"
import { notFound } from "next/navigation"
import * as React from "react"
import { cn } from "@/lib/utils"
import type { CourseMaterial } from "@/lib/v2/types"
import quizIllustration from "./images/quiz-illustration.png"
import { QuizContentFooter } from "./quiz-content-footer"

export function QuizContent({
	quizPromise,
	className
}: {
	quizPromise: Promise<Extract<CourseMaterial, { type: "Quiz" }> | undefined>
	className?: string
}) {
	const quiz = React.use(quizPromise)
	if (quiz == null) {
		notFound()
	}

	const [index, setIndex] = React.useState(-1)

	return (
		<div id="quiz-content" className="flex flex-col h-full">
			<div id="quiz-content-body" className={cn("flex flex-col items-center flex-1 relative", className)}>
				<div className="flex-1" />
				<div className="flex flex-col items-center gap-2 flex-none text-center p-4">
					<h1 className="text-3xl font-medium">Time for a quiz?</h1>
					<h2 className="text-lg">Get ready for questions on the unit so far.</h2>
					<div className="flex flex-row items-center gap-4">
						<p className="text-sm font-bold">{quiz.data.questions.length} questions</p>
						<p className="text-sm font-bold">•</p>
						<p className="text-sm font-bold">
							{quiz.data.questions.length} - {_.round(quiz.data.questions.length * 1.5)} minutes
						</p>
					</div>
				</div>
				<div className="flex-[2]" />
				<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/3 max-h-64 hidden [@media(min-height:600px)]:block">
					<Image
						src={quizIllustration}
						alt="Quiz illustration"
						width={800}
						height={800}
						className="max-w-full max-h-full min-h-0 min-w-0 object-contain"
					/>
				</div>
			</div>

			<QuizContentFooter
				questions={quiz.data.questions}
				index={index}
				setIndex={setIndex}
				className={"flex-none p-4"}
			/>
		</div>
	)
}
