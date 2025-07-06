import { useEffect, useRef } from "react"

interface QTIRendererProps {
	identifier: string
	onResponseChange?: (responseIdentifier: string, response: unknown) => void
	className?: string
	height?: string | number
	width?: string | number
}

export function QTIRenderer({
	identifier,
	onResponseChange,
	className = "",
	height = "600px",
	width = "100%"
}: QTIRendererProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null)

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			// Only process messages from the QTI embed domain
			if (event.origin !== "https://alpha-powerpath-ui-production.up.railway.app") {
				return
			}

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
	}, [onResponseChange])

	const embedUrl = `https://alpha-powerpath-ui-production.up.railway.app/qti-embed/${identifier}`

	return (
		<div className={`qti-renderer ${className}`}>
			<iframe
				ref={iframeRef}
				src={embedUrl}
				width={width}
				height={height}
				style={{ border: "none" }}
				title={`QTI Content - ${identifier}`}
				allow="fullscreen"
				sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
			/>
		</div>
	)
}
