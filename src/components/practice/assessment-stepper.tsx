"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import confetti from "canvas-confetti"
import Image from "next/image"
import * as React from "react"
import { toast } from "sonner"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import { QTIRenderer } from "@/components/qti-renderer"
import {
	checkAndCreateNewAttemptIfNeeded,
	checkExistingProficiency,
	createNewAssessmentAttempt,
	finalizeAssessment,
	processQuestionResponse,
	processSkippedQuestion
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
				<h1 className="text-2xl font-bold text-gray-900">{assessmentTitle}</h1>
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
	onerosterComponentResourceSourcedId: string // The OneRoster componentResource sourcedId (e.g., nice:cr123) - used by PowerPath
	onerosterResourceSourcedId: string // The OneRoster resource sourcedId (e.g., nice:exercise456) - used for OneRoster assessment results
	assessmentTitle: string
	assessmentPath: string // The canonical URL path for this assessment
	unitData?: Unit
	expectedXp: number
}

export function AssessmentStepper({
	questions,
	contentType,
	onComplete,
	onerosterComponentResourceSourcedId,
	onerosterResourceSourcedId,
	assessmentTitle,
	assessmentPath,
	unitData,
	expectedXp // Will be used when caliper action is updated
}: AssessmentStepperProps) {
	const { user } = useUser()
	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const [selectedResponses, setSelectedResponses] = React.useState<Record<string, unknown>>({})
	const [expectedResponses, setExpectedResponses] = React.useState<string[]>([])
	const [showFeedback, setShowFeedback] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [attemptCount, setAttemptCount] = React.useState(0)
	const [correctAnswersCount, setCorrectAnswersCount] = React.useState(0)
	const [showSummary, setShowSummary] = React.useState(false)
	// ADDED: New state to track the current attempt number. Default to 1 for the first attempt.
	const [attemptNumber, setAttemptNumber] = React.useState(1)
	const [sessionResults, setSessionResults] = React.useState<{ qtiItemId: string; isCorrect: boolean }[]>([]) // NEW STATE
	const [nextItem, setNextItem] = React.useState<{ text: string; path: string; type?: string } | null>(null)
	const [debugClickCount, setDebugClickCount] = React.useState(0)
	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const wrongAudioRef = React.useRef<HTMLAudioElement | null>(null)
	const currentQuestion = questions[currentQuestionIndex]
	const assessmentStartTimeRef = React.useRef<Date | null>(null)

	const isInteractiveAssessment = contentType === "Quiz" || contentType === "Test"
	const MAX_ATTEMPTS = 3
	const hasExhaustedAttempts = attemptCount >= MAX_ATTEMPTS && !isAnswerCorrect

	const triggerConfetti = React.useCallback(() => {
		const canvas = document.createElement("canvas")
		canvas.style.position = "fixed"
		canvas.style.bottom = "0"
		canvas.style.right = "0"
		canvas.style.width = "200px"
		canvas.style.height = "200px"
		canvas.style.pointerEvents = "none"
		canvas.style.zIndex = "1000"
		document.body.appendChild(canvas)

		const myConfetti = confetti.create(canvas, {
			resize: true,
			useWorker: true
		})

		const confettiPromise = myConfetti({
			particleCount: 50,
			spread: 70,
			origin: { y: 1, x: 1 },
			angle: 135,
			startVelocity: 30,
			scalar: 0.8,
			ticks: 150,
			colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42"]
		})

		// In modern browsers, confettiPromise will always be a Promise
		// The null case is for old browsers without Promise support
		if (confettiPromise) {
			confettiPromise.then(() => {
				document.body.removeChild(canvas)
			})
		} else {
			// Fallback for browsers without Promise support
			// Remove canvas after animation duration
			setTimeout(() => {
				document.body.removeChild(canvas)
			}, 3000)
		}
	}, [])

	const handleCorrectAnswer = React.useCallback(() => {
		if (audioRef.current) {
			audioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
		triggerConfetti()
	}, [triggerConfetti])

	const handleWrongAnswer = React.useCallback(() => {
		// 1 in 5000 chance of playing the wrong answer sound
		const shouldPlaySound = Math.random() < 1 / 5000

		if (shouldPlaySound && wrongAudioRef.current) {
			wrongAudioRef.current.play().catch(() => {
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
		if (!isInteractiveAssessment || !user?.publicMetadata?.sourceId || !onerosterComponentResourceSourcedId) {
			return
		}

		const onerosterUserSourcedId = user.publicMetadata.sourceId
		if (typeof onerosterUserSourcedId !== "string") {
			return
		}

		// Check if we need to create a new attempt and get the current attempt number
		const initializeAttempt = async () => {
			const currentAttemptNumber = await checkAndCreateNewAttemptIfNeeded(
				onerosterUserSourcedId,
				onerosterComponentResourceSourcedId
			)
			setAttemptNumber(currentAttemptNumber)
		}

		initializeAttempt()
	}, [onerosterComponentResourceSourcedId, isInteractiveAssessment, user?.publicMetadata?.sourceId])

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
			const currentIndex = allUnitItems.findIndex((item) => item.id === onerosterResourceSourcedId)

			let foundNext: { text: string; path: string; type?: string } | null = null

			// If the current item is found and is not the last item in the entire unit...
			if (currentIndex !== -1 && currentIndex < allUnitItems.length - 1) {
				// ...the next item is the one at the next index.
				const nextContent = allUnitItems[currentIndex + 1]
				if (nextContent) {
					foundNext = {
						text: `Up next: ${nextContent.type}`,
						path: nextContent.path,
						type: nextContent.type
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
	}, [showSummary, onerosterResourceSourcedId, unitData])

	// MODIFIED: This useEffect now passes the attemptNumber to the server action.
	React.useEffect(() => {
		if (!showSummary || !onerosterResourceSourcedId || !user?.publicMetadata?.sourceId) {
			return
		}

		// Proper type check for onerosterUserSourcedId
		const onerosterUserSourcedId = user.publicMetadata.sourceId
		if (typeof onerosterUserSourcedId !== "string") {
			return
		}
		const score = questions.length > 0 ? correctAnswersCount / questions.length : 0

		const finalizeAndAnalyze = async () => {
			// Check existing proficiency BEFORE saving the result
			let shouldAwardXp = true

			// Check proficiency for ALL assessments to prevent XP farming race condition
			const proficiencyResult = await errors.try(
				checkExistingProficiency(onerosterUserSourcedId, onerosterResourceSourcedId)
			)
			if (proficiencyResult.error) {
				// NO FALLBACK - if we can't check proficiency, we throw
				throw errors.wrap(proficiencyResult.error, "pre-save proficiency check")
			}

			shouldAwardXp = !proficiencyResult.data

			// NOW save the assessment result
			const saveResult = await errors.try(
				saveAssessmentResult(
					onerosterResourceSourcedId,
					score,
					correctAnswersCount,
					questions.length,
					onerosterUserSourcedId
				)
			)

			if (saveResult.error) {
				throw errors.wrap(saveResult.error, "save assessment result")
			}

			if (isInteractiveAssessment) {
				// First finalize the assessment to ensure all responses are graded
				const finalizeResult = await errors.try(
					finalizeAssessment(onerosterUserSourcedId, onerosterComponentResourceSourcedId)
				)
				if (finalizeResult.error) {
					toast.error("Could not finalize assessment. Proficiency analysis may be incomplete.")
					return shouldAwardXp
				}

				// Add a small delay to ensure PowerPath has processed everything
				await new Promise((resolve) => setTimeout(resolve, 1000))

				// MODIFIED: Pass sessionResults to updateProficiencyFromAssessment
				const analysisPromise = updateProficiencyFromAssessment(
					onerosterUserSourcedId,
					onerosterComponentResourceSourcedId,
					attemptNumber,
					sessionResults // NEW ARGUMENT
				)
				toast.promise(analysisPromise, {
					loading: "Analyzing your skill performance...",
					success: (result) => `Updated proficiency for ${result.exercisesUpdated} skills!`,
					error: "Could not complete skill analysis."
				})
			}

			// Return whether XP should be awarded
			return shouldAwardXp
		}

		// Fire and forget Caliper events
		const sendCaliperEvents = async (shouldAwardXp: boolean) => {
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
			const mappedSubject = subjectMapping[subject]
			if (!mappedSubject) {
				throw errors.new("assessment completion: unmapped subject")
			}

			const userEmail = user.primaryEmailAddress?.emailAddress
			if (!userEmail) {
				throw errors.new("assessment completion: user email required for caliper event")
			}

			const actor = {
				id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${onerosterUserSourcedId}`,
				type: "TimebackUser" as const,
				email: userEmail
			}

			const context = {
				id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}${assessmentPath}`,
				type: "TimebackActivityContext" as const,
				subject: mappedSubject,
				app: { name: "Nice Academy" },
				course: { name: course },
				activity: {
					name: assessmentTitle,
					id: onerosterResourceSourcedId // This is the key fix - ensures we use the proper resource ID
				}
			}

			// Calculate duration before sending events
			let durationInSeconds: number | undefined
			if (assessmentStartTimeRef.current) {
				const endTime = new Date()
				durationInSeconds = Math.floor((endTime.getTime() - assessmentStartTimeRef.current.getTime()) / 1000)
			}

			const performance = {
				expectedXp: expectedXp,
				totalQuestions: questions.length,
				correctQuestions: correctAnswersCount,
				durationInSeconds: durationInSeconds
			}

			// Send activity completed event WITH the shouldAwardXp flag
			void sendCaliperActivityCompletedEvent(actor, context, performance, shouldAwardXp)

			// Send time spent event if we have a duration of at least 1 second
			if (durationInSeconds && durationInSeconds >= 1) {
				void sendCaliperTimeSpentEvent(actor, context, durationInSeconds)
			}
		}

		// Execute both functions with proper async flow
		const executeFinalization = async () => {
			const shouldAwardXp = await finalizeAndAnalyze()
			sendCaliperEvents(shouldAwardXp)
		}

		executeFinalization()
	}, [
		showSummary,
		onerosterComponentResourceSourcedId,
		onerosterResourceSourcedId,
		user,
		correctAnswersCount,
		questions.length,
		isInteractiveAssessment,
		unitData,
		assessmentTitle,
		assessmentPath,
		attemptNumber, // ADDED: Add attemptNumber to dependency array
		expectedXp,
		sessionResults // ADDED: Add sessionResults to dependency array
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
				assessmentTitle={assessmentTitle}
				onComplete={onComplete}
				handleReset={() => {
					// Reset the entire assessment to try again
					setCurrentQuestionIndex(0)
					setSelectedResponses({})
					setExpectedResponses([])
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
		// Add the identifier to our list of expected inputs if it's not already there
		if (!expectedResponses.includes(responseIdentifier)) {
			setExpectedResponses((prev) => [...prev, responseIdentifier])
		}

		// Update the current value for this specific input
		setSelectedResponses((prev) => ({
			...prev,
			[responseIdentifier]: response
		}))

		// Reset feedback when user changes answer after a wrong attempt
		if (isAnswerChecked && !isAnswerCorrect) {
			setShowFeedback(false)
			setIsAnswerChecked(false)
		}
	}

	const handleCheckAnswer = async () => {
		if (Object.keys(selectedResponses).length === 0 || !currentQuestion) {
			return
		}

		setIsSubmitting(true)
		setShowFeedback(false)

		// Extract user source ID if available (for authenticated users)
		const onerosterUserSourcedId = user?.publicMetadata?.sourceId
		const isAuthenticated = typeof onerosterUserSourcedId === "string"

		// Determine response format based on the question type
		const responseIdentifiers = Object.keys(selectedResponses)
		let responseValue: string | unknown[] | Record<string, unknown>
		let responseIdentifier: string

		if (responseIdentifiers.length === 1 && responseIdentifiers[0]) {
			// Single response identifier
			const singleValue = selectedResponses[responseIdentifiers[0]]
			responseIdentifier = responseIdentifiers[0]

			// Check if it's an array (multi-select) or single value
			if (Array.isArray(singleValue)) {
				// Multi-select question - send the array directly
				responseValue = singleValue
			} else {
				// Single response - convert to string for compatibility
				responseValue = String(singleValue)
			}
		} else {
			// Multiple response identifiers (fill-in-the-blank)
			// Check if all identifiers are "RESPONSE" (shouldn't happen, but just in case)
			const allSameIdentifier = responseIdentifiers.every((id) => id === responseIdentifiers[0])

			if (allSameIdentifier && responseIdentifiers[0] === "RESPONSE") {
				// If somehow we have multiple RESPONSE entries, combine into array
				responseValue = Object.values(selectedResponses)
				responseIdentifier = "RESPONSE"
			} else {
				// Different identifiers - this is fill-in-the-blank, send the entire object
				responseValue = selectedResponses
				responseIdentifier = "RESPONSE" // Generic identifier for multi-input
			}
		}

		const result = await errors.try(
			processQuestionResponse(
				currentQuestion.id,
				responseValue,
				responseIdentifier,
				isAuthenticated ? onerosterUserSourcedId : undefined,
				isAuthenticated ? onerosterComponentResourceSourcedId : undefined,
				isInteractiveAssessment && isAuthenticated,
				attemptNumber - 1 // Pass assessment attempt number (0-indexed) instead of question attempt count
			)
		)

		if (result.error) {
			toast.error("Failed to check answer. Please try again.")
			setIsSubmitting(false)
			return
		}

		if (!result.data) {
			throw errors.new("question response: missing result data")
		}

		const isCorrect = result.data.isCorrect
		if (typeof isCorrect !== "boolean") {
			throw errors.new("question response: invalid correctness indicator")
		}

		// NEW: Add result to session state
		setSessionResults((prev) => [...prev, { qtiItemId: currentQuestion.id, isCorrect }])

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
			handleWrongAnswer()
			setShowFeedback(true)
		}
	}

	const goToNext = () => {
		if (currentQuestionIndex < questions.length - 1) {
			setCurrentQuestionIndex(currentQuestionIndex + 1)
			setSelectedResponses({})
			setExpectedResponses([])
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
		// For ALL assessments, treat skip as incorrect
		// Log this as an incorrect response to PowerPath
		if (user?.publicMetadata?.sourceId && onerosterComponentResourceSourcedId && isInteractiveAssessment) {
			const onerosterUserSourcedId = user.publicMetadata.sourceId
			if (typeof onerosterUserSourcedId === "string") {
				processSkippedQuestion(
					currentQuestion.id,
					onerosterUserSourcedId,
					onerosterComponentResourceSourcedId,
					attemptNumber - 1 // Pass assessment attempt number (0-indexed) instead of question attempt count
				).catch(() => {
					// Error is logged inside processSkippedQuestion, no need to log again
				})
			}
		}

		// NEW: Add skipped result to session state
		setSessionResults((prev) => [...prev, { qtiItemId: currentQuestion.id, isCorrect: false }])

		// Treat skip as wrong answer
		setIsAnswerCorrect(false)
		setAttemptCount(MAX_ATTEMPTS)
		setIsAnswerChecked(true)
		setShowFeedback(true)

		// Move to next question after showing feedback
		setTimeout(goToNext, 1500)
	}

	// MODIFIED: handleReset is now async and calls the new action
	const handleReset = async () => {
		// For exercises, just reset without creating a new PowerPath attempt
		if (!isInteractiveAssessment) {
			setCurrentQuestionIndex(0)
			setSelectedResponses({})
			setExpectedResponses([])
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

		const onerosterUserSourcedId = user.publicMetadata.sourceId

		// Step 1: Create a new attempt via the server action.
		const attemptPromise = createNewAssessmentAttempt(onerosterUserSourcedId, onerosterComponentResourceSourcedId)
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
		setSelectedResponses({})
		setExpectedResponses([])
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

	// Enable button only when all expected fields have been filled
	const isButtonEnabled =
		expectedResponses.length > 0 &&
		expectedResponses.every((id) => selectedResponses[id] !== "" && selectedResponses[id] !== undefined) &&
		!isSubmitting

	return (
		<div className="flex flex-col h-full bg-white">
			<audio ref={audioRef} src="/correct-sound.mp3" preload="auto">
				<track kind="captions" />
			</audio>
			<audio ref={wrongAudioRef} src="/wrong-answer.mp3" preload="auto">
				<track kind="captions" />
			</audio>
			{/* Assessment Header */}
			<div className="bg-white px-6 py-4 border-b border-gray-200 flex-shrink-0">
				<div className="flex items-center justify-center">
					<h1
						className="text-xl font-semibold text-gray-900 select-none"
						onClick={() => {
							setDebugClickCount((prev) => prev + 1)
						}}
					>
						{assessmentTitle}
						{debugClickCount >= 5 && currentQuestion && (
							<span className="ml-3 text-sm font-mono text-gray-500">{currentQuestion.id}</span>
						)}
					</h1>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto overflow-x-hidden relative">
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
				isEnabled={isButtonEnabled}
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
