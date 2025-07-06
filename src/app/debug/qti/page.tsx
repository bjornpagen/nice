"use client"

import { useState } from "react"
import { QTIRenderer } from "@/components/qti-renderer"

export default function DebugQTIPage() {
	const [responses, setResponses] = useState<
		Array<{
			responseIdentifier: string
			response: unknown
			timestamp: string
		}>
	>([])

	const handleResponseChange = (responseIdentifier: string, response: unknown) => {
		setResponses((prev) => [
			...prev,
			{
				responseIdentifier,
				response,
				timestamp: new Date().toISOString()
			}
		])
	}

	const clearResponses = () => {
		setResponses([])
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="border-b pb-4">
				<h1 className="text-3xl font-bold">QTI Renderer Debug</h1>
				<p className="text-gray-600 mt-2">
					Testing QTI content rendering with the demo identifier:{" "}
					<code className="bg-gray-100 px-2 py-1 rounded">noun-identification-item-mom</code>
				</p>
			</div>

			<div className="grid lg:grid-cols-2 gap-6">
				<div className="space-y-4">
					<h2 className="text-xl font-semibold">QTI Content</h2>
					<div className="border rounded-lg overflow-hidden">
						<QTIRenderer
							identifier="noun-identification-item-mom"
							onResponseChange={handleResponseChange}
							height="600px"
							width="100%"
						/>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Response Events</h2>
						<button
							type="button"
							onClick={clearResponses}
							className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
						>
							Clear
						</button>
					</div>

					<div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
						{responses.length === 0 ? (
							<p className="text-gray-500 italic">
								No responses captured yet. Interact with the QTI content to see events here.
							</p>
						) : (
							<div className="space-y-3">
								{responses.map((event, index) => (
									<div key={index} className="bg-white p-3 rounded border">
										<div className="text-sm text-gray-500 mb-1">{event.timestamp}</div>
										<div className="font-medium text-sm mb-1">
											Response ID: <span className="font-mono">{event.responseIdentifier}</span>
										</div>
										<div className="text-sm">
											<div className="font-medium mb-1">Response:</div>
											<pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
												{JSON.stringify(event.response, null, 2)}
											</pre>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="border-t pt-4">
				<h3 className="text-lg font-semibold mb-3">Integration Information</h3>
				<div className="space-y-2 text-sm">
					<div>
						<strong>Embed URL:</strong>
						<code className="bg-gray-100 px-2 py-1 rounded ml-2">
							https://alpha-powerpath-ui-production.up.railway.app/qti-embed/noun-identification-item-mom
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
