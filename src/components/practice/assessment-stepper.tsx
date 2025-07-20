"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import Image from "next/image"
import * as React from "react"
import { toast } from "sonner"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import { QTIRenderer } from "@/components/qti-renderer"
import {
	checkAndCreateNewAttemptIfNeeded,
	createNewAssessmentAttempt,
	finalizeAssessment,
	processQuestionResponse
} from "@/lib/actions/assessment"
import { sendCaliperActivityCompletedEvent, sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { updateProficiencyFromAssessment } from "@/lib/actions/proficiency"
import { saveAssessmentResult } from "@/lib/actions/tracking"
import type { Question, Unit } from "@/lib/types/domain"
import { AssessmentBottomNav, type AssessmentType } from "./assessment-bottom-nav"

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
	assessmentId?: string // ComponentResource ID for PowerPath
	resourceId?: string // Resource ID for OneRoster assessment results
	assessmentTitle?: string
	unitData?: Unit
}

export function AssessmentStepper({
	questions,
	contentType,
	onComplete,
	assessmentId = "",
	resourceId = "",
	assessmentTitle = "",
	unitData
}: AssessmentStepperProps) {
	const { user } = useUser()
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
	// ADDED: New state to track the current attempt number. Default to 1 for the first attempt.
	const [attemptNumber, setAttemptNumber] = React.useState(1)
	const [nextItem, setNextItem] = React.useState<{ text: string; path: string } | null>(null)
	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const currentQuestion = questions[currentQuestionIndex]
	const assessmentStartTimeRef = React.useRef<Date | null>(null)

	const isInteractiveAssessment = contentType === "Quiz" || contentType === "Test"
	const MAX_ATTEMPTS = 3
	const hasExhaustedAttempts = attemptCount >= MAX_ATTEMPTS && !isAnswerCorrect

	const handleCorrectAnswer = React.useCallback(() => {
		if (audioRef.current) {
			audioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
	}, [])

	// Record start time when assessment begins
	React.useEffect(() => {
		if (!assessmentStartTimeRef.current && questions.length > 0) {
			assessmentStartTimeRef.current = new Date()
		}
	}, [questions.length])

	// ADDED: Check for and create new attempt when component mounts or when assessment changes
	React.useEffect(() => {
		if (!isInteractiveAssessment || !user?.publicMetadata?.sourceId || !assessmentId) {
			return
		}

		const userSourcedId = user.publicMetadata.sourceId
		if (typeof userSourcedId !== "string") {
			return
		}

		// Check if we need to create a new attempt and get the current attempt number
		const initializeAttempt = async () => {
			const currentAttemptNumber = await checkAndCreateNewAttemptIfNeeded(userSourcedId, assessmentId)
			setAttemptNumber(currentAttemptNumber)
		}

		initializeAttempt()
	}, [assessmentId, isInteractiveAssessment, user?.publicMetadata?.sourceId])

	React.useEffect(() => {
		// When the summary screen is shown, determine the next piece of content.
		if (showSummary && unitData) {
			// Create a flattened, ordered list of all navigable content items in the unit.
			// This includes items within lessons (articles, videos, exercises) and
			// unit-level items like quizzes and unit tests.
			const allUnitItems: Array<{ id: string; path: string; type: string; title: string }> = []
			for (const unitChild of unitData.children) {
				if (unitChild.type === "Lesson") {
					// Add all children of the lesson to the list
					for (const lessonChild of unitChild.children) {
						allUnitItems.push({
							id: lessonChild.id,
							path: lessonChild.path,
							type: lessonChild.type,
							title: lessonChild.title
						})
					}
				} else if (unitChild.type === "Quiz" || unitChild.type === "UnitTest") {
					// Add the quiz or unit test itself to the list
					allUnitItems.push({
						id: unitChild.id,
						path: unitChild.path,
						type: unitChild.type,
						title: unitChild.title
					})
				}
			}

			// Find the index of the current assessment within this flattened list.
			const currentIndex = allUnitItems.findIndex((item) => item.id === assessmentId)

			let foundNext: { text: string; path: string } | null = null

			// If the current item is found and is not the last item in the entire unit...
			if (currentIndex !== -1 && currentIndex < allUnitItems.length - 1) {
				// ...the next item is the one at the next index.
				const nextContent = allUnitItems[currentIndex + 1]
				if (nextContent) {
					foundNext = {
						text: `Up next: ${nextContent.type}`,
						path: nextContent.path || "#"
					}
				}
			}

			// If no next item is found (meaning it's the last item in the unit),
			// then the action is to go back to the unit overview page.
			if (!foundNext) {
				foundNext = { text: `Back to ${unitData.title}`, path: unitData.path }
			}

			setNextItem(foundNext)
		}
	}, [showSummary, assessmentId, unitData])

	// MODIFIED: This useEffect now passes the attemptNumber to the server action.
	React.useEffect(() => {
		if (!showSummary || !resourceId || !user?.publicMetadata?.sourceId) {
			return
		}

		// Proper type check for userSourcedId
		const userSourcedId = user.publicMetadata.sourceId
		if (typeof userSourcedId !== "string") {
			return
		}
		const score = questions.length > 0 ? correctAnswersCount / questions.length : 0

		const finalizeAndAnalyze = async () => {
			await errors.try(saveAssessmentResult(resourceId, score, correctAnswersCount, questions.length, userSourcedId))

			if (isInteractiveAssessment) {
				// First finalize the assessment to ensure all responses are graded
				const finalizeResult = await errors.try(finalizeAssessment(userSourcedId, assessmentId))
				if (finalizeResult.error) {
					toast.error("Could not finalize assessment. Proficiency analysis may be incomplete.")
					return
				}

				// Add a small delay to ensure PowerPath has processed everything
				await new Promise((resolve) => setTimeout(resolve, 1000))

				// Pass the attemptNumber to the action
				const analysisPromise = updateProficiencyFromAssessment(userSourcedId, assessmentId, attemptNumber)
				toast.promise(analysisPromise, {
					loading: "Analyzing your skill performance...",
					success: (result) => `Updated proficiency for ${result.exercisesUpdated} skills!`,
					error: "Could not complete skill analysis."
				})
			}
		}

		// Fire and forget Caliper events
		const sendCaliperEvents = async () => {
			if (!unitData) return

			// Extract subject and course from unit path: "/{subject}/{course}/{unit}"
			const pathParts = unitData.path.split("/")
			if (pathParts.length < 3) return
			const subject = pathParts[1]
			const course = pathParts[2]
			if (!subject || !course) return

			// Map subject to valid enum values
			const subjectMapping: Record<string, "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"> = {
				science: "Science",
				math: "Math",
				reading: "Reading",
				language: "Language",
				"social-studies": "Social Studies"
			}
			const mappedSubject = subjectMapping[subject] ?? "None"

			const actor = {
				id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${userSourcedId}`,
				type: "TimebackUser" as const,
				email: user.primaryEmailAddress?.emailAddress ?? ""
			}

			const context = {
				id: `https://alpharead.alpha.school/assessments/${assessmentId}`,
				type: "TimebackActivityContext" as const,
				subject: mappedSubject,
				app: { name: "Nice Academy" },
				course: { name: course },
				activity: { name: assessmentTitle }
			}

			const metrics = [
				{ type: "totalQuestions" as const, value: questions.length },
				{ type: "correctQuestions" as const, value: correctAnswersCount }
			]

			// Send activity completed event
			void sendCaliperActivityCompletedEvent(actor, context, metrics)

			// Send time spent event if we have a start time
			if (assessmentStartTimeRef.current) {
				const endTime = new Date()
				const durationInSeconds = Math.floor((endTime.getTime() - assessmentStartTimeRef.current.getTime()) / 1000)

				// Only send if assessment took at least 1 second
				if (durationInSeconds >= 1) {
					void sendCaliperTimeSpentEvent(actor, context, durationInSeconds)
				}
			}
		}

		finalizeAndAnalyze()
		sendCaliperEvents()
	}, [
		showSummary,
		assessmentId,
		resourceId,
		user,
		correctAnswersCount,
		questions.length,
		isInteractiveAssessment,
		unitData,
		assessmentTitle,
		attemptNumber // ADDED: Add attemptNumber to dependency array
	])

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
		if (!selectedResponse || !currentQuestion || !user?.publicMetadata?.sourceId) return

		setIsSubmitting(true)
		setShowFeedback(false)

		const userSourcedId = user.publicMetadata.sourceId
		if (typeof userSourcedId !== "string") return

		// Call server action to process question response
		const responseValue =
			typeof selectedResponse.value === "string" ? selectedResponse.value : String(selectedResponse.value)

		const result = await errors.try(
			processQuestionResponse(
				currentQuestion.id,
				responseValue,
				userSourcedId,
				assessmentId,
				isInteractiveAssessment,
				attemptCount // Pass the current attempt count
			)
		)

		if (result.error) {
			toast.error("Failed to check answer. Please try again.")
			setIsSubmitting(false)
			return
		}

		const isCorrect = result.data?.isCorrect ?? false

		setIsSubmitting(false)
		setIsAnswerChecked(true)
		setIsAnswerCorrect(isCorrect)
		setAttemptCount((prev) => prev + 1)

		if (isCorrect) {
			handleCorrectAnswer()
			// Only count as correct if it was answered correctly on the first attempt
			if (attemptCount === 0) {
				setCorrectAnswersCount((prev) => prev + 1)
			}
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

	// MODIFIED: handleReset is now async and calls the new action
	const handleReset = async () => {
		// For exercises, just reset without creating a new PowerPath attempt
		if (!isInteractiveAssessment) {
			setCurrentQuestionIndex(0)
			setSelectedResponse(null)
			setShowFeedback(false)
			setIsAnswerCorrect(false)
			setIsAnswerChecked(false)
			setAttemptCount(0)
			setCorrectAnswersCount(0)
			setShowSummary(false)
			assessmentStartTimeRef.current = new Date()
			return
		}

		// For quizzes and tests, create a new PowerPath attempt
		if (!user?.publicMetadata?.sourceId) {
			toast.error("Could not start a new attempt. User session is invalid.")
			return
		}

		// Proper type checking instead of assertion
		if (typeof user.publicMetadata.sourceId !== "string") {
			toast.error("Invalid user session data.")
			return
		}

		const userSourcedId = user.publicMetadata.sourceId

		// Step 1: Create a new attempt via the server action.
		const attemptPromise = createNewAssessmentAttempt(userSourcedId, assessmentId)
		toast.promise(attemptPromise, {
			loading: "Starting a new attempt...",
			success: "New attempt started. Good luck!",
			error: "Failed to start a new attempt. Please try again."
		})

		const result = await errors.try(attemptPromise)
		if (result.error) {
			// If the API call fails, we do NOT reset the state. The user can try again.
			return
		}

		// MODIFIED: Capture the new attempt number from the API response.
		const newAttemptNumber = result.data.attempt.attempt
		if (typeof newAttemptNumber !== "number") {
			toast.error("Could not retrieve new attempt number from the server.")
			return
		}
		setAttemptNumber(newAttemptNumber) // Update state with the new attempt number

		// Step 2: Only on success, reset the component's state for the new attempt.
		setCurrentQuestionIndex(0)
		setSelectedResponse(null)
		setShowFeedback(false)
		setIsAnswerCorrect(false)
		setIsAnswerChecked(false)
		setAttemptCount(0)
		setCorrectAnswersCount(0)
		setShowSummary(false)
		assessmentStartTimeRef.current = new Date() // Reset the timer for the new attempt
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
			{/* Assessment Header */}
			<div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-center">
					<h1 className="text-xl font-semibold text-gray-900">{assessmentTitle || `${contentType} Assessment`}</h1>
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
