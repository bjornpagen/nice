"use client"

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { toast } from "sonner"
import { QTIRenderer } from "@/components/qti-renderer"
import { processQtiResponse } from "@/lib/actions/qti"
import type { Question } from "@/lib/types/content"
import { AssessmentBottomNav, type AssessmentType } from "./assessment-bottom-nav"

interface AssessmentStepperProps {
	questions: Question[]
	contentType: AssessmentType
	onComplete?: () => void
}

export function AssessmentStepper({ questions, contentType, onComplete }: AssessmentStepperProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const [selectedResponse, setSelectedResponse] = React.useState<{ responseIdentifier: string; value: unknown } | null>(
		null
	)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [showFeedback, setShowFeedback] = React.useState(false)
	const currentQuestion = questions[currentQuestionIndex]

	const correctSound = React.useMemo(() => (typeof window !== "undefined" ? new Audio("/correct-sound.mp3") : null), [])

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

		if (result.data.isCorrect) {
			correctSound?.play().catch(() => {})
			setTimeout(() => setShowFeedback(true), 150)
		} else {
			setShowFeedback(true)
		}
	}

	const goToNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
			setSelectedResponse(null)
			setIsAnswerChecked(false)
			setIsAnswerCorrect(false)
			setShowFeedback(false)
		} else {
			toast.success(`${contentType} completed! Great job!`, { duration: 5000 })
			onComplete?.()
		}
	}

	const handleResponseChange = (responseIdentifier: string, response: unknown) => {
		if (!isAnswerChecked || !isAnswerCorrect) {
			setSelectedResponse({ responseIdentifier: responseIdentifier, value: response })
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
				{isAnswerChecked && isAnswerCorrect && <div className="absolute inset-0 z-10" aria-hidden="true" />}
			</div>

			<AssessmentBottomNav
				contentType={contentType}
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
