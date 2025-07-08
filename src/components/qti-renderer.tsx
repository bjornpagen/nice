import { useEffect, useRef } from "react"

// Configuration for QTI embed environments
const QTI_ENVIRONMENTS = {
	staging: {
		origin: "https://timeback-staging.alpha-1edtech.com",
		embedUrl: "https://timeback-staging.alpha-1edtech.com/qti-embed"
	},
	production: {
		origin: "https://alpha-powerpath-ui-production.up.railway.app",
		embedUrl: "https://alpha-powerpath-ui-production.up.railway.app/qti-embed"
	}
} as const

// Toggle this to switch between environments
const USE_STAGING = true // Set to false to use production
const CURRENT_ENV = USE_STAGING ? QTI_ENVIRONMENTS.staging : QTI_ENVIRONMENTS.production

interface QTIRendererProps {
	identifier: string
	onResponseChange?: (responseIdentifier: string, response: unknown) => void
	onMessage?: (event: MessageEvent) => void
	onRawMessage?: (event: MessageEvent) => void
	className?: string
	height?: string | number
	width?: string | number
}

export function QTIRenderer({
	identifier,
	onResponseChange,
	onMessage,
	onRawMessage,
	className = "",
	height = "600px",
	width = "100%"
}: QTIRendererProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null)

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Always call raw message handler if provided (no filtering)
			if (onRawMessage) {
				onRawMessage(event)
			}

			// Only process messages from the QTI embed domain
			if (event.origin !== CURRENT_ENV.origin) {
				return
			}

			// Call the generic message handler if provided
			if (onMessage) {
				onMessage(event)
			}

			// Keep existing behavior for response changes
			if (event.data.type === "QTI_RESPONSE_CHANGE") {
				const { responseIdentifier, response } = event.data

				if (onResponseChange) {
					onResponseChange(responseIdentifier, response)
				}
			}
		}

		window.addEventListener("message", handleMessage)

		return () => {
			window.removeEventListener("message", handleMessage)
		}
	}, [onResponseChange, onMessage, onRawMessage])

	const embedUrl = `${CURRENT_ENV.embedUrl}/${identifier}`

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
