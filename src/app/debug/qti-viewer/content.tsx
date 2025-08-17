"use client"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Content() {
	const [identifier, setIdentifier] = React.useState("")
	const [displayFeedback, setDisplayFeedback] = React.useState(false)
	const [showAll, setShowAll] = React.useState(false)
	const iframeKeyRef = React.useRef(0)

	const reload = () => {
		iframeKeyRef.current += 1
		setDisplayFeedback(false)
	}

	const handleSkip = async () => {
		if (!identifier) return
		const res = await errors.try(
			fetch("/api/debug/qti/process", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ identifier, responseIdentifier: "HINTREQUEST", value: true })
			})
		)
		if (res.error) {
			logger.error("debug viewer: hintrequest failed", { error: res.error, identifier })
			return
		}
		// ensure iframe acknowledges feedback display; re-render ensures postMessage runs
		setShowAll(true)
		setDisplayFeedback(true)
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
				<Button onClick={handleSkip} variant="secondary" disabled={!identifier}>
					Skip (show all)
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
		</div>
	)
}
