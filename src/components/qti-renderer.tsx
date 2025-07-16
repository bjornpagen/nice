import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"

// Configuration for QTI embed base URLs by type and environment
const QTI_BASE_URLS = {
	staging: {
		assessmentItem: "https://timeback-staging.alpha-1edtech.com/qti-embed",
		stimulus: "https://timeback-staging.alpha-1edtech.com/qti-stimulus-embed"
	},
	production: {
		assessmentItem: "https://alpha-powerpath-ui-production.up.railway.app/qti-embed",
		stimulus: "https://timeback.alpha-1edtech.com/qti-stimulus-embed"
	}
} as const

// This flag is now derived from the environment
const USE_STAGING = process.env.NODE_ENV !== "production"

interface QTIRendererProps {
	identifier: string
	materialType: "assessmentItem" | "stimulus" // REQUIRED: No fallback - system must specify type
	onResponseChange?: (responseIdentifier: string, response: unknown) => void
	onMessage?: (event: MessageEvent) => void
	onRawMessage?: (event: MessageEvent) => void
	className?: string
	height?: string | number
	width?: string | number
}

export function QTIRenderer({
	identifier,
	materialType, // REQUIRED: No default fallback
	onResponseChange,
	onMessage,
	onRawMessage,
	className = "",
	height = "600px",
	width = "100%"
}: QTIRendererProps) {
	const iframeRef = React.useRef<HTMLIFrameElement>(null)

	const baseUrls = USE_STAGING ? QTI_BASE_URLS.staging : QTI_BASE_URLS.production
	const baseUrl = baseUrls[materialType] // SELECT BASE URL BASED ON MATERIAL TYPE
	const embedUrl = `${baseUrl}/${identifier}`

	// Dynamically derive the expected origin from the base URL.
	// This ensures messages are only processed from the correct source.
	const urlResult = errors.trySync(() => new URL(baseUrl))
	if (urlResult.error) {
		// CRITICAL: URL parsing failed - system must stop, not continue with fallbacks
		throw errors.wrap(urlResult.error, "qti base url parsing failed")
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

			// Call the generic message handler if provided
			if (onMessage) {
				onMessage(event)
			}

			// Keep existing behavior for response changes
			if (event.data.type === "QTI_RESPONSE_CHANGE") {
				const { responseIdentifier, response } = event.data

				// Debug logging to understand what's being sent
				logger.warn("QTI_RESPONSE_CHANGE received:", {
					fullEventData: event.data,
					responseIdentifier,
					response,
					hasResponseIdentifier: responseIdentifier !== undefined && responseIdentifier !== null,
					responseIdentifierType: typeof responseIdentifier
				})

				if (onResponseChange) {
					onResponseChange(responseIdentifier, response)
				}
			}
		}

		window.addEventListener("message", handleMessage)

		return () => {
			window.removeEventListener("message", handleMessage)
		}
	}, [onResponseChange, onMessage, onRawMessage, expectedOrigin])

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
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
			/>
		</div>
	)
}
