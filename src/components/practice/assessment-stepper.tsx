"use client"

import * as errors from "@superbuilders/errors"
import Image from "next/image"
import * as React from "react"
import { toast } from "sonner"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import { QTIRenderer } from "@/components/qti-renderer"
import { processQtiResponse } from "@/lib/actions/qti"
import type { Question } from "@/lib/types/content"
import type { Lesson, Unit, UnitChild } from "@/lib/types/structure"
import { AssessmentBottomNav, type AssessmentType } from "./assessment-bottom-nav"
import { AssessmentProficiencyOverview } from "./assessment-proficiency-overview"

// Summary View Component
function SummaryView({
	title,
	subtitle,
	titleClass,
	bgClass,
	showCharacters,
	correctAnswersCount,
	totalQuestions,
	contentType,
	assessmentTitle,
	onComplete,
	handleReset,
	nextItem
}: {
	title: string
	subtitle: string
	titleClass: string
	bgClass: string
	showCharacters: boolean
	correctAnswersCount: number
	totalQuestions: number
	contentType: AssessmentType
	assessmentTitle: string
	onComplete?: () => void
	handleReset: () => void
	nextItem: { text: string; path: string } | null
}) {
	// Play summary sound when component mounts
	React.useEffect(() => {
		const audio = new Audio("/summary-sound.mp3")
		audio.play().catch(() => {
			// Ignore audio play errors (e.g., autoplay policy)
		})
	}, [])

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Summary Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0 text-center">
				<h1 className="text-2xl font-bold text-gray-900">{assessmentTitle || `${contentType} Assessment`}</h1>
			</div>

			{/* Summary Content */}
			<div
				className={`flex-1 flex flex-col items-center justify-center ${showCharacters ? "p-12 pb-32" : "p-12"} ${bgClass} relative`}
			>
				<div className="text-center max-w-2xl z-10">
					<h2 className={`text-4xl font-bold mb-4 whitespace-nowrap ${titleClass}`}>{title}</h2>
					{subtitle && (
						<p
							className={`text-lg mb-8 whitespace-nowrap ${contentType === "Exercise" ? "text-blue-100" : "text-gray-700"}`}
						>
							{subtitle}
						</p>
					)}
					<div className="mt-8">
						<p className={`text-3xl font-bold ${contentType === "Exercise" ? "text-white" : "text-gray-900"}`}>
							{correctAnswersCount}/{totalQuestions} correct
						</p>
					</div>
				</div>

				{/* Character Images for Exercises */}
				{showCharacters && (
					<div className="absolute bottom-0 flex flex-row w-full justify-center items-end overflow-hidden h-1/3 max-h-64">
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
				)}
			</div>

			<AssessmentBottomNav
				contentType={contentType}
				onContinue={() => {
					// Navigate to next content or complete
					onComplete?.()
				}}
				isEnabled={true}
				currentQuestion={totalQuestions + 1} // Setting this higher than totalQuestions to trigger complete state
				totalQuestions={totalQuestions}
				onReset={() => {
					// Reset the entire assessment to try again
					handleReset()
				}}
				nextItem={nextItem}
			/>
		</div>
	)
}

interface AssessmentStepperProps {
	questions: Question[]
	contentType: AssessmentType
	onComplete?: () => void
	assessmentId?: string
	assessmentTitle?: string
	unitChildren?: UnitChild[]
	courseUnits?: {
		unitName: string
		unitChildren: UnitChild[]
	}[]
	lessonData?: Lesson
	unitData?: Unit
}

export function AssessmentStepper({
	questions,
	contentType,
	onComplete,
	assessmentId = "",
	assessmentTitle = "",
	unitChildren = [],
	courseUnits,
	lessonData,
	unitData
}: AssessmentStepperProps) {
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const [selectedResponse, setSelectedResponse] = React.useState<{ responseIdentifier: string; value: unknown } | null>(
		null
	)
	const [showFeedback, setShowFeedback] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [attemptCount, setAttemptCount] = React.useState(0)
	const [correctAnswersCount, setCorrectAnswersCount] = React.useState(0)
	const [showSummary, setShowSummary] = React.useState(false)
	const [nextItem, setNextItem] = React.useState<{ text: string; path: string } | null>(null)
	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const currentQuestion = questions[currentQuestionIndex]

	const MAX_ATTEMPTS = 3
	const hasExhaustedAttempts = attemptCount >= MAX_ATTEMPTS && !isAnswerCorrect

	const handleCorrectAnswer = React.useCallback(() => {
		if (audioRef.current) {
			audioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
	}, [])

	React.useEffect(() => {
		// This simplified logic runs when the summary screen is about to be shown.
		if (showSummary && lessonData && unitData) {
			let foundNext: { text: string; path: string } | null = null

			// Find the index of the current exercise within its lesson's children.
			const currentContentIndex = lessonData.children.findIndex((child) => child.id === assessmentId)

			// If the exercise is found and it's not the last item in the lesson...
			if (currentContentIndex !== -1 && currentContentIndex < lessonData.children.length - 1) {
				// ...the next item is the next child in the lesson.
				const nextLessonChild = lessonData.children[currentContentIndex + 1]
				if (nextLessonChild) {
					foundNext = {
						text: `Up next: ${nextLessonChild.title}`, // Set the button text to show the next resource name.
						path: nextLessonChild.path || "#"
					}
				}
			}

			// If no next item is found within the lesson (i.e., it was the last one),
			// create a link to go back to the unit overview.
			if (!foundNext) {
				foundNext = { text: `Back to ${unitData.title}`, path: unitData.path }
			}

			setNextItem(foundNext)
		}
	}, [showSummary, assessmentId, lessonData, unitData])

	if (questions.length === 0) {
		return <div>No questions available</div>
	}

	if (showSummary) {
		const percentage = Math.round((correctAnswersCount / questions.length) * 100)
		const getMessage = () => {
			// For exercises, always use blue theme with white text
			if (contentType === "Exercise") {
				if (percentage < 50) {
					return {
						title: "Keep Growing! Keep Grinding!",
						subtitle: "Your level stayed the same. Keep on practicing and you'll level up in no time!",
						titleClass: "text-white",
						bgClass: "bg-blue-950",
						showCharacters: true
					}
				}
				if (percentage >= 50 && percentage < 80) {
					return {
						title: "Keep On Practicing!",
						subtitle: "",
						titleClass: "text-white",
						bgClass: "bg-blue-950",
						showCharacters: true
					}
				}
				return {
					title: "All Done! Great Work!",
					subtitle: "",
					titleClass: "text-white",
					bgClass: "bg-blue-950",
					showCharacters: true
				}
			}

			// For quizzes and tests, use the original color scheme
			if (percentage < 50) {
				return {
					title: "Keep Growing! Keep Grinding!",
					subtitle: "Your level stayed the same. Keep on practicing and you'll level up in no time!",
					titleClass: "text-orange-900",
					bgClass: "bg-orange-100",
					showCharacters: false
				}
			}
			if (percentage >= 50 && percentage < 80) {
				return {
					title: "Keep On Practicing!",
					subtitle: "",
					titleClass: "text-blue-900",
					bgClass: "bg-blue-100",
					showCharacters: false
				}
			}
			return {
				title: "All Done! Great Work!",
				subtitle: "",
				titleClass: "text-green-900",
				bgClass: "bg-green-100",
				showCharacters: false
			}
		}

		const { title, subtitle, titleClass, bgClass, showCharacters } = getMessage()

		return (
			<SummaryView
				title={title}
				subtitle={subtitle}
				titleClass={titleClass}
				bgClass={bgClass}
				showCharacters={showCharacters}
				correctAnswersCount={correctAnswersCount}
				totalQuestions={questions.length}
				contentType={contentType}
				assessmentTitle={assessmentTitle || `${contentType} Assessment`}
				onComplete={onComplete}
				handleReset={() => {
					// Reset the entire assessment to try again
					setCurrentQuestionIndex(0)
					setSelectedResponse(null)
					setShowFeedback(false)
					setIsAnswerCorrect(false)
					setIsAnswerChecked(false)
					setAttemptCount(0)
					setCorrectAnswersCount(0)
					setShowSummary(false)
				}}
				nextItem={nextItem}
			/>
		)
	}

	if (!currentQuestion) {
		return <div className="p-8 text-center text-red-500">Error: Question not found.</div>
	}

	const handleResponseChange = (responseIdentifier: string, response: unknown) => {
		setSelectedResponse({ responseIdentifier, value: response })
		// Reset feedback when user changes answer after a wrong attempt
		if (isAnswerChecked && !isAnswerCorrect) {
			setShowFeedback(false)
			setIsAnswerChecked(false)
		}
	}

	const handleCheckAnswer = async () => {
		if (!selectedResponse || !currentQuestion) return

		setIsSubmitting(true)
		setShowFeedback(false)

		const result = await errors.try(processQtiResponse(currentQuestion.id, selectedResponse))

		setIsSubmitting(false)
		if (result.error) {
			toast.error("Failed to check answer. Please try again.")
			return
		}

		setIsAnswerChecked(true)
		setIsAnswerCorrect(result.data.isCorrect)
		setAttemptCount((prev) => prev + 1)

		if (result.data.isCorrect) {
			handleCorrectAnswer()
			setCorrectAnswersCount((prev) => prev + 1)
			setTimeout(() => setShowFeedback(true), 150)
		} else {
			setShowFeedback(true)
		}
	}

	const goToNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
			setSelectedResponse(null)
			setShowFeedback(false)
			setIsAnswerCorrect(false)
			setIsAnswerChecked(false)
			setAttemptCount(0)
		} else {
			// Show summary when all questions are completed
			setShowSummary(true)
		}
	}

	const handleSkip = () => {
		// Mark as exhausted attempts and move to next
		setAttemptCount(MAX_ATTEMPTS)
		setIsAnswerChecked(true)
		setShowFeedback(true)
		// Move to next question after a short delay
		setTimeout(goToNext, 1500)
	}

	const handleReset = () => {
		// Reset the entire assessment
		setCurrentQuestionIndex(0)
		setSelectedResponse(null)
		setShowFeedback(false)
		setIsAnswerCorrect(false)
		setIsAnswerChecked(false)
		setAttemptCount(0)
		setCorrectAnswersCount(0)
		setShowSummary(false)
	}

	// Determine button text and action
	const getButtonConfig = () => {
		if (isAnswerCorrect) {
			return { text: "Continue", action: goToNext }
		}
		if (hasExhaustedAttempts) {
			return { text: "Next question", action: goToNext }
		}
		if (isAnswerChecked && !isAnswerCorrect) {
			return { text: "Try again", action: handleCheckAnswer }
		}
		return { text: "Check", action: handleCheckAnswer }
	}

	const buttonConfig = getButtonConfig()

	return (
		<div className="flex flex-col h-full bg-white">
			<audio ref={audioRef} src="/correct-sound.mp3" preload="auto">
				<track kind="captions" />
			</audio>
			{/* Assessment Header with Progress Overview */}
			<div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-semibold text-gray-900">{assessmentTitle || `${contentType} Assessment`}</h1>
					{assessmentId && unitChildren.length > 0 && (
						<AssessmentProficiencyOverview
							currentAssessmentId={assessmentId}
							unitChildren={unitChildren}
							courseUnits={courseUnits}
							completedQuestions={currentQuestionIndex}
							totalQuestions={questions.length}
						/>
					)}
				</div>
			</div>
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
				{isAnswerChecked && (isAnswerCorrect || hasExhaustedAttempts) && (
					<div className="absolute inset-0 z-10" aria-hidden="true" />
				)}
			</div>

			<AssessmentBottomNav
				contentType={contentType}
				onContinue={buttonConfig.action}
				buttonText={buttonConfig.text === "Check" ? "Check" : "Continue"}
				isEnabled={!!selectedResponse && !isSubmitting}
				currentQuestion={currentQuestionIndex + 1}
				totalQuestions={questions.length}
				showFeedback={showFeedback}
				isCorrect={isAnswerCorrect}
				onCloseFeedback={() => setShowFeedback(false)}
				onCorrectAnswer={handleCorrectAnswer}
				hasAnswered={isAnswerChecked}
				attemptCount={attemptCount}
				maxAttempts={MAX_ATTEMPTS}
				onSkip={handleSkip}
				onReset={handleReset}
			/>
		</div>
	)
}
