"use client"

import { useState } from "react"
import { QTIRenderer } from "@/components/qti-renderer"

export default function DebugQTIPage() {
	const [events, setEvents] = useState<
		Array<{
			type: string
			data: unknown
			timestamp: string
		}>
	>([])

	const [rawEvents, setRawEvents] = useState<
		Array<{
			origin: string
			data: unknown
			type: string | undefined
			bubbles: boolean
			cancelable: boolean
			composed: boolean
			isTrusted: boolean
			lastEventId: string
			timeStamp: number
			timestamp: string
		}>
	>([])

	// Handle all message events
	const handleMessage = (event: MessageEvent) => {
		setEvents((prev) => [
			...prev,
			{
				type: event.data.type || "UNKNOWN",
				data: event.data,
				timestamp: new Date().toISOString()
			}
		])
	}

	// Handle raw message events without any filtering
	const handleRawMessage = (event: MessageEvent) => {
		// Extract serializable properties from MessageEvent
		setRawEvents((prev) => [
			...prev,
			{
				origin: event.origin,
				data: event.data,
				type: event.type,
				bubbles: event.bubbles,
				cancelable: event.cancelable,
				composed: event.composed,
				isTrusted: event.isTrusted,
				lastEventId: event.lastEventId,
				timeStamp: event.timeStamp,
				timestamp: new Date().toISOString()
			}
		])
	}

	// Keep the specific response change handler for demonstration
	const handleResponseChange = (_responseIdentifier: string, _response: unknown) => {
		// Response changes are now captured in the general event handler
		// This handler is kept for backward compatibility and specific response handling if needed
	}

	const clearEvents = () => {
		setEvents([])
	}

	const clearRawEvents = () => {
		setRawEvents([])
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="border-b pb-4">
				<h1 className="text-3xl font-bold">QTI Renderer Debug</h1>
				<p className="text-gray-600 mt-2">
					Testing QTI content rendering with the demo identifier:{" "}
					<code className="bg-gray-100 px-2 py-1 rounded">nice-question-x00020ee4f0de8b58</code>
				</p>
			</div>

			<div className="grid lg:grid-cols-2 gap-6">
				<div className="space-y-4">
					<h2 className="text-xl font-semibold">QTI Content</h2>
					<div className="border rounded-lg overflow-hidden">
						<QTIRenderer
							identifier="nice-question-x00020ee4f0de8b58"
							onResponseChange={handleResponseChange}
							onMessage={handleMessage}
							onRawMessage={handleRawMessage}
							height="600px"
							width="100%"
						/>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">All Message Events</h2>
						<button
							type="button"
							onClick={clearEvents}
							className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
						>
							Clear
						</button>
					</div>

					<div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
						{events.length === 0 ? (
							<p className="text-gray-500 italic">
								No events captured yet. Interact with the QTI content to see all message events here.
							</p>
						) : (
							<div className="space-y-3">
								{events.map((event, index) => (
									<div key={index} className="bg-white p-3 rounded border">
										<div className="flex items-center justify-between mb-2">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
												{event.type}
											</span>
											<span className="text-sm text-gray-500">{event.timestamp}</span>
										</div>
										<div className="text-sm">
											<div className="font-medium mb-1">Event Data:</div>
											<pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
												{JSON.stringify(event.data, null, 2)}
											</pre>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Raw Events Section */}
			<div className="border-t pt-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold">Raw Message Events (Unfiltered)</h2>
					<button
						type="button"
						onClick={clearRawEvents}
						className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
					>
						Clear Raw Events
					</button>
				</div>

				<div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
					{rawEvents.length === 0 ? (
						<p className="text-gray-500 italic">
							No raw events captured yet. This shows ALL message events from ANY origin.
						</p>
					) : (
						<div className="space-y-3">
							{rawEvents.map((event, index) => (
								<div key={index} className="bg-white p-3 rounded border">
									<div className="text-xs text-gray-500 mb-2">{event.timestamp}</div>
									<div className="grid grid-cols-2 gap-2 text-sm mb-2">
										<div>
											<span className="font-medium">Origin:</span>{" "}
											<code className="bg-gray-100 px-1 rounded text-xs">{event.origin}</code>
										</div>
										<div>
											<span className="font-medium">Type:</span>{" "}
											<code className="bg-gray-100 px-1 rounded text-xs">{event.type}</code>
										</div>
										<div>
											<span className="font-medium">Trusted:</span>{" "}
											<span className={event.isTrusted ? "text-green-600" : "text-red-600"}>
												{event.isTrusted.toString()}
											</span>
										</div>
										<div>
											<span className="font-medium">Timestamp:</span>{" "}
											<span className="text-xs">{event.timeStamp.toFixed(2)}ms</span>
										</div>
									</div>
									<div className="text-sm">
										<div className="font-medium mb-1">Data:</div>
										<pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
											{JSON.stringify(event.data, null, 2)}
										</pre>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			<div className="border-t pt-4">
				<h3 className="text-lg font-semibold mb-3">Integration Information</h3>
				<div className="space-y-2 text-sm">
					<div>
						<strong>Embed URL:</strong>
						<code className="bg-gray-100 px-2 py-1 rounded ml-2">
							https://alpha-powerpath-ui-production.up.railway.app/qti-embed/nice-question-x00020ee4f0de8b58
						</code>
					</div>
					<div>
						<strong>Event Type:</strong>
						<code className="bg-gray-100 px-2 py-1 rounded ml-2">QTI_RESPONSE_CHANGE</code>
					</div>
					<div>
						<strong>Origin:</strong>
						<code className="bg-gray-100 px-2 py-1 rounded ml-2">
							https://alpha-powerpath-ui-production.up.railway.app
						</code>
					</div>
				</div>
			</div>
		</div>
	)
}
