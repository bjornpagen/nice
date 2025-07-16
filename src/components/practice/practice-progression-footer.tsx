"use client"

import _ from "lodash"
import { PenTool, RotateCcw } from "lucide-react"
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
import type { CourseMaterial, QuestionsData } from "@/lib/v2/types"

interface PracticeProgressionFooterProps extends React.ComponentProps<"div"> {
	questions?: QuestionsData["questions"]
	next?: { type: CourseMaterial["type"]; title: string }
	index: number
	setIndex: (index: number) => void
	onContinue?: () => void
	onSkip?: () => void
	onReset?: () => void
	onComplete?: () => void
	onDraw?: () => void
	onHints?: () => void
}

function PracticeProgressionFooter({
	questions,
	next,
	index,
	setIndex,
	onContinue,
	onSkip,
	onReset,
	onComplete,
	onDraw,
	onHints,
	className,
	...props
}: PracticeProgressionFooterProps) {
	const [answered, setAnswered] = React.useState<boolean>(false)

	if (questions == null) {
		return (
			<div className={cn("bg-white flex flex-row gap-8 items-center justify-end", className)} {...props}>
				<Button
					variant="default"
					onClick={onComplete}
					className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white"
				>
					{next == null ? "Proceed" : `Up next: ${_.startCase(next.type)}`}
				</Button>
			</div>
		)
	}

	return (
		<div className={cn("bg-white flex flex-row gap-8 items-center", className)} {...props}>
			<LeftSection
				questions={questions}
				index={index}
				setIndex={setIndex}
				setAnswered={setAnswered}
				onReset={onReset}
				onDraw={onDraw}
			/>
			<CenterSection
				questions={questions}
				index={index}
				setIndex={setIndex}
				setAnswered={setAnswered}
				onReset={onReset}
			/>
			<RightSection
				questions={questions}
				next={next}
				index={index}
				setIndex={setIndex}
				answered={answered}
				setAnswered={setAnswered}
				onContinue={onContinue}
				onSkip={onSkip}
				onComplete={onComplete}
				onHints={onHints}
			/>
		</div>
	)
}

function LeftSection({
	questions,
	index,
	setIndex,
	setAnswered,
	onReset,
	onDraw
}: {
	questions: QuestionsData["questions"]
	index: number
	setIndex: (index: number) => void
	setAnswered: (answered: boolean) => void
	onReset?: () => void
	onDraw?: () => void
}) {
	const handleResetClick = () => {
		setIndex(-1)
		setAnswered(false)
		onReset?.()
	}

	const handleDrawClick = () => {
		onDraw?.()
	}

	if (index < 0) {
		return <div />
	}

	if (index >= questions.length) {
		return (
			<Button
				variant="ghost"
				onClick={handleResetClick}
				className="text-blue-600 hover:cursor-pointer hover:underline hover:text-blue-600"
			>
				<RotateCcw className="w-4 h-4" />
				<span className="text-sm">Try again</span>
			</Button>
		)
	}

	return (
		<HoverCard openDelay={0} closeDelay={0}>
			<HoverCardTrigger>
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
	)
}

function CenterSection({
	questions,
	index,
	setIndex,
	setAnswered,
	onReset
}: {
	questions: QuestionsData["questions"]
	index: number
	setIndex: (index: number) => void
	setAnswered: (answered: boolean) => void
	onReset?: () => void
}) {
	const handleResetClick = () => {
		setIndex(-1)
		setAnswered(false)
		onReset?.()
	}

	if (_.inRange(index, 0, questions.length) === false) {
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
								onClick={handleResetClick}
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
				{index + 1} of {questions.length}
			</p>
			<div className="flex flex-row items-center justify-center gap-2">
				{questions.map((_, i) => (
					<span
						key={i}
						className={cn(
							"inline-block w-2 h-2 rounded-full ring-1 ring-gray-400 bg-white",
							i <= index && "bg-gray-400 fill-gray-400",
							i === index && "w-3 h-3"
						)}
					/>
				))}
			</div>
		</div>
	)
}

function RightSection({
	questions,
	next,
	index,
	setIndex,
	answered,
	setAnswered,
	onContinue,
	onSkip,
	onComplete,
	onHints
}: {
	questions: QuestionsData["questions"]
	next?: { type: CourseMaterial["type"]; title: string }
	index: number
	setIndex: (index: number) => void
	answered: boolean
	setAnswered: (answered: boolean) => void
	onContinue?: () => void
	onSkip?: () => void
	onComplete?: () => void
	onHints?: () => void
}) {
	const handleCompleteClick = () => {
		setIndex(questions.length)
		onComplete?.()
	}

	const handleProgressionClick = () => {
		if (index < questions.length) {
			setIndex(index + 1)
		}
		setAnswered(false)
		onContinue?.()
	}

	const handleSkipClick = () => {
		setAnswered(true)
		onSkip?.()
	}

	const handleHintsClick = () => {
		onHints?.()
	}

	if (index >= questions.length) {
		return (
			<Button
				variant="default"
				onClick={handleCompleteClick}
				className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white"
			>
				{next == null ? "Proceed" : `Up next: ${_.startCase(next.type)}`}
			</Button>
		)
	}

	if (index === -1) {
		return (
			<Button
				variant="default"
				onClick={handleProgressionClick}
				className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600 hover:text-white"
				disabled={questions.length <= 0}
			>
				Let's go!
			</Button>
		)
	}

	if (answered) {
		return (
			<div className="flex flex-row gap-2">
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
				<Button
					variant="default"
					onClick={handleProgressionClick}
					className="bg-blue-600 text-white rounded-sm px-4 font-medium hover:cursor-pointer hover:bg-blue-600"
				>
					{index === questions.length - 1 ? "Show summary" : "Next question"}
				</Button>
			</div>
		)
	}

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
				variant="default"
				onClick={handleProgressionClick}
				className="bg-blue-600 text-white hover:cursor-pointer hover:bg-blue-600"
			>
				Check
			</Button>
		</div>
	)
}

export { PracticeProgressionFooter }
