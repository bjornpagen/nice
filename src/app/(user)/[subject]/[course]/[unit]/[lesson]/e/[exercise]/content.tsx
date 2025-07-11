"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import type { ExerciseData, ExerciseQuestion } from "./page"

function QuestionStepper({ questions }: { questions: ExerciseQuestion[] }) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)

	if (questions.length === 0) {
		return (
			<div className="bg-white p-8 text-center">
				<p className="text-gray-600">No questions available for this exercise.</p>
			</div>
		)
	}

	const currentQuestion = questions[currentQuestionIndex]
	const isFirstQuestion = currentQuestionIndex === 0
	const isLastQuestion = currentQuestionIndex === questions.length - 1

	// TypeScript safety check
	if (!currentQuestion) {
		return null
	}

	const handlePrevious = () => {
		if (!isFirstQuestion) {
			setCurrentQuestionIndex(currentQuestionIndex - 1)
		}
	}

	const handleNext = () => {
		if (!isLastQuestion) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
		}
	}

	return (
		<div className="bg-white">
			{/* Question Header */}
			<div className="p-6 border-b border-gray-200">
				<div className="flex justify-between items-center">
					<h2 className="text-lg font-semibold text-gray-800">
						Question {currentQuestionIndex + 1} of {questions.length}
					</h2>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevious}
							disabled={isFirstQuestion}
							className="flex items-center gap-1"
						>
							<ChevronLeft className="w-4 h-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleNext}
							disabled={isLastQuestion}
							className="flex items-center gap-1"
						>
							Next
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Question Content */}
			<div className="p-6">
				<QTIRenderer identifier={currentQuestion.identifier} height="auto" width="100%" className="w-full" />
			</div>

			{/* Submit Button */}
			<div className="p-6 border-t border-gray-200 flex justify-center">
				<Button className="px-8">Check Answer</Button>
			</div>
		</div>
	)
}

export function Content({ exerciseDataPromise }: { exerciseDataPromise: Promise<ExerciseData> }) {
	const { exercise, questions } = React.use(exerciseDataPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return <QuestionStepper questions={questions} />
	}

	return (
		<div className="bg-white p-8">
			{/* Exercise Introduction */}
			<div className="max-w-2xl mx-auto text-center space-y-6">
				<h1 className="text-3xl font-bold text-gray-800">{exercise.title}</h1>
				<p className="text-gray-600">
					This exercise contains {questions.length} question{questions.length !== 1 ? "s" : ""}.
				</p>
				<Button size="lg" onClick={() => setHasStarted(true)} className="px-8">
					Start Exercise
				</Button>
			</div>
		</div>
	)
}
