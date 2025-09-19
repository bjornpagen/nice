"use client"

import * as React from "react"

export const Base64Tools = React.forwardRef<{ updateFromBase64: (value: string, questionTitle?: string) => void }, {}>(
	function Base64Tools(props, ref) {
		const [plainText, setPlainText] = React.useState("")
		const [base64Text, setBase64Text] = React.useState("")
		const [sourceQuestion, setSourceQuestion] = React.useState<string>("")

		const updateFromPlain = (value: string) => {
			setPlainText(value)
			setSourceQuestion("") // Clear source when manually typing
			try {
				const encoded = btoa(unescape(encodeURIComponent(value)))
				setBase64Text(encoded)
			} catch (error) {
				setBase64Text("")
			}
		}

		const updateFromBase64 = (value: string, questionTitle?: string) => {
			setBase64Text(value)
			setSourceQuestion(questionTitle || "") // Clear source when manually typing
			try {
				const decoded = decodeURIComponent(escape(atob(value)))
				setPlainText(decoded)
			} catch (error) {
				setPlainText("")
			}
		}

		const extractBase64FromText = () => {
			// Find the first base64 string in the base64 text area
			const base64Regex = /data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/
			const match = base64Text.match(base64Regex)

			if (match?.[1]) {
				const cleanBase64 = match[1]
				setBase64Text(cleanBase64)
				setSourceQuestion("") // Clear source since this is extracted
				try {
					const decoded = decodeURIComponent(escape(atob(cleanBase64)))
					setPlainText(decoded)
				} catch (error) {
					setPlainText("")
				}
			}
		}

		const cleanDoctype = () => {
			// Remove only <!DOCTYPE html> declarations anywhere in the text
			const cleanedText = plainText.replace(/<!DOCTYPE\s+html[^>]*>/gi, "")
			updateFromPlain(cleanedText)
		}

		const copyToClipboard = async (text: string) => {
			try {
				await navigator.clipboard.writeText(text)
			} catch (error) {
				// fallback for older browsers
				const textArea = document.createElement("textarea")
				textArea.value = text
				document.body.appendChild(textArea)
				textArea.select()
				document.execCommand("copy")
				document.body.removeChild(textArea)
			}
		}

		React.useImperativeHandle(ref, () => ({
			updateFromBase64: (value: string, questionTitle?: string) => {
				updateFromBase64(value, questionTitle)
			}
		}))

		return (
			<div className="h-full flex flex-col p-4 gap-4">
				{sourceQuestion && (
					<div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
						<span className="text-blue-700 font-medium">Source:</span>{" "}
						<span className="text-blue-600">{sourceQuestion}</span>
					</div>
				)}
				<div className="flex-1 flex flex-col">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-lg font-semibold">plain text</h3>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={cleanDoctype}
								disabled={!plainText || !plainText.includes("<!DOCTYPE")}
								className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
								title="Remove <!DOCTYPE html> declarations"
							>
								clean DOCTYPE
							</button>
							<button
								type="button"
								onClick={() => copyToClipboard(plainText)}
								disabled={!plainText}
								className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
							>
								copy
							</button>
						</div>
					</div>
					<textarea
						value={plainText}
						onChange={(e) => updateFromPlain(e.target.value)}
						placeholder="enter plain text..."
						className="flex-1 p-2 border rounded resize-none text-sm"
					/>
				</div>

				<div className="flex-1 flex flex-col">
					<div className="flex items-center justify-between mb-2">
						<h3 className="text-lg font-semibold">base64</h3>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={extractBase64FromText}
								disabled={!base64Text || !base64Text.includes("data:image/svg+xml;base64,")}
								className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
								title="Extract pure base64 from XML line"
							>
								extract
							</button>
							<button
								type="button"
								onClick={() => copyToClipboard(base64Text)}
								disabled={!base64Text}
								className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:opacity-50"
							>
								copy
							</button>
						</div>
					</div>
					<textarea
						value={base64Text}
						onChange={(e) => updateFromBase64(e.target.value)}
						placeholder="enter base64..."
						className="flex-1 p-2 border rounded resize-none text-sm"
					/>
				</div>
			</div>
		)
	}
)
