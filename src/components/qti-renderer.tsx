"use client"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { env } from "@/env"

interface QTIRendererProps {
	identifier: string
	materialType: "assessmentItem" | "stimulus" // REQUIRED: No fallback - system must specify type
	onResponseChange?: (responseIdentifier: string, response: unknown) => void
	onMessage?: (event: MessageEvent) => void
	onRawMessage?: (event: MessageEvent) => void
	className?: string
	height?: string | number
	width?: string | number
	displayFeedback?: boolean
	showAllFeedback?: boolean
}

export function QTIRenderer({
	identifier,
	materialType, // This is explicitly required now
	onResponseChange,
	onMessage,
	onRawMessage,
	className = "",
	height = "600px",
	width = "100%",
	displayFeedback = false,
	showAllFeedback = false
}: QTIRendererProps) {
	const iframeRef = React.useRef<HTMLIFrameElement>(null)

	const baseUrl =
		materialType === "assessmentItem"
			? env.NEXT_PUBLIC_QTI_ASSESSMENT_ITEM_PLAYER_URL
			: env.NEXT_PUBLIC_QTI_STIMULUS_PLAYER_URL

	const embedUrl = `${baseUrl}/${identifier}`

	// Dynamically derive the expected origin from the base URL.
	// This ensures messages are only processed from the correct source.
	const urlResult = errors.trySync(() => new URL(baseUrl))
	if (urlResult.error) {
		// CRITICAL: URL parsing failed - system must stop, not continue with fallbacks
		logger.error("qti base url parsing failed", { error: urlResult.error, baseUrl })
		throw errors.wrap(urlResult.error, "qti base url parsing failed")
	}
	// CRITICAL: Ensure `urlResult.data` is not null/undefined as it's the result of a successful parse.
	// If it somehow were, it indicates an invariant violation.
	if (!urlResult.data) {
		logger.error("qti base url missing parsed URL data", { baseUrl })
		throw errors.new("qti base url: missing parsed URL data")
	}
	const expectedOrigin = urlResult.data.origin

	React.useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Always call raw message handler if provided (no filtering)
			if (onRawMessage) {
				onRawMessage(event)
			}

			// Only process messages from the QTI embed domain
			if (event.origin !== expectedOrigin) {
				return
			}

			// Ignore messages not originating from this specific iframe instance
			if (event.source !== iframeRef.current?.contentWindow) {
				return
			}

			// Call the generic message handler if provided
			if (onMessage) {
				onMessage(event)
			}

			// Keep existing behavior for response changes
			if (event.data.type === "QTI_RESPONSE_CHANGE") {
				const { responseIdentifier, response } = event.data

				if (onResponseChange && responseIdentifier) {
					onResponseChange(responseIdentifier, response)
				}
			}
		}

		window.addEventListener("message", handleMessage)

		return () => {
			window.removeEventListener("message", handleMessage)
		}
	}, [onResponseChange, onMessage, onRawMessage, expectedOrigin])

	React.useEffect(() => {
		if (iframeRef.current?.contentWindow) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "QTI_DISPLAY_FEEDBACK",
					displayResponseFeedback: displayFeedback
				},
				"*"
			)
		}
	}, [displayFeedback])

	React.useEffect(() => {
		if (!showAllFeedback) {
			return
		}
		if (!iframeRef.current?.contentWindow) {
			return
		}
		iframeRef.current.contentWindow.postMessage({ type: "QTI_SHOW_ALL_FEEDBACK" }, "*")
	}, [showAllFeedback])

	// Use 100% for both dimensions when they are percentage values
	const iframeStyle: React.CSSProperties = {
		border: "none",
		width: width === "100%" ? "100%" : width,
		height: height === "100%" ? "100%" : height,
		display: "block"
	}

	return (
		<div className={`qti-renderer ${className}`} style={{ height: "100%", width: "100%" }}>
			<iframe
				ref={iframeRef}
				src={embedUrl}
				style={iframeStyle}
				title={`QTI Content - ${identifier}`}
				allow="fullscreen"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
			/>
		</div>
	)
}
