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
import { AssessmentLoadingSkeleton } from "@/components/practice/assessment-loading-skeleton"
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
	getOrCreateAssessmentState,
	processQuestionResponse,
	reportQuestion,
	skipQuestion,
	startNewAssessmentAttempt,
	submitAnswer
} from "@/lib/actions/assessment"
import type { AssessmentState } from "@/lib/assessment-cache"
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
					{typeof avgSecondsPerQuestion === "number" && <> (~{avgSecondsPerQuestion.toFixed(1)}s per question)</>}
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
	correctAnswersCount: number | null
	totalQuestions: number | null
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
						{typeof correctAnswersCount === "number" && typeof totalQuestions === "number" && (
							<p
								className={`text-3xl font-bold ${contentType === "Exercise" || contentType === "Quiz" || contentType === "Test" ? "text-white" : "text-gray-900"}`}
							>
								{correctAnswersCount}/{totalQuestions} correct
							</p>
						)}
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
				isComplete={true}
				currentQuestion={(totalQuestions ?? 0) + 1} // Setting this higher than totalQuestions to trigger complete state
				totalQuestions={totalQuestions ?? undefined}
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
	// Optional authoritative expected identifiers list for each question
	expectedIdentifiersPromises?: Promise<string[]>[]
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
	onRetake,
	expectedIdentifiersPromises
}: AssessmentStepperProps) {
	const { user } = useUser()
	const router = useRouter()

	const [serverState, setServerState] = React.useState<AssessmentState | null>(null)
	const [visibleQuestionIndex, setVisibleQuestionIndex] = React.useState(0)
	const [isLoading, setIsLoading] = React.useState(true)

	const [selectedResponses, setSelectedResponses] = React.useState<Record<string, unknown>>({})
	const [expectedResponses, setExpectedResponses] = React.useState<string[]>([])
	const [showFeedback, setShowFeedback] = React.useState(false)
	const [isAnswerCorrect, setIsAnswerCorrect] = React.useState(false)
	const [isAnswerChecked, setIsAnswerChecked] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [attemptCount, setAttemptCount] = React.useState(0)
	const [showSummary, setShowSummary] = React.useState(false)

	const [isReportPopoverOpen, setIsReportPopoverOpen] = React.useState(false)
	const [reportText, setReportText] = React.useState("")

	// Store summary data from the server's finalization response
	const [summaryData, setSummaryData] = React.useState<{
		score: number
		correctAnswersCount: number | null
		totalQuestions: number | null
		xpPenaltyInfo?: { penaltyXp: number; reason: string; avgSecondsPerQuestion?: number }
	} | null>(null)

	const [nextItem, setNextItem] = React.useState<{ id?: string; text: string; path: string; type?: string } | null>(
		null
	)
	const [debugClickCount, setDebugClickCount] = React.useState(0)
	// Track when all finalization operations are fully completed
	const [isFinalizationComplete, setIsFinalizationComplete] = React.useState(false)
	const [isFinalizing, setIsFinalizing] = React.useState(false)
	const [loadError, setLoadError] = React.useState(false)

	const assessmentStartTimeRef = React.useRef<Date | null>(null)

	// Guard: ensure summary sfx (sound/confetti) only plays once per attempt
	const hasAnnouncedSummaryRef = React.useRef(false)
	React.useEffect(() => {
		if (showSummary && !hasAnnouncedSummaryRef.current && summaryData) {
			hasAnnouncedSummaryRef.current = true

			// Calculate percentage to determine which sound to play
			const percentage =
				summaryData.totalQuestions !== null && summaryData.totalQuestions > 0 && summaryData.correctAnswersCount !== null
					? Math.round((summaryData.correctAnswersCount / summaryData.totalQuestions) * 100)
					: 0

			// Select sound based on score
			let soundPath: string
			if (percentage >= 90) {
				soundPath = "/assets/audio/mastery-trumpets-sound.mp3"
			} else if (percentage <= 40) {
				soundPath = "/assets/audio/fail-trumpets-sound.mp3"
			} else {
				soundPath = "/assets/audio/activity-complete-sound.mp3"
			}

			const audio = new Audio(soundPath)
			audio.play().catch(() => {})
		}
	}, [showSummary, summaryData])

	// Removed cache-busting logic; no longer needed

	/**
	 * Ensures all per-question state is reset whenever the visible question changes.
	 *
	 * CRITICAL BUSINESS LOGIC:
	 * This useEffect hook serves as the SINGLE SOURCE OF TRUTH for resetting per-question state.
	 * It fixes a bug where state from a previous question could "bleed" into the next one after
	 * a page refresh, leaving the submit button permanently disabled.
	 *
	 * This hook is triggered whenever `visibleQuestionIndex` changes, which happens:
	 * - When navigating to the next question after answering
	 * - When skipping a question
	 * - When reporting a question (which auto-skips)
	 * - When the page is refreshed and re-hydrates with the server's current question index
	 *
	 * DO NOT add manual state resets in other navigation functions. This centralized approach
	 * ensures consistency and prevents state management bugs.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: visibleQuestionIndex dependency is required to reset state on question change
	React.useEffect(() => {
		setSelectedResponses({})
		setExpectedResponses([])
		setShowFeedback(false)
		setIsAnswerCorrect(false)
		setIsAnswerChecked(false)
		setAttemptCount(0)
	}, [visibleQuestionIndex])

	// Read authoritative expected identifiers for the current question when provided
	const serverExpectedForCurrent =
		expectedIdentifiersPromises && expectedIdentifiersPromises[visibleQuestionIndex]
			? React.use(expectedIdentifiersPromises[visibleQuestionIndex]!)
			: undefined

	React.useEffect(() => {
		if (serverExpectedForCurrent && Array.isArray(serverExpectedForCurrent) && serverExpectedForCurrent.length > 0) {
			setExpectedResponses(serverExpectedForCurrent)
		}
	}, [serverExpectedForCurrent])

	// Admin-only: practice header lock toggle (far right)
	const { resourceLockStatus, setResourceLockStatus, initialResourceLockStatus, storageKey } = useCourseLockStatus()
	const { setProgressForResource, beginProgressUpdate, endProgressUpdate } = useLessonProgress()
	const allUnlocked = Object.values(resourceLockStatus).every((isLocked) => !isLocked)
	// Parse Clerk metadata using errors.trySync (no client logging)
	let canUnlockAll = false
	const parsedMetaResult = errors.trySync(() => parseUserPublicMetadata(user?.publicMetadata))
	if (parsedMetaResult.error) {
		canUnlockAll = false
	} else {
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

	// Store init function in a ref to avoid stale closures
	const initStateRef = React.useRef<(retries?: number) => Promise<void>>(null)

	/**
	 * Initializes and synchronizes the assessment state with the server.
	 *
	 * CRITICAL BUSINESS LOGIC:
	 * - This effect is responsible for fetching the server-side assessment state on mount
	 * - The dependency array MUST NOT include `questions.length` because the `questions` prop
	 *   is a new array object on every render, causing infinite re-renders
	 * - The assessment's identity is tied to `onerosterResourceSourcedId`, which is sufficient
	 *   to trigger a re-fetch when the assessment itself changes
	 * - DO NOT add `questions.length` back to dependencies - it will cause infinite loops
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: questions.length intentionally omitted to prevent infinite re-render loop
	React.useEffect(() => {
		let timeoutId: number | null = null

		async function initState(retries = 3): Promise<void> {
			// Guard: ensure init runs once per mount; also if summary already visible or we're finalizing, skip
			if (didInitRef.current || showSummary || isFinalizationComplete || isFinalizing) {
				return
			}
			didInitRef.current = true
			setLoadError(false)
			setIsLoading(true)
			const result = await errors.try(getOrCreateAssessmentState(onerosterResourceSourcedId))
			if (result.error) {
				if (retries > 0) {
					// Avoid stacking toasts in retries
					if (!loadError) toast.info("Retrying load in 5s...")
					// Use window.setTimeout which returns a number in browser environments
					timeoutId = window.setTimeout(() => void initState(retries - 1), 5000)
					return
				}
				toast.error("Could not load assessment after retries.")
				setIsLoading(false)
				setLoadError(true)
				return
			}
			const state = result.data
			setServerState(state)
			const isComplete = state.currentQuestionIndex >= questions.length
			if (!isComplete) {
				// Only set a visible question when in-progress to avoid flashing the last question on completed attempts
				const clampedIndex = Math.max(0, Math.min(state.currentQuestionIndex, questions.length - 1))
				setVisibleQuestionIndex(clampedIndex)
			}

			// NEW: Check for a persistent finalization error first.
			if (state.finalizationError) {
				toast.error(`Could not complete assessment: ${state.finalizationError}`)
				setIsLoading(false)
				setLoadError(true)
				return
			}

			if (state.currentQuestionIndex >= questions.length && !state.isFinalized) {
				setIsFinalizing(true)
				const finalizeResult = await errors.try(
					finalizeAssessment({
						onerosterResourceSourcedId,
						onerosterComponentResourceSourcedId,
						onerosterCourseSourcedId,
						expectedXp,
						assessmentTitle,
						assessmentPath,
						unitData,
						contentType
					})
				)
				if (finalizeResult.error) {
					toast.error("Failed to complete assessment. Retry or contact support.")
					setIsFinalizing(false)
					setIsLoading(false)
					setLoadError(true)
					return
				}
				const finalSummaryData = finalizeResult.data
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
				setShowSummary(true)
				setIsFinalizationComplete(true)
				setIsFinalizing(false)
				setIsLoading(false)
				return
			}

			// Handle already-finalized assessment on refresh
			if (state.currentQuestionIndex >= questions.length && state.isFinalized) {
				if (state.finalSummary) {
					setSummaryData(state.finalSummary)
					setShowSummary(true)
					setIsFinalizationComplete(true)
					setIsLoading(false)
					return
				}
				// Avoid re-finalizing a new attempt; briefly poll for summary to appear to handle propagation
				for (let i = 0; i < 3; i++) {
					await new Promise((r) => setTimeout(r, 200 * (i + 1)))
					const refetch = await errors.try(getOrCreateAssessmentState(onerosterResourceSourcedId))
					if (!refetch.error && refetch.data && refetch.data.finalSummary) {
						setSummaryData(refetch.data.finalSummary)
						setShowSummary(true)
						setIsFinalizationComplete(true)
						setIsLoading(false)
						break
					}
				}
				// If still no summary after retries, keep loading skeleton to avoid flashing question
				return
			}
			// In-progress path: safe to render question now
			setIsLoading(false)
		}

		initStateRef.current = initState
		void initState()

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
		}
	}, [
		onerosterResourceSourcedId,
		onerosterComponentResourceSourcedId,
		onerosterCourseSourcedId,
		assessmentPath,
		assessmentTitle,
		contentType,
		expectedXp,
		// questions.length has been removed to prevent an infinite re-render loop
		unitData
	])

	// Navigation race-condition guards (must be declared before any conditional returns)
	const isNavigatingRef = React.useRef(false)
	const skipTimeoutRef = React.useRef<number | null>(null)
	// Ensure we only refresh once after showing the summary to update shared layouts/locks
	const hasRefreshedAfterSummaryRef = React.useRef(false)

	// After summary appears, refresh once to update server-rendered sidebar/proficiency
	React.useEffect(() => {
		if (showSummary && !hasRefreshedAfterSummaryRef.current) {
			hasRefreshedAfterSummaryRef.current = true
			// Non-blocking refresh to update layout/sidebars
			router.refresh()
		}
	}, [showSummary, router])
	// Guard to ensure init executes only once per mount (avoid Strict Mode double-effect)
	const didInitRef = React.useRef(false)

	// Interactive assessments include Exercises as well
	const MAX_ATTEMPTS = 3

	// Ensure attempt is initialized for all assessments (now always interactive)

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
		if (wrongAudioRef.current) {
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

	// Cleanup any pending timers on unmount
	React.useEffect(() => {
		return () => {
			if (skipTimeoutRef.current !== null) {
				clearTimeout(skipTimeoutRef.current)
				skipTimeoutRef.current = null
			}
		}
	}, [])

	// Cleanup any pending timers on unmount

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

	// Gate rendering on loading state to prevent UI flash
	if (isLoading || !serverState) {
		return <AssessmentLoadingSkeleton />
	}

	if (loadError) {
		return (
			<div className="flex flex-col h-full items-center justify-center p-8 text-center text-red-500">
				<p>Failed to load assessment. Please try again or contact support if the issue persists.</p>
				<Button
					onClick={() => {
						if (initStateRef.current) {
							void initStateRef.current()
						}
					}}
					variant="default"
					className="mt-4 bg-blue-600 text-white"
				>
					Retry
				</Button>
			</div>
		)
	}

	const currentQuestion = questions[visibleQuestionIndex]

	const handleReset = async () => {
		const nextAttemptNumber = (serverState?.attemptNumber ?? 0) + 1

		// Always clear the server-side attempt state so the next load starts fresh.
		const result = await errors.try(startNewAssessmentAttempt(onerosterResourceSourcedId))
		if (result.error) {
			toast.error("Could not start a new attempt. Please refresh the page manually.")
			return
		}

		if (onRetake) {
			// Provide the parent with the upcoming attempt number for UX affordances.
			onRetake(nextAttemptNumber)
			return
		}

		// Now, refreshing the page will correctly generate a new attempt state on the server.
		router.refresh()
	}

	if (questions.length === 0) {
		return <div>No questions available</div>
	}

	if (showSummary && summaryData) {
		/**
		 * Calculate the percentage score for the assessment summary.
		 *
		 * CRITICAL BUSINESS LOGIC:
		 * - When totalQuestions is 0 or null (e.g., all questions were reported/skipped),
		 *   the percentage MUST default to 0, not 100.
		 * - This prevents users from seeing an incorrect "perfect score" when they haven't
		 *   actually answered any scorable questions.
		 * - The default of 0 ensures the UI accurately reflects that no questions were
		 *   successfully answered.
		 *
		 * DO NOT change the default back to 100 - this would show misleading success
		 * messages to users who reported all questions.
		 */
		const percentage =
			summaryData.totalQuestions !== null && summaryData.totalQuestions > 0 && summaryData.correctAnswersCount !== null
				? Math.round((summaryData.correctAnswersCount / summaryData.totalQuestions) * 100)
				: 0
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
				onComplete={() => {
					// Minimal fix: rely on the useEffect(showSummary) one-time refresh.
					// Here we only call the optional parent callback.
					onComplete?.()
				}}
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
		// Derive expected inputs from the shape of the response to avoid timing issues
		if (
			responseIdentifier === "RESPONSE" &&
			typeof response === "object" &&
			response !== null &&
			!Array.isArray(response)
		) {
			// Multi-input (fill-in-the-blank): expected fields are the object's keys
			const keys = Object.keys(response)
			setExpectedResponses((prev) => {
				const base = serverExpectedForCurrent ?? prev
				return Array.from(new Set([...(base ?? []), ...keys]))
			})
		} else {
			// Single input or multi-select: the single identifier is the expectation
			setExpectedResponses((prev) => {
				const base = serverExpectedForCurrent ?? prev
				return responseIdentifier ? Array.from(new Set([...(base ?? []), responseIdentifier])) : base ?? []
			})
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

	/**
	 * Handles the "Check" button action. This function implements a critical piece of business logic:
	 *
	 * 1.  **First Attempt (`attemptCount === 0`):**
	 *     - It calls the `submitAnswer` server action.
	 *     - This action is **authoritative**. It records the user's first answer (correct or incorrect)
	 *       to the persistent Redis state and immediately advances the server's question index.
	 *     - This design intentionally prevents users from gaming the system by refreshing the page
	 *       on an incorrect answer to get another "first attempt". The first answer is final.
	 *
	 * 2.  **Subsequent Attempts (`attemptCount > 0`):**
	 *     - It calls the `processQuestionResponse` server action, which is a **compute-only** check.
	 *     - This provides immediate UI feedback for the "Try Again" loop.
	 *     - These subsequent attempts are purely for formative learning and **do not** alter the
	 *       already-recorded score or state on the server.
	 */
	const handleCheckAnswer = async () => {
		if (Object.keys(selectedResponses).length === 0 || !currentQuestion) {
			return
		}

		setIsSubmitting(true)
		setShowFeedback(false)

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

		let isCorrect = false
		if (attemptCount === 0) {
			// FIRST ATTEMPT: Mutates the server state and advances server index
			const result = await errors.try(
				submitAnswer(
					onerosterResourceSourcedId,
					currentQuestion.id,
					visibleQuestionIndex,
					responseValue,
					responseIdentifier
				)
			)
			if (result.error) {
				toast.error("Failed to save answer. Please try again.")
				setIsSubmitting(false)
				// Force a re-sync with the server on failure
				if (initStateRef.current) void initStateRef.current()
				return
			}
			const { state: newState, isCorrect: correct } = result.data
			setServerState(newState) // Update server state, index is now advanced
			isCorrect = correct
			setIsAnswerCorrect(isCorrect)
		} else {
			// RETRY ATTEMPT: Compute-only check for UI feedback
			const result = await errors.try(processQuestionResponse(currentQuestion.id, responseValue, responseIdentifier))
			if (result.error || !result.data) {
				toast.error("Failed to check answer. Please try again.")
				setIsSubmitting(false)
				// It's safest to re-sync even on a compute failure
				if (initStateRef.current) void initStateRef.current()
				return
			}
			isCorrect = result.data.isCorrect
			setIsAnswerCorrect(isCorrect)
		}

		// Shared logic for showing feedback after any attempt
		setShowFeedback(true)

		setIsSubmitting(false)
		setIsAnswerChecked(true)
		setAttemptCount((prev) => prev + 1)

		if (isCorrect) {
			handleCorrectAnswer()
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

		const nextIndex = serverState.currentQuestionIndex
		const isLast = nextIndex >= questions.length

		// --- MODIFICATION START ---
		// First, check if the assessment is complete. This prevents updating
		// the visible index to an out-of-bounds value.
		if (isLast) {
			setIsFinalizing(true)
			beginProgressUpdate(onerosterResourceSourcedId)

			const result = await errors.try(
				finalizeAssessment({
					onerosterResourceSourcedId,
					onerosterComponentResourceSourcedId,
					onerosterCourseSourcedId,
					expectedXp,
					assessmentTitle,
					assessmentPath,
					unitData,
					contentType
				})
			)

			if (result.error) {
				setIsFinalizing(false)
				endProgressUpdate(onerosterResourceSourcedId)
				// FIX: Release the navigation lock on failure to allow the user to retry.
				isNavigatingRef.current = false
				toast.error("Could not save final result. Please retry.")
				return
			}

			// (Code to set summaryData and progress remains the same)...
			const finalSummaryData = result.data
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

			// (Code for setProgressForResource remains the same)...
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
			// REMOVED: router.refresh() - This was the cause of the double-render bug.
			setIsFinalizationComplete(true)
			setIsFinalizing(false)
			setShowSummary(true) // This is sufficient to show the summary.
			isNavigatingRef.current = false
			return
		}

		// This part only runs if it's NOT the last question.
		// Sync the UI with the server state before advancing
		setVisibleQuestionIndex(serverState.currentQuestionIndex)
		// --- MODIFICATION END ---

		// Not last: advance to next question
		// The server has already updated the currentQuestionIndex
		// Per-question state reset is handled by the useEffect watching visibleQuestionIndex

		// Release navigation lock on next frame
		requestAnimationFrame(() => {
			isNavigatingRef.current = false
		})
	}

	const handleTryAgain = () => {
		// Mirror debug/QTI behavior: preserve current responses so users only fix incorrect parts
		setIsAnswerChecked(false)
		setShowFeedback(false)
		// Note: We keep attemptCount as is, since we're continuing with the same question
	}

	const handleSkip = async () => {
		if (!currentQuestion) return

		if (isNavigatingRef.current || isFinalizing) {
			return
		}

		// Only allow skip when server and UI indices are in sync and before first check
		if (!serverState || serverState.currentQuestionIndex !== visibleQuestionIndex || attemptCount > 0) {
			toast.error("Skip is unavailable after checking or when the question has already advanced.")
			return
		}

		isNavigatingRef.current = true

		const result = await errors.try(skipQuestion(onerosterResourceSourcedId, currentQuestion.id, visibleQuestionIndex))
		if (result.error) {
			toast.error("Failed to skip question. Please try again.")
			isNavigatingRef.current = false
			// Force a re-sync with the server on failure
			if (initStateRef.current) void initStateRef.current()
			return
		}
		setServerState(result.data.state)
		const nextIndex = result.data.state.currentQuestionIndex
		// If skipping advanced past the last question, finalize immediately
		if (nextIndex >= questions.length) {
			setIsFinalizing(true)
			beginProgressUpdate(onerosterResourceSourcedId)
			const resultFinalize = await errors.try(
				finalizeAssessment({
					onerosterResourceSourcedId,
					onerosterComponentResourceSourcedId,
					onerosterCourseSourcedId,
					expectedXp,
					assessmentTitle,
					assessmentPath,
					unitData,
					contentType
				})
			)
			if (resultFinalize.error) {
				setIsFinalizing(false)
				endProgressUpdate(onerosterResourceSourcedId)
				toast.error("Could not save final result. Please retry.")
				isNavigatingRef.current = false
				return
			}
			const finalSummaryData = resultFinalize.data
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
			const score = finalSummaryData.score
			const calculateProficiency = () => {
				if (score >= 100) return "proficient" as const
				if (score >= 70) return "familiar" as const
				return "attempted" as const
			}
			const proficiencyLevel = calculateProficiency()
			setProgressForResource(onerosterResourceSourcedId, { completed: true, score, proficiency: proficiencyLevel })
			const currentSlug = (assessmentPath || "").split("/").pop()
			if (currentSlug) {
				setProgressForResource(currentSlug, { completed: true, score, proficiency: proficiencyLevel })
			}
			endProgressUpdate(onerosterResourceSourcedId)
			setIsFinalizationComplete(true)
			setIsFinalizing(false)
			setShowSummary(true)
			isNavigatingRef.current = false
			return
		}
		setVisibleQuestionIndex(nextIndex)

		// Per-question state reset is handled by the useEffect watching visibleQuestionIndex
		isNavigatingRef.current = false
	}

	// OPEN REPORT POPOVER
	const handleReportIssue = () => {
		// Only allow report when server and UI indices are in sync and before first check
		if (!serverState || serverState.currentQuestionIndex !== visibleQuestionIndex || attemptCount > 0) {
			toast.error("Report is unavailable after checking or when the question has already advanced.")
			return
		}
		setIsReportPopoverOpen(true)
		setReportText("")
	}

	/**
	 * Submits a user's report about a question. This function implements another key piece of business logic:
	 *
	 * - It calls the `reportQuestion` server action, which performs two main tasks:
	 *   1. Flags the question in the external reporting service.
	 *   2. Atomically updates the assessment state in Redis to mark the question as `isReported: true`
	 *      and **advances the `currentQuestionIndex`**.
	 * - The client then syncs its UI to this new server state.
	 * - **Effect:** The user is intentionally and immediately moved to the next question. This "report and skip"
	 *   flow removes the problematic question from the user's path and ensures it is excluded from final scoring.
	 */
	const handleSubmitReport = async () => {
		if (!currentQuestion) return

		if (reportText.trim() === "") {
			toast.error("Please describe the issue.")
			return
		}

		const savedReportText = reportText.trim()
		setIsReportPopoverOpen(false)
		setReportText("")

		const toastId = toast.loading("Reporting issue...")

		const result = await errors.try(
			reportQuestion(onerosterResourceSourcedId, currentQuestion.id, visibleQuestionIndex, savedReportText)
		)

		if (result.error) {
			toast.error("Failed to report issue. Please try again.", { id: toastId })
			// Force a re-sync on failure to be safe
			if (initStateRef.current) void initStateRef.current()
			return
		}

		toast.success("Issue reported. Thank you!", { id: toastId })

		// Update the state based on the atomic response from the server
		if (result.data.state) {
			setServerState(result.data.state)
			const nextIndex = result.data.state.currentQuestionIndex
			// If reporting advanced past the last question, finalize immediately
			if (nextIndex >= questions.length) {
				setIsFinalizing(true)
				beginProgressUpdate(onerosterResourceSourcedId)
				const resultFinalize = await errors.try(
					finalizeAssessment({
						onerosterResourceSourcedId,
						onerosterComponentResourceSourcedId,
						onerosterCourseSourcedId,
						expectedXp,
						assessmentTitle,
						assessmentPath,
						unitData,
						contentType
					})
				)
				if (resultFinalize.error) {
					setIsFinalizing(false)
					endProgressUpdate(onerosterResourceSourcedId)
					toast.error("Could not save final result. Please retry.")
					return
				}
				const finalSummaryData = resultFinalize.data
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
				const score = finalSummaryData.score
				const calculateProficiency = () => {
					if (score >= 100) return "proficient" as const
					if (score >= 70) return "familiar" as const
					return "attempted" as const
				}
				const proficiencyLevel = calculateProficiency()
				setProgressForResource(onerosterResourceSourcedId, { completed: true, score, proficiency: proficiencyLevel })
				const currentSlug = (assessmentPath || "").split("/").pop()
				if (currentSlug) {
					setProgressForResource(currentSlug, { completed: true, score, proficiency: proficiencyLevel })
				}
				endProgressUpdate(onerosterResourceSourcedId)
				setIsFinalizationComplete(true)
				setIsFinalizing(false)
				setShowSummary(true)
				return
			}
			setVisibleQuestionIndex(nextIndex)

			// Per-question state reset is handled by the useEffect watching visibleQuestionIndex
		} else {
			toast.error("Failed to refresh after report. Reloading...")
			// Full reload is the safest recovery here
			router.refresh()
		}
	}

	// Determine button text and action
	const getButtonConfig = () => {
		const hasExhaustedAttempts = attemptCount >= MAX_ATTEMPTS && !isAnswerCorrect
		const isLastQuestion = visibleQuestionIndex >= questions.length - 1

		if (isAnswerCorrect) {
			return { text: isLastQuestion ? "Show summary" : "Continue", action: () => void goToNext() }
		}
		if (hasExhaustedAttempts) {
			return { text: isLastQuestion ? "Show summary" : "Next question", action: () => void goToNext() }
		}
		if (isAnswerChecked && !isAnswerCorrect) {
			return { text: "Try again", action: handleTryAgain }
		}
		// Default state: The user has not yet checked their answer.
		return { text: "Check", action: handleCheckAnswer }
	}

	const buttonConfig = getButtonConfig()

	// Enable button only when all expected fields have been filled
	// Enable continue either when inputs are complete OR when feedback is being shown
	// Determine if inputs are sufficiently filled to enable the Check button
	function isMeaningfulValue(value: unknown): boolean {
		if (typeof value === "string") {
			return value.trim().length > 0
		}
		if (Array.isArray(value)) {
			return value.length > 0
		}
		return value !== null && value !== undefined
	}

	function computeHasAllExpectedFilled(): boolean {
		// Primary path: use explicit expectedResponses derived from the latest response shape
		if (expectedResponses.length > 0) {
			// Support nested multi-input stored under selectedResponses["RESPONSE"]
			const nested = selectedResponses.RESPONSE
			if (nested && typeof nested === "object" && !Array.isArray(nested)) {
				// Type guard ensures nested is an object, so we can safely access properties
				// Using Object.entries to iterate without type assertions
				const nestedEntries = Object.entries(nested)
				const nestedMap = new Map(nestedEntries)
				return expectedResponses.every((key) => {
					// Access the property value safely via Map
					const value = nestedMap.get(key)
					return isMeaningfulValue(value)
				})
			}
			// Fallback to top-level entries
			return expectedResponses.every((key) => isMeaningfulValue(selectedResponses[key]))
		}

		// Fallback path: no expectedResponses yet (edge timing). Infer readiness from current selection.
		const maybe = selectedResponses.RESPONSE
		if (maybe && typeof maybe === "object" && !Array.isArray(maybe)) {
			// Multi-input object: require all present keys to be meaningful if any exist
			const entries = Object.values(maybe)
			return entries.length > 0 && entries.every((v) => isMeaningfulValue(v))
		}
		// Single input or multi-select array or string under a known identifier
		const values = Object.values(selectedResponses)
		// Enable only if at least one meaningful value exists
		return values.some((v) => isMeaningfulValue(v))
	}

	const hasAllExpectedFilled = computeHasAllExpectedFilled()

	const isButtonEnabled = (isAnswerChecked || hasAllExpectedFilled) && !isSubmitting && !isFinalizing

	return (
		<div className="flex flex-col h-full bg-white">
			<audio ref={audioRef} src="/assets/audio/correct-answer-sound.mp3" preload="auto">
				<track kind="captions" />
			</audio>
			<audio ref={wrongAudioRef} src="/assets/audio/incorrect-answer-sound.mp3" preload="auto">
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
				{/**
				 * CRITICAL BUSINESS LOGIC:
				 * - The `key` prop MUST use `question.id` to ensure React correctly tracks each question component
				 * - Using `visibleQuestionIndex` as the key causes severe performance degradation and incorrect
				 *   question content display because it's not unique across list items
				 * - When the key changes, React remounts the entire iframe, causing flickering and data loss
				 * - Each question has a stable, unique ID that properly identifies it across navigation
				 * - DO NOT change the key prop back to visibleQuestionIndex - it will break question rendering
				 */}
				{questions.map((question, index) => (
					<div
						key={question.id}
						className="h-full w-full"
						style={{ display: index === visibleQuestionIndex ? "block" : "none" }}
					>
						<QTIRenderer
							identifier={question.id}
							materialType="assessmentItem"
							height="100%"
							width="100%"
							className="h-full w-full"
							onResponseChange={handleResponseChange}
							displayFeedback={isAnswerChecked && index === visibleQuestionIndex}
							showAllFeedback={isAnswerChecked && !isAnswerCorrect && index === visibleQuestionIndex}
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
				currentQuestion={visibleQuestionIndex + 1}
				totalQuestions={questions.length}
				showFeedback={showFeedback}
				isCorrect={isAnswerCorrect}
				onCloseFeedback={() => setShowFeedback(false)}
				hasAnswered={isAnswerChecked}
				attemptCount={attemptCount}
				maxAttempts={MAX_ATTEMPTS}
				onSkip={handleSkip}
				onReset={handleReset}
				onReportIssue={handleReportIssue}
				canSkip={Boolean(
					serverState && serverState.currentQuestionIndex === visibleQuestionIndex && attemptCount === 0
				)}
				canReport={Boolean(
					serverState && serverState.currentQuestionIndex === visibleQuestionIndex && attemptCount === 0
				)}
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
