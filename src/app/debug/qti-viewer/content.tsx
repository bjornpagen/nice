"use client"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getQtiHints, type QtiHintsResponse } from "./actions"

export function Content() {
	const [identifier, setIdentifier] = React.useState("")
	const [displayFeedback, setDisplayFeedback] = React.useState(false)
	const [showAll, setShowAll] = React.useState(false)
	const [hintsDialogOpen, setHintsDialogOpen] = React.useState(false)
	const [hintsData, setHintsData] = React.useState<QtiHintsResponse | null>(null)
	const [hintsLoading, setHintsLoading] = React.useState(false)
	const iframeKeyRef = React.useRef(0)

	const reload = () => {
		iframeKeyRef.current += 1
		setDisplayFeedback(false)
	}

	const handleSkip = async () => {
		if (!identifier) return

		setHintsLoading(true)

		// Fetch hints from server action
		const hintsResult = await errors.try(getQtiHints(identifier))
		if (hintsResult.error) {
			logger.error("debug viewer: failed to fetch hints", { error: hintsResult.error, identifier })
			setHintsLoading(false)
			return
		}

		setHintsData(hintsResult.data)
		setHintsLoading(false)
		setHintsDialogOpen(true)

		// Also process the hint request in the background (original behavior)
		const res = await errors.try(
			fetch("/api/debug/qti/process", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier, responseIdentifier: "HINTREQUEST", value: true })
			})
		)
		if (res.error) {
			logger.error("debug viewer: hintrequest failed", { error: res.error, identifier })
		}
	}

	const handleSubmit = async (responseIdentifier: string, value: string) => {
		if (!identifier) return
		const res = await errors.try(
			fetch("/api/debug/qti/process", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier, responseIdentifier, value })
			})
		)
		if (res.error) {
			logger.error("debug viewer: submit failed", { error: res.error, identifier, responseIdentifier })
			return
		}
		setShowAll(false)
		setDisplayFeedback(true)
	}

	// simple form for manual submission
	const [respId, setRespId] = React.useState("")
	const [respVal, setRespVal] = React.useState("")

	return (
		<div className="p-6 space-y-4">
			<div className="flex items-center gap-2">
				<Input
					placeholder="qti item identifier"
					value={identifier}
					onChange={(e) => setIdentifier(e.target.value)}
					className="w-[420px]"
				/>
				<Button onClick={reload} variant="outline">
					Load
				</Button>
				<Button onClick={handleSkip} variant="secondary" disabled={!identifier || hintsLoading}>
					{hintsLoading ? "Loading..." : "Skip (show hints)"}
				</Button>
			</div>
			<div className="flex items-center gap-2">
				<Input
					placeholder="response identifier (e.g., choice_interaction)"
					value={respId}
					onChange={(e) => setRespId(e.target.value)}
					className="w-[420px]"
				/>
				<Input
					placeholder="value (e.g., A)"
					value={respVal}
					onChange={(e) => setRespVal(e.target.value)}
					className="w-[160px]"
				/>
				<Button onClick={() => void handleSubmit(respId, respVal)} disabled={!identifier || !respId || !respVal}>
					Submit
				</Button>
			</div>
			<div className="border rounded overflow-hidden" style={{ height: 600 }}>
				{identifier && (
					<QTIRenderer
						key={iframeKeyRef.current}
						identifier={identifier}
						materialType="assessmentItem"
						height="100%"
						width="100%"
						className="h-full w-full"
						displayFeedback={displayFeedback}
						showAllFeedback={showAll}
					/>
				)}
			</div>

			<Dialog open={hintsDialogOpen} onOpenChange={setHintsDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Question Explanations</DialogTitle>
						<DialogDescription>Here are the explanations for each answer choice in this question:</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 max-h-[70vh] overflow-y-auto">
						{hintsData && (
							<div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
								<div className="font-medium text-sm mb-2 text-primary">Question:</div>
								<div className="text-sm leading-relaxed">{hintsData.questionText}</div>
							</div>
						)}
						{!hintsData || hintsData.hints.length === 0 ? (
							<p className="text-muted-foreground italic">No hints found for this question.</p>
						) : (
							hintsData.hints.map((hint) => (
								<div
									key={hint.choiceId}
									className={`border rounded-lg p-4 ${
										hint.isCorrect
											? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
											: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
									}`}
								>
									<div
										className={`font-medium text-sm mb-2 flex items-center gap-2 ${
											hint.isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
										}`}
									>
										<span>Choice {hint.choiceId}</span>
										<span
											className={`px-2 py-0.5 text-xs font-medium rounded-full ${
												hint.isCorrect
													? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
													: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
											}`}
										>
											{hint.isCorrect ? "Correct" : "Incorrect"}
										</span>
									</div>
									<div
										className={`mb-3 p-2 rounded border-l-2 ${
											hint.isCorrect
												? "bg-green-25 border-green-300 dark:bg-green-900/50 dark:border-green-600"
												: "bg-red-25 border-red-300 dark:bg-red-900/50 dark:border-red-600"
										}`}
									>
										<div className="font-medium text-sm mb-1">Answer:</div>
										<div className="text-sm">{hint.choiceText}</div>
									</div>
									<div>
										<div className="font-medium text-sm mb-1 text-muted-foreground">Explanation:</div>
										<div className="text-sm leading-relaxed">{hint.feedback}</div>
									</div>
								</div>
							))
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
