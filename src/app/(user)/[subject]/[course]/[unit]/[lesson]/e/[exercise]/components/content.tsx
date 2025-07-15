"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { toast } from "sonner"
import { QTIRenderer } from "@/components/qti-renderer"
import { processQtiResponse } from "@/lib/actions/qti"
import type { ExercisePageData } from "@/lib/types/page"
import { BottomNavigation } from "./bottom-navigation"

function QuestionStepper({ questions }: { questions: ExercisePageData["questions"] }) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const [selectedResponse, setSelectedResponse] = React.useState<{ responseIdentifier: string; value: unknown } | null>(
		null
	)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [showFeedback, setShowFeedback] = React.useState(false)
	const currentQuestion = questions[currentQuestionIndex]

	// Create audio instance for correct sound
	const correctSound = React.useMemo(() => {
		if (typeof window !== "undefined") {
			return new Audio("/correct-sound.mp3")
		}
		return null
	}, [])

	if (!currentQuestion) {
		return <div className="p-8 text-center text-red-500">Error: Question not found.</div>
	}

	const handleCheckAnswer = async () => {
		if (!selectedResponse || !currentQuestion) return
		setIsSubmitting(true)

		const result = await errors.try(processQtiResponse(currentQuestion.id, selectedResponse))

		setIsSubmitting(false)
		if (result.error) {
			toast.error("Failed to check answer. Please try again.")
			return
		}

		setIsAnswerChecked(true)
		setIsAnswerCorrect(result.data.isCorrect)

		// Play success sound and delay popup for correct answers
		if (result.data.isCorrect) {
			if (correctSound) {
				correctSound.play().catch(() => {
					// Ignore errors if audio playback fails
				})
			}
			// Delay showing the popup to let the sound start playing
			setTimeout(() => {
				setShowFeedback(true)
			}, 150) // 150ms delay
		} else {
			// Show feedback immediately for incorrect answers
			setShowFeedback(true)
		}
	}

	const goToNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
			// Reset state for the new question
			setSelectedResponse(null)
			setIsAnswerChecked(false)
			setIsAnswerCorrect(false)
			setShowFeedback(false)
		} else {
			// Handle end of exercise logic
			toast.success("Exercise completed! Great job!", {
				duration: 5000
			})
		}
	}

	const handleResponseChange = (responseIdentifier: string, response: unknown) => {
		// Allow changing answer if it's incorrect
		if (!isAnswerChecked || !isAnswerCorrect) {
			setSelectedResponse({ responseIdentifier: responseIdentifier, value: response })
			// Reset check state when selecting a new answer after incorrect attempt
			if (isAnswerChecked && !isAnswerCorrect) {
				setIsAnswerChecked(false)
				setShowFeedback(false)
			}
		}
	}

	return (
		<div className="flex flex-col h-full bg-white">
			<div className="flex-1 overflow-hidden relative">
				<QTIRenderer
					identifier={currentQuestion.id}
					materialType="assessmentItem"
					key={currentQuestion.id}
					height="100%"
					width="100%"
					className="h-full w-full"
					onResponseChange={handleResponseChange}
				/>
				{/* Transparent overlay to prevent interactions after correct answer */}
				{isAnswerChecked && isAnswerCorrect && <div className="absolute inset-0 z-10" aria-hidden="true" />}
			</div>

			<BottomNavigation
				onContinue={isAnswerCorrect ? goToNext : handleCheckAnswer}
				buttonText={isAnswerCorrect ? "Continue" : "Check"}
				isEnabled={!!selectedResponse && !isSubmitting}
				currentQuestion={currentQuestionIndex + 1}
				totalQuestions={questions.length}
				showFeedback={showFeedback}
				isCorrect={isAnswerCorrect}
				onCloseFeedback={() => setShowFeedback(false)}
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
