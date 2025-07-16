"use client"

import { CheckCircle, PenTool, RotateCcw, X } from "lucide-react"
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
	onCorrectAnswer?: () => void
	attemptCount?: number
	maxAttempts?: number
	nextItem?: { text: string; path: string } | null
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
			onCorrectAnswer,
			attemptCount = 0,
			maxAttempts = 3,
			nextItem
		},
		ref
	) => {
		const isComplete = Boolean(currentQuestion && totalQuestions && currentQuestion > totalQuestions)
		const isInProgress = Boolean(
			currentQuestion && totalQuestions && currentQuestion > 0 && currentQuestion <= totalQuestions
		)

		// Call onCorrectAnswer callback when showing correct feedback
		React.useEffect(() => {
			if (showFeedback && isCorrect && onCorrectAnswer) {
				onCorrectAnswer()
			}
		}, [showFeedback, isCorrect, onCorrectAnswer])

		return (
			<div className={cn("bg-white border-t border-gray-200 shadow-lg", className)}>
				<div className="max-w-7xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between">
						{/* Left Section - Action Buttons */}
						<LeftSection isStartScreen={isStartScreen} isComplete={isComplete} isInProgress={isInProgress} />

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
	isInProgress
}: {
	isStartScreen?: boolean
	isComplete?: boolean
	isInProgress?: boolean
}) {
	const handleDrawClick = () => {
		// TODO: Implement draw functionality
	}

	if (isStartScreen || !isInProgress || isComplete) {
		return <div className="w-16" />
	}

	return (
		<HoverCard openDelay={0} closeDelay={0}>
			<HoverCardTrigger>
				<Button
					variant="ghost"
					onClick={handleDrawClick}
					className="text-blue-600 hover:cursor-not-allowed hover:underline hover:text-blue-600 w-16"
				>
					<PenTool className="w-4 h-4" />
				</Button>
			</HoverCardTrigger>
			<HoverCardContent side="top" className="bg-white text-black items-center justify-center w-fit" sideOffset={10}>
				<p className="text-xs">Draw on exercise</p>
			</HoverCardContent>
		</HoverCard>
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
				{Array.from({ length: totalQuestions }, (_, i) => (
					<span
						key={i}
						className={cn(
							"inline-block w-2 h-2 rounded-full ring-1 ring-gray-400 bg-white",
							i < currentQuestion && "bg-gray-400 fill-gray-400",
							i === currentQuestion - 1 && "w-3 h-3"
						)}
					/>
				))}
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
	buttonText,
	currentQuestion,
	totalQuestions,
	onContinue,
	onCloseFeedback,
	onSkip,
	onReset,
	attemptCount,
	maxAttempts,
	nextItem
}: {
	ref?: React.Ref<HTMLButtonElement>
	isStartScreen?: boolean
	isComplete?: boolean
	hasAnswered?: boolean
	showFeedback?: boolean
	isCorrect?: boolean
	isEnabled?: boolean
	buttonText?: "Check" | "Continue"
	currentQuestion?: number
	totalQuestions?: number
	onContinue: () => void
	onCloseFeedback?: () => void
	onSkip?: () => void
	onReset?: () => void
	attemptCount?: number
	maxAttempts?: number
	nextItem?: { text: string; path: string } | null
}) {
	const handleSkipClick = () => {
		if (onSkip) {
			onSkip()
		}
	}

	const handleHintsClick = () => {
		// TODO: Implement hints
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
		return (
			<div className="flex items-center gap-4">
				<Button variant="ghost" onClick={onReset} className="text-blue-600 hover:text-blue-600 hover:underline">
					<RotateCcw className="w-4 h-4 mr-2" />
					Try again
				</Button>
				<Button
					ref={ref}
					variant="default"
					onClick={onContinue}
					className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white"
					asChild
				>
					<Link href={nextItem?.path ?? "#"}>{nextItem?.text ?? "Continue"}</Link>
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
									{(() => {
										if (isCorrect) {
											return (
												<>
													<div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
														<CheckCircle className="w-6 h-6 text-white" />
													</div>
													<div>
														<div className="font-bold text-green-900">Great work!</div>
														<div className="text-sm text-green-700">You got it. Onward!</div>
													</div>
												</>
											)
										}
										if (hasExhaustedAttempts) {
											return (
												<div>
													<div className="font-bold text-orange-900">Out of attempts</div>
													<div className="text-sm text-orange-700">Let's move on to the next question.</div>
												</div>
											)
										}
										return (
											<div>
												<div className="font-bold text-red-900">Not quite!</div>
												<div className="text-sm text-red-700">Give it another try!</div>
											</div>
										)
									})()}
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
					{!hasExhaustedAttempts && (
						<HoverCard openDelay={0} closeDelay={0}>
							<HoverCardTrigger className="hover:cursor-not-allowed">
								<Button
									variant="link"
									onClick={handleHintsClick}
									className="text-blue-600 hover:underline hover:cursor-not-allowed"
									disabled
								>
									Hints
								</Button>
							</HoverCardTrigger>
							<HoverCardContent
								side="top"
								className="bg-white text-black items-center justify-center w-fit"
								sideOffset={10}
							>
								<p className="text-xs">Show solution and move on</p>
							</HoverCardContent>
						</HoverCard>
					)}
					<Button
						ref={ref}
						variant="default"
						onClick={onContinue}
						className="bg-blue-600 text-white rounded-sm px-4 font-medium hover:cursor-pointer hover:bg-blue-600"
					>
						{(() => {
							if (isCorrect) {
								return currentQuestion === totalQuestions ? "Show summary" : "Next question"
							}
							if (hasExhaustedAttempts) {
								return currentQuestion === totalQuestions ? "Show summary" : "Next question"
							}
							return "Try again"
						})()}
					</Button>
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
				{buttonText || "Check"}
			</Button>
		</div>
	)
}
