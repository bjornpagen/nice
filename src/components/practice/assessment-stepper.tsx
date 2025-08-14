"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import confetti from "canvas-confetti"
import { Lock, Unlock } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"
import { useCourseLockStatus } from "@/app/(user)/[subject]/[course]/components/course-lock-status-provider"
import { AssessmentBottomNav, type AssessmentType } from "@/components/practice/assessment-bottom-nav"
import greenFriend from "@/components/practice/course/unit/lesson/exercise/images/green-friend_v3.png"
import lightBlueFriend from "@/components/practice/course/unit/lesson/exercise/images/light-blue-friend_v3.png"
import spaceFriend from "@/components/practice/course/unit/lesson/exercise/images/space-friend_v3.png"
import quizIllustration from "@/components/practice/course/unit/quiz/images/quiz-illustration.png"
import testIllustration from "@/components/practice/course/unit/test/images/test-illustration.png"
import { useLessonProgress } from "@/components/practice/lesson-progress-context"
import { QTIRenderer } from "@/components/qti-renderer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
	finalizeAssessment,
	flagQuestionAsReported,
	getNextAttemptNumber,
	processQuestionResponse
} from "@/lib/actions/assessment"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import type { Question, Unit } from "@/lib/types/domain"
import type { LessonLayoutData } from "@/lib/types/page"
import { cn } from "@/lib/utils"

// Shared helper: render XP penalty alert
function renderPenaltyAlert(penaltyXp: number, contentType: string, xpReason?: string, avgSecondsPerQuestion?: number) {
	const isDark = contentType === "Exercise" || contentType === "Quiz" || contentType === "Test"
	return (
		<Alert
			className={cn(
				"backdrop-blur-sm",
				isDark
					? "border-white/15 bg-white/5 text-white [&_[data-slot=alert-description]]:text-white/80"
					: "border-red-200 bg-red-50 text-red-900 [&_[data-slot=alert-description]]:text-red-900"
			)}
		>
			<AlertTitle className={cn(isDark ? "text-white" : "text-red-900")}>XP penalty applied</AlertTitle>
			<AlertDescription>
				<p>
					{xpReason || "insincere effort detected"}. Deducted
					<span className="font-semibold"> {Math.abs(penaltyXp)} XP</span>
					{typeof avgSecondsPerQuestion === "number" && <> (~{avgSecondsPerQuestion.toFixed(1)}s per question)</>}.
				</p>
				<p>Slow down and aim for accuracy to earn XP.</p>
			</AlertDescription>
		</Alert>
	)
}

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
	nextItem,
	isNextEnabled,
	penaltyXp,
	xpReason,
	avgSecondsPerQuestion
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
	isNextEnabled?: boolean
	penaltyXp?: number
	xpReason?: string
	avgSecondsPerQuestion?: number
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
							className={`text-lg mb-8 whitespace-nowrap ${contentType === "Exercise" || contentType === "Quiz" || contentType === "Test" ? "text-blue-100" : "text-gray-700"}`}
						>
							{subtitle}
						</p>
					)}
					{typeof penaltyXp === "number" && penaltyXp < 0 && (
						<div className="mt-6 w-full max-w-xl mx-auto">
							{renderPenaltyAlert(penaltyXp, contentType, xpReason, avgSecondsPerQuestion)}
						</div>
					)}
					<div className="mt-8">
						<p
							className={`text-3xl font-bold ${contentType === "Exercise" || contentType === "Quiz" || contentType === "Test" ? "text-white" : "text-gray-900"}`}
						>
							{correctAnswersCount}/{totalQuestions} correct
						</p>
					</div>
				</div>

				{/* Illustrations based on content type */}
				{showCharacters && contentType === "Exercise" && (
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
				{showCharacters && contentType === "Quiz" && (
					<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-1/2 max-h-80 w-full hidden [@media(min-height:600px)]:block">
						<Image src={quizIllustration} alt="Quiz illustration" className="w-full h-full object-contain" />
					</div>
				)}
				{showCharacters && contentType === "Test" && (
					<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 justify-center items-center overflow-hidden h-2/3 max-h-96 w-full hidden [@media(min-height:600px)]:block">
						<Image src={testIllustration} alt="Test illustration" className="w-full h-full object-contain" />
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
				nextEnabled={isNextEnabled}
			/>
		</div>
	)
}

interface AssessmentStepperProps {
	questions: Question[]
	contentType: AssessmentType
	onComplete?: () => void
	onerosterComponentResourceSourcedId: string // The OneRoster componentResource sourcedId - used by PowerPath
	onerosterResourceSourcedId: string // The OneRoster resource sourcedId - used for OneRoster assessment results
	onerosterCourseSourcedId: string // The parent course ID for cache invalidation
	assessmentTitle: string
	assessmentPath: string // The canonical URL path for this assessment
	unitData?: Unit
	expectedXp: number
	layoutData?: LessonLayoutData
	// Callback invoked when user starts a new interactive attempt (quiz/test retake)
	onRetake?: (newAttemptNumber: number) => void
}

export function AssessmentStepper({
	questions,
	contentType,
	onComplete,
	onerosterComponentResourceSourcedId,
	onerosterResourceSourcedId,
	onerosterCourseSourcedId, // Destructure the new prop
	assessmentTitle,
	assessmentPath,
	unitData,
	expectedXp, // Will be used when caliper action is updated
	onRetake
}: AssessmentStepperProps) {
	const { user } = useUser()
	const router = useRouter()

	const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)
	const [selectedResponses, setSelectedResponses] = React.useState<Record<string, unknown>>({})
	const [expectedResponses, setExpectedResponses] = React.useState<string[]>([])
	const [showFeedback, setShowFeedback] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [attemptCount, setAttemptCount] = React.useState(0)
	// REMOVED: correctAnswersCount is no longer needed on the client.
	const [showSummary, setShowSummary] = React.useState(false)
	// ADDED: New state to track the current attempt number. Default to 1 for the first attempt.
	const [attemptNumber, setAttemptNumber] = React.useState(1)
	const [sessionResults, setSessionResults] = React.useState<
		{ qtiItemId: string; isCorrect: boolean | null; isReported?: boolean }[]
	>([])

	const [isReportPopoverOpen, setIsReportPopoverOpen] = React.useState(false)
	const [reportText, setReportText] = React.useState("")

	// Store summary data from the server's finalization response
	const [summaryData, setSummaryData] = React.useState<{
		score: number
		correctAnswersCount: number
		totalQuestions: number
		xpPenaltyInfo?: { penaltyXp: number; reason: string; avgSecondsPerQuestion?: number }
	} | null>(null)

	const [nextItem, setNextItem] = React.useState<{ id?: string; text: string; path: string; type?: string } | null>(null)
	const [debugClickCount, setDebugClickCount] = React.useState(0)
	// Track when all finalization operations are fully completed
	const [isFinalizationComplete, setIsFinalizationComplete] = React.useState(false)
	const [isFinalizing, setIsFinalizing] = React.useState(false)

	// Admin-only: practice header lock toggle (far right)
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	// Parse Clerk metadata using errors.trySync (no client logging)
	let userSourceId: string | undefined
	let canUnlockAll = false
	const parsedMetaResult = errors.trySync(() => parseUserPublicMetadata(user?.publicMetadata))
	if (parsedMetaResult.error) {
		userSourceId = undefined
		canUnlockAll = false
	} else {
		userSourceId = parsedMetaResult.data.sourceId
		canUnlockAll = parsedMetaResult.data.roles.some((r) => r.role !== "student")
	}

	const handleToggleLockAll = () => {
		if (!canUnlockAll || !storageKey) return
		if (allUnlocked) {
			setResourceLockStatus(initialResourceLockStatus)
			if (typeof window !== "undefined") {
				window.localStorage.removeItem(storageKey)
			}
			toast.success("Lock state restored to natural progression.")
			return
		}
		const unlockedStatus = Object.fromEntries(Object.keys(resourceLockStatus).map((key) => [key, false]))
		setResourceLockStatus(unlockedStatus)
		if (typeof window !== "undefined") {
			window.localStorage.setItem(storageKey, "1")
		}
		toast.success("All activities have been unlocked.")
	}
	const audioRef = React.useRef<HTMLAudioElement | null>(null)
	const wrongAudioRef = React.useRef<HTMLAudioElement | null>(null)
	const currentQuestion = questions[currentQuestionIndex]
	const assessmentStartTimeRef = React.useRef<Date | null>(null)
	// Removed old summary-time finalization flags
	const { setProgressForResource, beginProgressUpdate, endProgressUpdate } = useLessonProgress()

	// Navigation race-condition guards
	const isNavigatingRef = React.useRef(false)
	const skipTimeoutRef = React.useRef<number | null>(null)

	// Interactive assessments include Exercises as well
	const isInteractiveAssessment = contentType === "Quiz" || contentType === "Test" || contentType === "Exercise"
	const MAX_ATTEMPTS = 3
	const hasExhaustedAttempts = attemptCount >= MAX_ATTEMPTS && !isAnswerCorrect

	// Ensure attempt is initialized for all assessments (now always interactive)
	const [isAttemptReady, setIsAttemptReady] = React.useState<boolean>(false)

	function triggerConfetti() {
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
	}

	function handleCorrectAnswer() {
		if (audioRef.current) {
			audioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
		triggerConfetti()
	}

	function handleWrongAnswer() {
		// 1 in 5000 chance of playing the wrong answer sound
		const shouldPlaySound = Math.random() < 1 / 5000

		if (shouldPlaySound && wrongAudioRef.current) {
			wrongAudioRef.current.play().catch(() => {
				// Ignore audio play errors (e.g., autoplay policy)
			})
		}
	}

	// Record start time when assessment begins
	React.useEffect(() => {
		if (!assessmentStartTimeRef.current && questions.length > 0) {
			assessmentStartTimeRef.current = new Date()
		}
	}, [questions.length])

	// ADDED: Derive attempt number from OneRoster results when component mounts or when assessment changes
	React.useEffect(() => {
		if (!userSourceId || !onerosterResourceSourcedId) {
			return
		}

		if (typeof userSourceId !== "string") {
			return
		}

		// Fetch the next attempt number derived from existing results
		const initializeAttempt = async () => {
			const attemptResult = await errors.try(getNextAttemptNumber(userSourceId, onerosterResourceSourcedId))
			if (attemptResult.error) {
				setIsAttemptReady(false)
				toast.error("Could not initialize assessment. Please reload and try again.")
				return
			}
			setAttemptNumber(attemptResult.data)
			setIsAttemptReady(true)
		}

		initializeAttempt()
	}, [userSourceId, onerosterResourceSourcedId])

	// Cleanup any pending timers on unmount
	React.useEffect(() => {
		return () => {
			if (skipTimeoutRef.current !== null) {
				clearTimeout(skipTimeoutRef.current)
				skipTimeoutRef.current = null
			}
		}
	}, [])

	// If unauthenticated or missing resource id, allow UI but disable server logging
	React.useEffect(() => {
		const hasAuthIds = Boolean(userSourceId && onerosterResourceSourcedId)
		if (!hasAuthIds) {
			setIsAttemptReady(true)
		}
	}, [userSourceId, onerosterResourceSourcedId])

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

			let foundNext: { id?: string; text: string; path: string; type?: string } | null = null

			// If the current item is found and is not the last item in the entire unit...
			if (currentIndex !== -1 && currentIndex < allUnitItems.length - 1) {
				// ...the next item is the one at the next index.
				const nextContent = allUnitItems[currentIndex + 1]
				if (nextContent) {
					foundNext = {
						id: nextContent.id,
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

	// REMOVED: finalizeAndAnalyze function. This logic is now in the `finalizeAssessment` server action.

	// Retake: honor parent onRetake for explicit reset/remount
	const handleReset = async () => {
		if (onRetake) {
			// Use the next attempt number as a hint to parent for UX
			onRetake(attemptNumber + 1)
			return
		}
		// Fallback: local reset then refresh
		setCurrentQuestionIndex(0)
		setSelectedResponses({})
		setExpectedResponses([])
		setShowFeedback(false)
		setIsAnswerCorrect(false)
		setIsAnswerChecked(false)
		setAttemptCount(0)
		setShowSummary(false)
		setSummaryData(null)
		setSessionResults([])
		assessmentStartTimeRef.current = new Date()
		router.refresh()
	}

	if (questions.length === 0) {
		return <div>No questions available</div>
	}

	if (showSummary && summaryData) {
		const percentage =
			summaryData.totalQuestions > 0
				? Math.round((summaryData.correctAnswersCount / summaryData.totalQuestions) * 100)
				: 100
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

			// For quizzes and tests, use the same blue theme as exercises
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

		const { title, subtitle, titleClass, bgClass, showCharacters } = getMessage()

		// Determine if next navigation should be enabled based on lock status (80% rule handled server-side)
		const nextIsUnlocked = nextItem?.id ? resourceLockStatus[nextItem.id] !== true : true
		const isNextEnabled = isFinalizationComplete && nextIsUnlocked

		return (
			<SummaryView
				title={title}
				subtitle={subtitle}
				titleClass={titleClass}
				bgClass={bgClass}
				showCharacters={showCharacters}
				correctAnswersCount={summaryData.correctAnswersCount}
				totalQuestions={summaryData.totalQuestions}
				contentType={contentType}
				assessmentTitle={assessmentTitle}
				onComplete={onComplete}
				handleReset={handleReset}
				nextItem={nextItem}
				isNextEnabled={isNextEnabled}
				penaltyXp={summaryData.xpPenaltyInfo?.penaltyXp}
				xpReason={summaryData.xpPenaltyInfo?.reason}
				avgSecondsPerQuestion={summaryData.xpPenaltyInfo?.avgSecondsPerQuestion}
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
		// Prevent actions before attempt is ready for interactive assessments
		if (isInteractiveAssessment && !isAttemptReady) {
			return
		}
		if (Object.keys(selectedResponses).length === 0 || !currentQuestion) {
			return
		}

		setIsSubmitting(true)
		setShowFeedback(false)

		// Extract user source ID if available (for authenticated users)
		const onerosterUserSourcedId = userSourceId
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

		// REMOVED: isLastQuestion variable is no longer needed for this call.
		const result = await errors.try(
			processQuestionResponse(
				currentQuestion.id,
				responseValue,
				responseIdentifier,
				isAuthenticated ? onerosterUserSourcedId : undefined,
				isAuthenticated ? onerosterComponentResourceSourcedId : undefined,
				isInteractiveAssessment && isAuthenticated,
				attemptNumber - 1 // Pass assessment attempt number (0-indexed)
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
			// REMOVED: Client no longer counts correct answers.
			setTimeout(() => setShowFeedback(true), 150)
		} else {
			handleWrongAnswer()
			setShowFeedback(true)
		}
	}

	const goToNext = async () => {
		// Clear any pending skip auto-advance
		if (skipTimeoutRef.current !== null) {
			clearTimeout(skipTimeoutRef.current)
			skipTimeoutRef.current = null
		}

		if (isNavigatingRef.current || isFinalizing) {
			return
		}
		isNavigatingRef.current = true

		const nextIndex = currentQuestionIndex + 1
		const isLast = nextIndex >= questions.length
		if (isLast) {
			setIsFinalizing(true)
			beginProgressUpdate(onerosterResourceSourcedId)

			const durationInSeconds = assessmentStartTimeRef.current
				? Math.round((Date.now() - assessmentStartTimeRef.current.getTime()) / 1000)
				: undefined
			const userEmail = user?.primaryEmailAddress?.emailAddress

			if (!userSourceId || !userEmail) {
				toast.error("Cannot save results. User session is not valid.")
				setIsFinalizing(false)
				endProgressUpdate(onerosterResourceSourcedId)
				isNavigatingRef.current = false
				return
			}

			const result = await errors.try(
				finalizeAssessment({
					onerosterResourceSourcedId,
					onerosterComponentResourceSourcedId,
					onerosterCourseSourcedId,
					onerosterUserSourcedId: userSourceId,
					sessionResults,
					attemptNumber,
					durationInSeconds,
					expectedXp,
					assessmentTitle,
					assessmentPath,
					unitData,
					userEmail,
					contentType
				})
			)

			if (result.error) {
				setIsFinalizing(false)
				endProgressUpdate(onerosterResourceSourcedId)
				isNavigatingRef.current = false
				toast.error("Could not save final result. Please retry.")
				return
			}

			// Store the authoritative summary data from the server
			const finalSummaryData = result.data

			// Type-safe assignment with validation
			setSummaryData({
				score: finalSummaryData.score,
				correctAnswersCount: finalSummaryData.correctAnswersCount,
				totalQuestions: finalSummaryData.totalQuestions,
				xpPenaltyInfo: finalSummaryData.xpPenaltyInfo
					? {
							penaltyXp:
								typeof finalSummaryData.xpPenaltyInfo.penaltyXp === "number"
									? finalSummaryData.xpPenaltyInfo.penaltyXp
									: 0,
							reason:
								typeof finalSummaryData.xpPenaltyInfo.reason === "string"
									? finalSummaryData.xpPenaltyInfo.reason
									: "Unknown penalty reason",
							avgSecondsPerQuestion: finalSummaryData.xpPenaltyInfo.avgSecondsPerQuestion
						}
					: undefined
			})

			// Update local sidebar progress overlay
			const score = finalSummaryData.score
			const calculateProficiency = () => {
				if (score >= 100) return "proficient" as const
				if (score >= 70) return "familiar" as const
				return "attempted" as const
			}
			const proficiencyLevel = calculateProficiency()

			setProgressForResource(onerosterResourceSourcedId, {
				completed: true,
				score,
				proficiency: proficiencyLevel
			})
			const currentSlug = (assessmentPath || "").split("/").pop()
			if (currentSlug) {
				setProgressForResource(currentSlug, {
					completed: true,
					score,
					proficiency: proficiencyLevel
				})
			}

			endProgressUpdate(onerosterResourceSourcedId)
			router.refresh()
			setIsFinalizationComplete(true)
			setIsFinalizing(false)
			setShowSummary(true)
			isNavigatingRef.current = false
			return
		}

		// Not last: advance to next question and reset per-question state
		setCurrentQuestionIndex((prevIndex) => {
			const next = prevIndex + 1
			setSelectedResponses({})
			setExpectedResponses([])
			setShowFeedback(false)
			setIsAnswerCorrect(false)
			setIsAnswerChecked(false)
			setAttemptCount(0)
			return next
		})

		// Release navigation lock on next frame
		requestAnimationFrame(() => {
			isNavigatingRef.current = false
		})
	}

	const handleSkip = () => {
		// Prevent actions before attempt is ready for interactive assessments
		if (isInteractiveAssessment && !isAttemptReady) {
			return
		}
		// For ALL assessments, treat skip as incorrect (no external logging)

		// NEW: Add skipped result to session state
		setSessionResults((prev) => [...prev, { qtiItemId: currentQuestion.id, isCorrect: false }])

		// Treat skip as wrong answer
		setIsAnswerCorrect(false)
		setAttemptCount(MAX_ATTEMPTS)
		setIsAnswerChecked(true)
		setShowFeedback(true)

		// Move to next question after showing feedback
		skipTimeoutRef.current = window.setTimeout(() => {
			void goToNext()
		}, 1500)
	}

	// OPEN REPORT POPOVER
	const handleReportIssue = () => {
		setIsReportPopoverOpen(true)
		setReportText("")
	}

	// SUBMIT REPORT
	const handleSubmitReport = async () => {
		if (!currentQuestion) return

		if (reportText.trim() === "") {
			toast.error("Please describe the issue.")
			return
		}

		// Save the report text before clearing it
		const savedReportText = reportText.trim()

		// Close popover and clear text
		setIsReportPopoverOpen(false)
		setReportText("")

		// Note: We no longer need to track reported questions locally for scoring.

		const toastId = toast.loading("Reporting issue...")

		// Call the server action to flag the question with the report message.
		const result = await errors.try(flagQuestionAsReported(currentQuestion.id, savedReportText))

		if (result.error) {
			toast.error("Failed to report issue. Please try again.", { id: toastId })
			return
		}

		toast.success("Issue reported. Thank you!", { id: toastId })

		// Add reported question to sessionResults for proficiency analysis
		setSessionResults((prev) => [...prev, { qtiItemId: currentQuestion.id, isCorrect: null, isReported: true }])

		// Immediately advance the student.
		goToNext()
	}

	// Handle try again for wrong answers
	const handleTryAgain = () => {
		setSelectedResponses({})
		setExpectedResponses([])
		setIsAnswerChecked(false)
		setShowFeedback(false)
		// Note: We keep attemptCount as is, since we're continuing with the same question
	}

	// Determine button text and action
	const getButtonConfig = () => {
		if (isAnswerCorrect) {
			return { text: "Continue", action: () => void goToNext() }
		}
		if (hasExhaustedAttempts) {
			return { text: "Next question", action: () => void goToNext() }
		}
		if (isAnswerChecked && !isAnswerCorrect) {
			return { text: "Try again", action: handleTryAgain }
		}
		return { text: "Check", action: handleCheckAnswer }
	}

	const buttonConfig = getButtonConfig()

	// Enable button only when all expected fields have been filled
	const isButtonEnabled =
		expectedResponses.length > 0 &&
		expectedResponses.every((id) => selectedResponses[id] !== "" && selectedResponses[id] !== undefined) &&
		!isSubmitting &&
		!isFinalizing &&
		isAttemptReady

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
				<div className="flex items-center justify-between">
					<div className="w-24" />
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
					<div className="w-24 flex justify-end">
						{canUnlockAll && (
							<Button onClick={handleToggleLockAll} variant="outline" size="sm">
								{allUnlocked ? (
									<>
										<Lock className="w-4 h-4 mr-2" /> Restore Locks
									</>
								) : (
									<>
										<Unlock className="w-4 h-4 mr-2" /> Unlock All
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto overflow-x-hidden relative">
				{/* --- IFRAME PRELOADING --- */}
				{/* Render all question iframes at once, but only display the current one. */}
				{questions.map((question, index) => (
					<div
						key={question.id}
						className="h-full w-full"
						style={{ display: index === currentQuestionIndex ? "block" : "none" }}
					>
						<QTIRenderer
							identifier={question.id}
							materialType="assessmentItem"
							height="100%"
							width="100%"
							className="h-full w-full"
							onResponseChange={handleResponseChange}
							displayFeedback={isAnswerChecked && index === currentQuestionIndex}
						/>
					</div>
				))}
			</div>

			<AssessmentBottomNav
				contentType={contentType}
				onContinue={buttonConfig.action}
				buttonText={buttonConfig.text === "Check" ? "Check" : "Continue"}
				isEnabled={isButtonEnabled}
				isBusy={isSubmitting || isFinalizing}
				currentQuestion={currentQuestionIndex + 1}
				totalQuestions={questions.length}
				showFeedback={showFeedback}
				isCorrect={isAnswerCorrect}
				onCloseFeedback={() => setShowFeedback(false)}
				hasAnswered={isAnswerChecked}
				attemptCount={attemptCount}
				maxAttempts={MAX_ATTEMPTS}
				onSkip={handleSkip}
				onReset={handleReset}
				onReportIssue={handleReportIssue} // PASS THE NEW HANDLER
			/>

			{/* Report Issue Popover */}
			<Popover open={isReportPopoverOpen} onOpenChange={setIsReportPopoverOpen}>
				<PopoverTrigger asChild>
					<div />
				</PopoverTrigger>
				<PopoverContent className="w-96 p-6" align="end" side="top" sideOffset={10}>
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">Report an issue</h3>
							<p className="text-sm text-gray-600 mb-4">
								Help us improve by describing the problem with this question.
							</p>
						</div>
						<div>
							<label htmlFor="report" className="block text-sm font-medium text-gray-700 mb-2">
								What's wrong with this question?
							</label>
							<Textarea
								id="report"
								placeholder="Please describe the issue..."
								value={reportText}
								onChange={(e) => setReportText(e.target.value)}
								rows={4}
								className="w-full"
							/>
						</div>
						<div className="flex justify-end gap-3">
							<Button
								variant="outline"
								onClick={() => {
									setIsReportPopoverOpen(false)
									setReportText("")
								}}
							>
								Cancel
							</Button>
							<Button onClick={handleSubmitReport} disabled={reportText.trim() === ""}>
								Submit Report
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}
