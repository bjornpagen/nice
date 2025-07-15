"use client"

import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import type { ExercisePageData } from "@/lib/types"
import { BottomNavigation } from "./bottom-navigation"

function QuestionStepper({ questions }: { questions: ExercisePageData["questions"] }) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const [hasResponse, setHasResponse] = React.useState(false)
	const currentQuestion = questions[currentQuestionIndex]

	if (!currentQuestion) {
		return <div className="p-8 text-center text-red-500">Error: Question not found.</div>
	}

	const goToNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
			setHasResponse(false) // Reset response state for new question
		}
	}

	const handleResponseChange = () => {
		setHasResponse(true)
	}

	return (
		<div className="flex flex-col h-full bg-white">
			<div className="flex-1 overflow-hidden">
				<QTIRenderer
					identifier={currentQuestion.qtiIdentifier}
					materialType="assessmentItem"
					key={currentQuestion.qtiIdentifier}
					height="100%"
					width="100%"
					className="h-full w-full"
					onResponseChange={handleResponseChange}
				/>
			</div>
			<BottomNavigation
				onContinue={goToNext}
				isEnabled={hasResponse}
				currentQuestion={currentQuestionIndex + 1}
				totalQuestions={questions.length}
			/>
		</div>
	)
}

export function Content({ exercisePromise }: { exercisePromise: Promise<ExercisePageData> }) {
	const { exercise, questions } = React.use(exercisePromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return <QuestionStepper questions={questions} />
	}

	return (
		<div className="flex flex-col h-full">
			{/* Exercise Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
			</div>

			{/* Ready to Take Exercise Section */}
			<div className="bg-purple-900 text-white flex-1 flex flex-col items-center justify-center p-12 pb-32">
				<div className="text-center max-w-md">
					<h2 className="text-3xl font-bold mb-4">Ready to practice?</h2>
					<p className="text-lg text-purple-100 mb-8">Test your knowledge with this exercise!</p>
					<p className="text-lg font-medium mb-8">{questions.length} questions</p>
				</div>
			</div>
			<BottomNavigation onContinue={() => setHasStarted(true)} isEnabled={true} isStartScreen={true} />
		</div>
	)
}
