"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import type { ExerciseData, ExerciseQuestion } from "./page"

function QuestionStepper({ questions }: { questions: ExerciseQuestion[] }) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const currentQuestion = questions[currentQuestionIndex]

	if (!currentQuestion) {
		return <div className="p-8 text-center text-red-500">Error: Question not found.</div>
	}

	const goToNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
		}
	}

	const goToPrevious = () => {
		if (currentQuestionIndex > 0) {
			setCurrentQuestionIndex(currentQuestionIndex - 1)
		}
	}

	return (
		<div className="flex flex-col h-full bg-white pt-6">
			<div className="flex-1 overflow-hidden">
				<QTIRenderer
					identifier={currentQuestion.qtiIdentifier}
					key={currentQuestion.id}
					height="100%"
					width="100%"
					className="h-full w-full"
				/>
			</div>
			<div className="border-t bg-white p-4 flex-shrink-0">
				<div className="flex items-center justify-between max-w-4xl mx-auto">
					<Button onClick={goToPrevious} disabled={currentQuestionIndex === 0} variant="outline">
						<ChevronLeft className="w-4 h-4 mr-2" />
						Previous
					</Button>
					<div className="text-sm font-medium text-gray-600">
						Question {currentQuestionIndex + 1} of {questions.length}
					</div>
					<Button onClick={goToNext} disabled={currentQuestionIndex === questions.length - 1}>
						Next
						<ChevronRight className="w-4 h-4 ml-2" />
					</Button>
				</div>
			</div>
		</div>
	)
}

export function ExerciseContent({ exerciseDataPromise }: { exerciseDataPromise: Promise<ExerciseData> }) {
	const { exercise, questions } = React.use(exerciseDataPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return <QuestionStepper questions={questions} />
	}

	return (
		<div className="flex flex-col h-full">
			{/* Exercise Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
				{exercise.description && <p className="text-gray-600 mt-2">{exercise.description}</p>}
			</div>

			{/* Ready to Practice Section */}
			<div className="bg-blue-900 text-white flex-1 flex flex-col items-center justify-center p-12 pb-32">
				<div className="text-center max-w-md">
					<h2 className="text-3xl font-bold mb-4">Ready to practice?</h2>
					<p className="text-lg text-blue-100 mb-8">Show us what you can do!</p>
					<p className="text-lg font-medium mb-8">{questions.length} questions</p>
					<Button
						onClick={() => setHasStarted(true)}
						className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg font-medium rounded-lg disabled:opacity-50"
						disabled={questions.length === 0}
					>
						{questions.length > 0 ? "Let's go" : "No questions available"}
					</Button>
				</div>
			</div>
		</div>
	)
}
