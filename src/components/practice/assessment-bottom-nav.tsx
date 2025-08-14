"use client"

import { AlertCircle, CheckCircle, PenTool, RotateCcw, X } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

export type AssessmentType = "Exercise" | "Quiz" | "Test"

interface AssessmentBottomNavProps {
	contentType: AssessmentType
	onContinue: () => void
	isEnabled: boolean
	isBusy?: boolean
	buttonText?: "Check" | "Continue"
	isStartScreen?: boolean
	currentQuestion?: number
	totalQuestions?: number
	showFeedback?: boolean
	isCorrect?: boolean
	onCloseFeedback?: () => void
	onSkip?: () => void
	onReset?: () => void
	hasAnswered?: boolean
	className?: string
	attemptCount?: number
	maxAttempts?: number
	nextItem?: { text: string; path: string; type?: string } | null
	onReportIssue?: () => void
	nextEnabled?: boolean
}

const renderContinueButton = (
    isCorrect: boolean | undefined,
    hasExhaustedAttempts: boolean | undefined,
    currentQuestion: number | undefined,
    totalQuestions: number | undefined,
    onContinue: () => void,
    isBusy: boolean | undefined,
    ref?: React.Ref<HTMLButtonElement>
) => {
	const isCompleteOrExhausted = Boolean(isCorrect) || Boolean(hasExhaustedAttempts)
	const isLastQuestion =
		typeof currentQuestion === "number" && typeof totalQuestions === "number" && currentQuestion === totalQuestions
	const buttonText = isCompleteOrExhausted ? (isLastQuestion ? "Show summary" : "Next question") : "Try again"

	return (
		<Button
			ref={ref}
			variant="default"
			onClick={onContinue}
			className={cn(
				"bg-blue-600 text-white rounded-sm px-4 font-medium",
				"disabled:opacity-60 disabled:cursor-not-allowed",
				!isBusy && "hover:cursor-pointer hover:bg-blue-600"
			)}
			disabled={Boolean(isBusy)}
		>
			{buttonText}
		</Button>
	)
}

export const AssessmentBottomNav = React.forwardRef<HTMLButtonElement, AssessmentBottomNavProps>(
	(
		{
			onContinue,
			isEnabled,
			buttonText,
			isStartScreen = false,
			currentQuestion,
			totalQuestions,
			showFeedback = false,
			isCorrect = false,
			onCloseFeedback,
			onSkip,
			onReset,
			hasAnswered = false,
			className,
			attemptCount = 0,
			maxAttempts = 3,
			nextItem,
			onReportIssue,
			nextEnabled = true,
			isBusy = false
		},
		ref
	) => {
		const isComplete = Boolean(currentQuestion && totalQuestions && currentQuestion > totalQuestions)
		const isInProgress = Boolean(
			currentQuestion && totalQuestions && currentQuestion > 0 && currentQuestion <= totalQuestions
		)

		// Removed auto-callback to avoid double-confetti; parent handles correct answer effects.

		return (
			<div className={cn("bg-white border-t border-gray-200 shadow-lg", className)}>
				<div className="max-w-7xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						{/* Left Section - Action Buttons */}
						<LeftSection
							isStartScreen={isStartScreen}
							isComplete={isComplete}
							isInProgress={isInProgress}
							onReportIssue={onReportIssue}
						/>

						{/* Center Section - Progress Dots */}
						<CenterSection
							isStartScreen={isStartScreen}
							isComplete={isComplete}
							currentQuestion={currentQuestion}
							totalQuestions={totalQuestions}
							onReset={onReset}
						/>

						{/* Right Section - Primary Actions */}
						<RightSection
							ref={ref}
							isStartScreen={isStartScreen}
							isComplete={isComplete}
							hasAnswered={hasAnswered}
							showFeedback={showFeedback}
							isCorrect={isCorrect}
							isEnabled={isEnabled}
							isBusy={isBusy}
							buttonText={buttonText}
							currentQuestion={currentQuestion}
							totalQuestions={totalQuestions}
							onContinue={onContinue}
							onCloseFeedback={onCloseFeedback}
							onSkip={onSkip}
							onReset={onReset}
							attemptCount={attemptCount}
							maxAttempts={maxAttempts}
							nextItem={nextItem}
							nextEnabled={nextEnabled}
						/>
					</div>
				</div>
			</div>
		)
	}
)

AssessmentBottomNav.displayName = "AssessmentBottomNav"

function LeftSection({
	isStartScreen,
	isComplete,
	isInProgress,
	onReportIssue
}: {
	isStartScreen?: boolean
	isComplete?: boolean
	isInProgress?: boolean
	onReportIssue?: () => void
}) {
	const handleDrawClick = () => {
		// TODO: Implement draw functionality
	}

	if (isStartScreen || !isInProgress || isComplete) {
		return <div className="w-48" />
	}

	return (
		<div className="flex items-center gap-2 w-48">
			<HoverCard openDelay={0} closeDelay={0}>
				<HoverCardTrigger asChild>
					<Button
						variant="ghost"
						onClick={handleDrawClick}
						className="text-blue-600 hover:cursor-not-allowed hover:underline hover:text-blue-600"
					>
						<PenTool className="w-4 h-4" />
					</Button>
				</HoverCardTrigger>
				<HoverCardContent side="top" className="bg-white text-black items-center justify-center w-fit" sideOffset={10}>
					<p className="text-xs">Draw on exercise</p>
				</HoverCardContent>
			</HoverCard>

			<Button
				variant="link"
				onClick={onReportIssue}
				className="text-xs text-gray-500 hover:text-blue-600 hover:underline px-0 flex items-center gap-1"
			>
				<AlertCircle className="w-3 h-3" />
				Report an issue
			</Button>
		</div>
	)
}

function CenterSection({
	isStartScreen,
	isComplete,
	currentQuestion,
	totalQuestions,
	onReset
}: {
	isStartScreen?: boolean
	isComplete?: boolean
	currentQuestion?: number
	totalQuestions?: number
	onReset?: () => void
}) {
	if (isStartScreen || isComplete || !currentQuestion || !totalQuestions) {
		return <div className="flex-1" />
	}

	// Calculate which dots to show for the carousel
	const MAX_VISIBLE_DOTS = 5
	const HALF_WINDOW = Math.floor(MAX_VISIBLE_DOTS / 2)

	let startIndex = 0
	let endIndex = totalQuestions

	if (totalQuestions > MAX_VISIBLE_DOTS) {
		// Center the current question when possible
		startIndex = Math.max(0, currentQuestion - 1 - HALF_WINDOW)
		endIndex = startIndex + MAX_VISIBLE_DOTS

		// Adjust if we're at the end
		if (endIndex > totalQuestions) {
			endIndex = totalQuestions
			startIndex = Math.max(0, endIndex - MAX_VISIBLE_DOTS)
		}
	}

	const showLeftEllipsis = startIndex > 0
	const showRightEllipsis = endIndex < totalQuestions

	return (
		<div className="flex-1 flex flex-row gap-4 items-center justify-center">
			<Button variant="ghost" asChild>
				<AlertDialog>
					<AlertDialogTrigger>
						<RotateCcw className="w-4 h-4 scale-x-[-1] text-blue-600 hover:cursor-pointer hover:underline hover:text-blue-600" />
					</AlertDialogTrigger>
					<AlertDialogContent className="bg-white text-blue-600">
						<AlertDialogHeader>
							<AlertDialogTitle>Would you like to start over?</AlertDialogTitle>
						</AlertDialogHeader>
						<AlertDialogDescription>
							You can no longer reach "Proficient" on this attempt. You can keep going or start over.
						</AlertDialogDescription>
						<AlertDialogFooter>
							<AlertDialogAction
								onClick={onReset}
								className="bg-white text-blue-600 hover:cursor-pointer hover:bg-white hover:underline"
							>
								Start over
							</AlertDialogAction>
							<AlertDialogCancel className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white hover:ring-1 hover:ring-blue-600 hover:ring-offset-1">
								Keep going
							</AlertDialogCancel>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</Button>

			<p className="text-sm font-medium">
				{currentQuestion} of {totalQuestions}
			</p>
			<div className="flex flex-row items-center justify-center gap-2">
				{showLeftEllipsis && <span className="text-gray-400 text-xs font-medium">...</span>}
				{Array.from({ length: endIndex - startIndex }, (_, i) => {
					const questionIndex = startIndex + i
					const isActive = questionIndex === currentQuestion - 1
					const isCompleted = questionIndex < currentQuestion - 1

					return (
						<span
							key={questionIndex}
							className={cn(
								"inline-block w-2 h-2 rounded-full ring-1 ring-gray-400 bg-white transition-all duration-200",
								isCompleted && "bg-gray-400",
								isActive && "w-3 h-3 bg-blue-600 ring-blue-600"
							)}
						/>
					)
				})}
				{showRightEllipsis && <span className="text-gray-400 text-xs font-medium">...</span>}
			</div>
		</div>
	)
}

function RightSection({
	ref,
	isStartScreen,
	isComplete,
	hasAnswered,
	showFeedback,
	isCorrect,
	isEnabled,
	isBusy,
	buttonText,
	currentQuestion,
	totalQuestions,
	onContinue,
	onCloseFeedback,
	onSkip,
	onReset,
	attemptCount,
	maxAttempts,
	nextItem,
	nextEnabled
}: {
	ref?: React.Ref<HTMLButtonElement>
	isStartScreen?: boolean
	isComplete?: boolean
	hasAnswered?: boolean
	showFeedback?: boolean
	isCorrect?: boolean
	isEnabled?: boolean
	isBusy?: boolean
	buttonText?: "Check" | "Continue"
	currentQuestion?: number
	totalQuestions?: number
	onContinue: () => void
	onCloseFeedback?: () => void
	onSkip?: () => void
	onReset?: () => void
	attemptCount?: number
	maxAttempts?: number
	nextItem?: { text: string; path: string; type?: string } | null
	nextEnabled?: boolean
}) {
	const handleSkipClick = () => {
		if (onSkip) {
			onSkip()
		}
	}

	// Start screen
	if (isStartScreen) {
		return (
			<Button
				ref={ref}
				variant="default"
				onClick={onContinue}
				className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white"
				disabled={!isEnabled}
			>
				Let's go!
			</Button>
		)
	}

	// Complete screen
	if (isComplete) {
		const getTypeLabel = (type: string): string => {
			switch (type) {
				case "Video":
					return "Video"
				case "Article":
					return "Article"
				case "Exercise":
					return "Exercise"
				case "Quiz":
					return "Quiz"
				case "UnitTest":
					return "Unit Test"
				default:
					return type
			}
		}

		const getButtonContent = () => {
			if (nextItem?.path && nextItem.type) {
				return nextEnabled ? (
					<Link href={nextItem.path}>Up next: {getTypeLabel(nextItem.type)}</Link>
				) : (
					<span className="opacity-60 cursor-not-allowed">Up next: {getTypeLabel(nextItem.type)}</span>
				)
			}
			if (nextItem?.path && nextItem.text) {
				return nextEnabled ? (
					<Link href={nextItem.path}>{nextItem.text}</Link>
				) : (
					<span className="opacity-60 cursor-not-allowed">{nextItem.text}</span>
				)
			}
			return <span>Error: Missing navigation data</span>
		}

		return (
			<div className="flex items-center gap-4">
				<Button variant="ghost" onClick={onReset} className="text-blue-600 hover:text-blue-600 hover:underline">
					<RotateCcw className="w-4 h-4 mr-2" />
					Try again
				</Button>
				<Button
					ref={ref}
					variant="default"
					onClick={nextEnabled ? onContinue : undefined}
					className={cn(
						"bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed",
						nextEnabled
							? "hover:cursor-pointer hover:bg-blue-600 hover:text-white"
							: "cursor-not-allowed pointer-events-none"
					)}
					disabled={!nextEnabled}
					asChild
				>
					{getButtonContent()}
				</Button>
			</div>
		)
	}

	// Question answered or feedback shown
	if (hasAnswered || showFeedback) {
		// Check if attempts are exhausted
		const hasExhaustedAttempts = attemptCount && maxAttempts ? attemptCount >= maxAttempts && !isCorrect : false

		return (
			<div className="relative">
				{showFeedback && (
					<div className="absolute bottom-full mb-6 right-0 z-50">
						<div className="relative bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[280px]">
							<div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
							<div className="absolute -bottom-[9px] right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-gray-200" />
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									{isCorrect && (
										<>
											<div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
												<CheckCircle className="w-6 h-6 text-white" />
											</div>
											<div>
												<div className="font-bold text-green-900">Great work!</div>
												<div className="text-sm text-green-700">You got it. Onward!</div>
											</div>
										</>
									)}
									{!isCorrect && hasExhaustedAttempts && (
										<div>
											<div className="font-bold text-orange-900">Out of attempts</div>
											<div className="text-sm text-orange-700">Let's move on to the next question.</div>
										</div>
									)}
									{!isCorrect && !hasExhaustedAttempts && (
										<div>
											<div className="font-bold text-red-900">Not quite!</div>
											<div className="text-sm text-red-700">Give it another try!</div>
										</div>
									)}
								</div>
								{!isCorrect && !hasExhaustedAttempts && (
									<button
										type="button"
										onClick={onCloseFeedback}
										className="text-gray-400 hover:text-gray-600 transition-colors ml-3"
										aria-label="Close feedback"
									>
										<X className="w-4 h-4" />
									</button>
								)}
							</div>
						</div>
					</div>
				)}
				<div className="flex flex-row gap-2">
					{!hasExhaustedAttempts && !isCorrect && (
						<Button variant="link" className="text-blue-600 hover:underline hover:cursor-pointer" asChild>
							<AlertDialog>
								<AlertDialogTrigger className="text-sm text-blue-600 hover:underline hover:cursor-pointer">
									Skip
								</AlertDialogTrigger>
								<AlertDialogContent className="bg-white text-blue-600">
									<AlertDialogHeader>
										<AlertDialogTitle>Are you sure?</AlertDialogTitle>
									</AlertDialogHeader>
									<AlertDialogDescription>
										Skipped questions will count as incorrect. You'll still be able to review the solution.
									</AlertDialogDescription>
									<AlertDialogFooter>
										<AlertDialogAction
											onClick={handleSkipClick}
											className="bg-white text-blue-600 hover:cursor-pointer hover:bg-white hover:underline"
										>
											Yes, skip
										</AlertDialogAction>
										<AlertDialogCancel className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white hover:ring-1 hover:ring-blue-600 hover:ring-offset-1">
											Cancel
										</AlertDialogCancel>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</Button>
					)}
					{renderContinueButton(
						isCorrect,
						hasExhaustedAttempts,
						currentQuestion,
						totalQuestions,
						onContinue,
						isBusy,
						ref
					)}
				</div>
			</div>
		)
	}

	// Unanswered question - show Skip and Check buttons
	return (
		<div className="flex flex-row gap-4">
			<Button variant="link" className="text-blue-600 hover:underline hover:cursor-pointer" asChild>
				<AlertDialog>
					<AlertDialogTrigger className="text-sm text-blue-600 hover:underline hover:cursor-pointer">
						Skip
					</AlertDialogTrigger>
					<AlertDialogContent className="bg-white text-blue-600">
						<AlertDialogHeader>
							<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						</AlertDialogHeader>
						<AlertDialogDescription>
							Skipped questions will count as incorrect. You'll still be able to review the solution.
						</AlertDialogDescription>
						<AlertDialogFooter>
							<AlertDialogAction
								onClick={handleSkipClick}
								className="bg-white text-blue-600 hover:cursor-pointer hover:bg-white hover:underline"
							>
								Yes, skip
							</AlertDialogAction>
							<AlertDialogCancel className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white hover:ring-1 hover:ring-blue-600 hover:ring-offset-1">
								Cancel
							</AlertDialogCancel>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</Button>
			<Button
				ref={ref}
				variant="default"
				onClick={onContinue}
				className={cn(
					"hover:cursor-pointer",
					isEnabled ? "bg-blue-600 text-white hover:bg-blue-600" : "bg-gray-300 text-gray-500 cursor-not-allowed"
				)}
				disabled={!isEnabled}
			>
				{buttonText}
			</Button>
		</div>
	)
}
