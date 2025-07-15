"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import type { CourseChallengePageData } from "@/lib/types"

type TestQuestion = CourseChallengePageData["questions"][0]

function QuestionStepper({ questions }: { questions: TestQuestion[] }) {
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

	const handleResponseChange = () => {
		// Response change handler for QTI renderer
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
			{/* Bottom Navigation */}
			<div className="border-t border-gray-200 bg-white p-4 flex justify-between items-center">
				<Button
					onClick={goToPrevious}
					disabled={currentQuestionIndex === 0}
					variant="ghost"
					className="flex items-center gap-2"
				>
					<ChevronLeft className="w-4 h-4" />
					Previous
				</Button>
				<span className="text-sm text-gray-600">
					Question {currentQuestionIndex + 1} of {questions.length}
				</span>
				<Button
					onClick={goToNext}
					disabled={currentQuestionIndex === questions.length - 1}
					variant="ghost"
					className="flex items-center gap-2"
				>
					Next
					<ChevronRight className="w-4 h-4" />
				</Button>
			</div>
		</div>
	)
}

export function TestContent({ testDataPromise }: { testDataPromise: Promise<CourseChallengePageData> }) {
	const { test, questions } = React.use(testDataPromise)
	const [hasStarted, setHasStarted] = React.useState(false)

	if (hasStarted) {
		return <QuestionStepper questions={questions} />
	}

	return (
		<div className="flex flex-col h-full">
			{/* Test Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
			</div>

			{/* Ready to Take Test Section */}
			<div className="bg-purple-700 text-white flex-1 flex flex-col items-center justify-center p-12">
				<div className="text-center max-w-md">
					<h2 className="text-3xl font-bold mb-4">Course Challenge</h2>
					<p className="text-lg text-purple-100 mb-8">Test your mastery of the entire course!</p>
					<p className="text-lg font-medium mb-8">{questions.length} questions</p>
					<Button
						onClick={() => setHasStarted(true)}
						className="bg-white text-purple-700 hover:bg-gray-100 px-8 py-3 text-lg font-semibold disabled:opacity-50"
						disabled={questions.length === 0}
					>
						{questions.length > 0 ? "Start Challenge" : "No Questions Available"}
					</Button>
				</div>
			</div>
		</div>
	)
}
