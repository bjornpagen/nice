import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { create } from "xmlbuilder2"
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces"

// --- TYPE DEFINITIONS for Khan Academy Course Structure ---
interface KhanCourse {
	id: string
	title: string
	description?: string
	path: string
	units: KhanUnit[]
}

interface KhanUnit {
	id: string
	title: string
	description?: string
	path: string
	lessons: KhanLesson[]
	unitTest?: KhanExercise // Some units may have unit tests
}

interface KhanLesson {
	id: string
	title: string
	description?: string
	path: string
	exercises?: KhanExercise[]
	quizzes?: KhanExercise[] // Some lessons may have quizzes
	videos?: unknown[] // Ignored
	articles?: unknown[] // Ignored
}

interface KhanExercise {
	id: string
	slug: string
	title: string
	description?: string
	path: string
	questions: KhanQuestion[]
}

interface KhanQuestion {
	id: string
	sha?: string
	problemType?: string
	parsedData: {
		question: {
			content: string
			widgets: { [key: string]: PerseusWidget }
			images?: { [key: string]: { height: number; width: number; url?: string } }
		}
		hints: PerseusHint[]
		answerArea?: object
	}
}

// --- EXISTING TYPE DEFINITIONS for Perseus (kept from original) ---
interface PerseusHint {
	content: string
	images?: { [key: string]: { height: number; width: number } }
	replace: boolean
	widgets: { [key: string]: PerseusWidget }
}

// Generic widget options for non-interactive widgets
interface PerseusGenericOptions {
	[key: string]: unknown
}

interface PerseusWidget {
	type: "radio" | "numeric-input" | "definition" | "explanation" | "image" | "interactive-graph" | string
	options:
		| PerseusRadioOptions
		| PerseusNumericOptions
		| PerseusImageOptions
		| PerseusDefinitionOptions
		| PerseusExplanationOptions
		| PerseusInteractiveGraphOptions
		| PerseusGenericOptions
}

interface PerseusRadioOptions {
	choices: { content: string; correct: boolean; clue?: string; isNoneOfTheAbove?: boolean }[]
	countChoices: boolean
	deselectEnabled: boolean
	displayCount: null | number
	hasNoneOfTheAbove: boolean
	multipleSelect: boolean
	numCorrect: number
	randomize: boolean
}

interface PerseusNumericOptions {
	answers: {
		value: number
		maxError: null | number
		message: string
		simplify: string
		status: string
		strict: boolean
		answerForms?: string[] // Add support for math answer forms
	}[]
	coefficient: boolean
	labelText: string
	multipleNumberInput: boolean
	rightAlign: boolean
	size: string
	static: boolean
}

interface PerseusImageOptions {
	backgroundImage?: { url: string; width?: number; height?: number }
	alt?: string
	caption?: string
}

interface PerseusDefinitionOptions {
	togglePrompt?: string
	definition?: string
	static?: boolean
}

interface PerseusExplanationOptions {
	showPrompt?: string
	hidePrompt?: string
	explanation?: string
	static?: boolean
}

interface PerseusInteractiveGraphOptions {
	correct?: {
		coords?: Array<[number, number]>
		type?: string
		numSides?: string
		snapTo?: string
	}
	graph?: {
		type?: string
		numSides?: string
		snapTo?: string
	}
	range?: [[number, number], [number, number]]
	gridStep?: [number, number]
	snapStep?: [number, number]
	backgroundImage?: {
		url?: string
		width?: number
		height?: number
	}
}

/**
 * Generates an SVG coordinate grid as a data URI
 */
function generateCoordinateGridSVG(
	range: [[number, number], [number, number]],
	width: number,
	height: number,
	gridStep?: [number, number]
): string {
	const [[xMin, xMax], [yMin, yMax]] = range
	const [xStep, yStep] = gridStep || [1, 1]

	// Calculate the position of the origin in pixel coordinates
	const originX = ((0 - xMin) / (xMax - xMin)) * width
	const originY = height - ((0 - yMin) / (yMax - yMin)) * height

	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`

	// Background
	svg += `<rect width="${width}" height="${height}" fill="white"/>`

	// Grid lines
	svg += `<g stroke="#e0e0e0" stroke-width="1">`

	// Vertical grid lines
	for (let x = xMin; x <= xMax; x += xStep) {
		const xPixel = ((x - xMin) / (xMax - xMin)) * width
		svg += `<line x1="${xPixel}" y1="0" x2="${xPixel}" y2="${height}"/>`
	}

	// Horizontal grid lines
	for (let y = yMin; y <= yMax; y += yStep) {
		const yPixel = height - ((y - yMin) / (yMax - yMin)) * height
		svg += `<line x1="0" y1="${yPixel}" x2="${width}" y2="${yPixel}"/>`
	}

	svg += "</g>"

	// Axes (thicker and darker)
	svg += `<g stroke="#333" stroke-width="2">`

	// X-axis (if visible)
	if (yMin <= 0 && yMax >= 0) {
		svg += `<line x1="0" y1="${originY}" x2="${width}" y2="${originY}"/>`
	}

	// Y-axis (if visible)
	if (xMin <= 0 && xMax >= 0) {
		svg += `<line x1="${originX}" y1="0" x2="${originX}" y2="${height}"/>`
	}

	svg += "</g>"

	// Axis labels
	svg += `<g font-family="Arial, sans-serif" font-size="12" fill="#333">`

	// X-axis labels
	for (let x = Math.ceil(xMin); x <= xMax; x += xStep) {
		if (x !== 0) {
			// Skip label at origin
			const xPixel = ((x - xMin) / (xMax - xMin)) * width
			svg += `<text x="${xPixel}" y="${originY + 20}" text-anchor="middle">${x}</text>`
		}
	}

	// Y-axis labels
	for (let y = Math.ceil(yMin); y <= yMax; y += yStep) {
		if (y !== 0) {
			// Skip label at origin
			const yPixel = height - ((y - yMin) / (yMax - yMin)) * height
			svg += `<text x="${originX - 10}" y="${yPixel + 5}" text-anchor="end">${y}</text>`
		}
	}

	// Origin label
	if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
		svg += `<text x="${originX - 10}" y="${originY + 20}" text-anchor="end">0</text>`
	}

	svg += "</g>"
	svg += "</svg>"

	// Convert to data URI
	const encoded = Buffer.from(svg).toString("base64")
	return `data:image/svg+xml;base64,${encoded}`
}

/**
 * Enhanced transformer for Perseus content (kept from original).
 */
function transformContent(content: string, hintWidgets?: { [key: string]: PerseusWidget }): string {
	if (!content) return ""
	let transformed = content

	// First, handle widget placeholders in hints
	if (hintWidgets) {
		const placeholderRegex = /\[\[☃ (.*?)\]\]/g
		transformed = transformed.replace(placeholderRegex, (_match, widgetId: string) => {
			const widget = hintWidgets[widgetId]
			if (!widget) return "" // Remove placeholder if widget not found

			// Handle image widgets in hints
			if (widget.type === "image") {
				const imageUrl = (widget.options as PerseusImageOptions).backgroundImage?.url
				if (imageUrl) {
					return `<figure><img src="${imageUrl}" alt="${(widget.options as PerseusImageOptions).alt || "Hint image"}"/></figure>`
				}
			}
			// Remove other widget placeholders for now
			return ""
		})
	}

	transformed = transformed.replace(/web\+graphie:\/\//g, "https://")
	transformed = transformed.replace(
		/!\[.*?\]\((.*?)\)/g,
		(_match, url: string) => `<img src="${url}" alt="A number line diagram"/>`
	)
	transformed = transformed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
	transformed = transformed.replace(/\$((?:\\?[a-zA-Z]+\{[^}]+\}|[^$])+)\$/g, (_match, mathContent: string) => {
		// First, handle special LaTeX sequences before escaping
		let safeMath = mathContent
			// Handle degree symbol
			.replace(/\\degree/g, "°")
			.replace(/\\deg/g, "°")
			// Now escape XML special characters
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;")

		// Handle LaTeX color commands - convert to MathML with color
		const colorMap: { [key: string]: string } = {
			"\\blueD": "#1865f2",
			"\\greenD": "#009400",
			"\\purpleD": "#9059ff",
			"\\redD": "#ff0000",
			"\\orangeD": "#ff8800",
			"\\pinkD": "#ff00ff",
			"\\goldD": "#ffaa00",
			"\\tealD": "#11accd"
		}

		// Keep track of processed segments to avoid double-processing
		const processedSegments: Array<{ start: number; end: number; content: string }> = []

		// Process color commands
		for (const [latex, color] of Object.entries(colorMap)) {
			// Match color command followed by content
			const regex = new RegExp(`${latex.replace(/\\/g, "\\\\")}([0-9]+|[a-zA-Z]|\\{[^}]+\\})`, "g")
			let match: RegExpExecArray | null = regex.exec(safeMath)
			while (match !== null) {
				const fullMatch = match[0]
				const content = (match[1] ?? "").replace(/[{}]/g, "")
				const start = match.index ?? 0
				const end = start + fullMatch.length

				// Store the processed segment
				processedSegments.push({
					start,
					end,
					content: `<m:mstyle mathcolor="${color}"><m:mn>${content}</m:mn></m:mstyle>`
				})

				match = regex.exec(safeMath)
			}
		}

		// Sort segments by start position (reverse order for replacement)
		processedSegments.sort((a, b) => b.start - a.start)

		// Replace color commands with MathML
		for (const segment of processedSegments) {
			safeMath = safeMath.substring(0, segment.start) + segment.content + safeMath.substring(segment.end)
		}

		// Now handle the rest of the math parsing
		// Remove any remaining LaTeX commands that we don't handle
		safeMath = safeMath.replace(/\\?[a-zA-Z]+\{([^}]+)\}/g, "$1")

		// Check if we already have MathML elements
		if (safeMath.includes("<m:mstyle")) {
			// If we have MathML elements, we need to be more careful with parsing
			// Split by segments that are either MathML or plain text
			const segments: string[] = []
			let currentPos = 0

			// Find all MathML elements
			const mathmlRegex = /<m:mstyle[^>]*>.*?<\/m:mstyle>/g
			const mathmlMatches = [...safeMath.matchAll(mathmlRegex)]

			for (const match of mathmlMatches) {
				const matchStart = match.index ?? 0

				// Add text before this MathML element
				if (matchStart > currentPos) {
					const textSegment = safeMath.substring(currentPos, matchStart)
					// Split text by operators and degree symbols
					const parts = textSegment.split(/([+\-=×÷°]|&lt;|&gt;)/).filter((p: string) => p.trim() !== "")
					for (const part of parts) {
						const trimmedPart = part.trim()
						if (["+", "-", "=", "×", "÷", "°"].includes(trimmedPart)) {
							segments.push(`<m:mo>${trimmedPart}</m:mo>`)
						} else if (trimmedPart === "&lt;") {
							segments.push("<m:mo>&lt;</m:mo>")
						} else if (trimmedPart === "&gt;") {
							segments.push("<m:mo>&gt;</m:mo>")
						} else if (trimmedPart) {
							segments.push(`<m:mn>${trimmedPart}</m:mn>`)
						}
					}
				}

				// Add the MathML element as-is
				segments.push(match[0])
				currentPos = matchStart + match[0].length
			}

			// Add any remaining text after the last MathML element
			if (currentPos < safeMath.length) {
				const textSegment = safeMath.substring(currentPos)
				const parts = textSegment.split(/([+\-=×÷°]|&lt;|&gt;)/).filter((p: string) => p.trim() !== "")
				for (const part of parts) {
					const trimmedPart = part.trim()
					if (["+", "-", "=", "×", "÷", "°"].includes(trimmedPart)) {
						segments.push(`<m:mo>${trimmedPart}</m:mo>`)
					} else if (trimmedPart === "&lt;") {
						segments.push("<m:mo>&lt;</m:mo>")
					} else if (trimmedPart === "&gt;") {
						segments.push("<m:mo>&gt;</m:mo>")
					} else if (trimmedPart) {
						segments.push(`<m:mn>${trimmedPart}</m:mn>`)
					}
				}
			}

			return `<m:math>${segments.join("")}</m:math>`
		}
		// No MathML elements, process normally
		const parts = safeMath.split(/([+\-=×÷°]|&lt;|&gt;)/).filter((p: string) => p.trim() !== "")
		const mathParts = parts
			.map((part: string) => {
				const trimmedPart = part.trim()
				if (["+", "-", "=", "×", "÷", "°"].includes(trimmedPart)) {
					return `<m:mo>${trimmedPart}</m:mo>`
				}
				if (trimmedPart === "&lt;") {
					return "<m:mo>&lt;</m:mo>"
				}
				if (trimmedPart === "&gt;") {
					return "<m:mo>&gt;</m:mo>"
				}
				if (trimmedPart) {
					return `<m:mn>${trimmedPart}</m:mn>`
				}
				return ""
			})
			.filter((part) => part !== "")
			.join("")

		return `<m:math>${mathParts}</m:math>`
	})
	return transformed.replace(/\n/g, "<br/>")
}

/**
 * Creates the XML for a single Assessment Item with full widget support.
 */
function createAssessmentItem(parentBuilder: XMLBuilder, question: KhanQuestion, itemIndex: number) {
	const parsedData = question.parsedData
	const questionContent = parsedData.question
	const hints = parsedData.hints || []
	const widgets = questionContent.widgets

	const placeholderRegex = /\[\[☃ (.*?)\]\]/g
	const orderedWidgetIds = [...questionContent.content.matchAll(placeholderRegex)]
		.map((match) => match[1])
		.filter((widgetId): widgetId is string => !!widgetId)

	const itemIdentifier = question.id || `item_${itemIndex + 1}`
	const assessmentItem = parentBuilder.ele("qti-assessment-item", {
		xmlns: "http://www.imsglobal.org/xsd/imsqtiasi_v3p0",
		"xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
		"xsi:schemaLocation":
			"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd",
		"xmlns:m": "http://www.w3.org/1998/Math/MathML",
		identifier: itemIdentifier,
		title: `Question ${itemIndex + 1}`,
		adaptive: "true",
		"time-dependent": "false"
	})

	const interactionDetails: {
		id: string
		widget: PerseusWidget
		responseId: string
		isInteractive: boolean
		needsResponseDeclaration: boolean
		isMathInput?: boolean // Add flag for math input
	}[] = []

	let responseCounter = 0
	for (const widgetId of orderedWidgetIds) {
		const widget = widgets[widgetId]
		if (widget) {
			const isInteractive = ["radio", "numeric-input", "interactive-graph"].includes(widget.type)
			// Only create response declarations for widgets that will have actual interactions in the item body
			const needsResponseDeclaration = [
				"radio",
				"numeric-input",
				"explanation",
				"definition",
				"interactive-graph"
			].includes(widget.type)

			// Check if numeric-input is a math input
			let isMathInput = false
			if (widget.type === "numeric-input") {
				const numericOptions = widget.options as PerseusNumericOptions
				const firstAnswer = numericOptions.answers?.[0]
				if (firstAnswer?.answerForms && firstAnswer.answerForms.length > 0) {
					isMathInput = true
					logger.debug("detected math input widget", {
						widgetId,
						answerForms: firstAnswer.answerForms,
						correctValue: firstAnswer.value
					})
				}
			}

			// Only increment counter for widgets that need response declarations
			if (needsResponseDeclaration) {
				responseCounter++
			}

			interactionDetails.push({
				id: widgetId,
				widget,
				responseId: needsResponseDeclaration ? `RESPONSE_${responseCounter}` : "",
				isInteractive,
				needsResponseDeclaration,
				isMathInput
			})
		}
	}

	// --- 1. Create ALL Response and Outcome Declarations ---
	assessmentItem
		.ele("qti-outcome-declaration", { identifier: "SCORE", cardinality: "single", "base-type": "float" })
		.ele("qti-default-value")
		.ele("qti-value")
		.txt("0")
	assessmentItem.ele("qti-response-declaration", {
		identifier: "HINTREQUEST",
		cardinality: "single",
		"base-type": "boolean"
	})
	assessmentItem
		.ele("qti-outcome-declaration", { identifier: "HINTCOUNT", cardinality: "single", "base-type": "integer" })
		.ele("qti-default-value")
		.ele("qti-value")
		.txt("0")

	// Check if FEEDBACK outcome is needed
	let hasFeedback = false
	for (const detail of interactionDetails) {
		if (detail.widget.type === "radio") {
			const radioOptions = detail.widget.options as PerseusRadioOptions
			if (radioOptions.choices.some((choice) => choice.clue)) {
				hasFeedback = true
				break
			}
		} else if (detail.widget.type === "explanation" || detail.widget.type === "definition") {
			hasFeedback = true
			break
		}
	}

	if (hasFeedback) {
		assessmentItem.ele("qti-outcome-declaration", {
			identifier: "FEEDBACK",
			cardinality: "multiple",
			"base-type": "identifier"
		})
	}

	for (const detail of interactionDetails) {
		// Skip widgets that don't need response declarations (like images)
		if (!detail.needsResponseDeclaration) continue

		let baseType = "boolean" // Default for button-like widgets
		if (detail.isInteractive) {
			if (detail.widget.type === "radio") baseType = "identifier"
			if (detail.widget.type === "numeric-input") {
				// For math inputs, we use string type to handle fraction notation
				baseType = detail.isMathInput ? "string" : "float"
			}
			if (detail.widget.type === "interactive-graph") {
				// For interactive graphs, we need multiple identifiers for hotspots
				baseType = "identifier"
			}
		}
		const responseDecl = assessmentItem.ele("qti-response-declaration", {
			identifier: detail.responseId,
			cardinality: detail.widget.type === "interactive-graph" ? "multiple" : "single",
			"base-type": baseType
		})
		if (detail.isInteractive) {
			let correctValue = ""
			if (detail.widget.type === "radio") {
				correctValue = `choice_${(detail.widget.options as PerseusRadioOptions).choices.findIndex((c) => c.correct)}`
			} else if (detail.widget.type === "numeric-input") {
				const answers = (detail.widget.options as PerseusNumericOptions).answers
				if (detail.isMathInput) {
					// For math inputs, store the decimal value as string for comparison
					correctValue = answers?.[0] ? answers[0].value.toString() : "0"
				} else {
					correctValue = answers?.[0] ? answers[0].value.toString() : "0"
				}
			} else if (detail.widget.type === "interactive-graph") {
				// For interactive graph, we need to set up multiple correct responses
				const graphOptions = detail.widget.options as PerseusInteractiveGraphOptions
				if (graphOptions.correct?.coords) {
					const correctResponse = responseDecl.ele("qti-correct-response")
					graphOptions.correct.coords.forEach((_, idx) => {
						correctResponse.ele("qti-value").txt(`hotspot_${idx}`)
					})
				}
			}
			if (detail.widget.type !== "interactive-graph") {
				responseDecl.ele("qti-correct-response").ele("qti-value").txt(correctValue)
			}
		}
	}

	// --- 2. Create Item Body with Final Logic ---
	const itemBody = assessmentItem.ele("qti-item-body")
	let remainingContent = questionContent.content

	for (const detail of interactionDetails) {
		const placeholder = `[[☃ ${detail.id}]]`
		const placeholderIndex = remainingContent.indexOf(placeholder)
		let textBefore = placeholderIndex > -1 ? remainingContent.substring(0, placeholderIndex) : ""

		// Check for fill-in-the-blank pattern in the raw text before transformation
		const rawTextBefore = textBefore
		// Look for common fill-in-the-blank patterns
		const blankPatterns = [
			/_\\_\\_\\_\\_/, // 4 escaped underscores
			/_____/, // 5 regular underscores
			/___/ // 3 regular underscores
		]

		let isFillInTheBlank = false
		let blankStartIndex = -1
		let blankEndIndex = -1

		// Find if there's a blank pattern and its position
		for (const pattern of blankPatterns) {
			const match = rawTextBefore.match(pattern)
			if (match && match.index !== undefined) {
				isFillInTheBlank = true
				blankStartIndex = match.index
				blankEndIndex = match.index + match[0].length
				break
			}
		}

		// Debug logging
		if (detail.widget.type === "radio" && rawTextBefore.includes("_")) {
			logger.debug("checking for fill-in-the-blank", {
				rawTextEnd: rawTextBefore.slice(-30),
				isFillInTheBlank,
				blankStartIndex,
				widgetId: detail.id
			})
		}

		if (textBefore) {
			if (isFillInTheBlank && blankStartIndex !== -1 && detail.widget.type === "radio") {
				// Split the text at the blank position
				const textBeforeBlank = textBefore.substring(0, blankStartIndex)
				const textAfterBlank = textBefore.substring(blankEndIndex)

				// Add text before the blank - use span for inline display
				if (textBeforeBlank) {
					const wrappedContent = `<span>${transformContent(textBeforeBlank)}</span>`
					itemBody.ele(wrappedContent)
				}

				// Add the inline choice interaction where the blank was
				const InteractionType = "qti-inline-choice-interaction"
				const choiceTag = "qti-inline-choice"
				const interaction = itemBody.ele(InteractionType, {
					"response-identifier": detail.responseId,
					shuffle: "false"
				})
				;(detail.widget.options as PerseusRadioOptions).choices.forEach((choice, choiceIndex) => {
					const choiceNode = interaction.ele(choiceTag, { identifier: `choice_${choiceIndex}` })
					choiceNode.txt(choice.content)
				})

				// Add text after the blank - use span for inline display
				if (textAfterBlank) {
					const wrappedContent = `<span>${transformContent(textAfterBlank)}</span>`
					itemBody.ele(wrappedContent)
				}
			} else {
				// Not fill-in-the-blank, add text normally
				const wrappedContent = `<div>${transformContent(textBefore)}</div>`
				itemBody.ele(wrappedContent)

				// Then add the widget
				switch (detail.widget.type) {
					case "radio": {
						const InteractionType = "qti-choice-interaction"
						const choiceTag = "qti-simple-choice"
						const interaction = itemBody.ele(InteractionType, {
							"response-identifier": detail.responseId,
							shuffle: "false"
						})
						;(detail.widget.options as PerseusRadioOptions).choices.forEach((choice, choiceIndex) => {
							const choiceNode = interaction.ele(choiceTag, { identifier: `choice_${choiceIndex}` })
							const wrappedContent = `<div>${transformContent(choice.content)}</div>`
							choiceNode.ele(wrappedContent)
						})
						break
					}
					case "image": {
						const imageUrl = (detail.widget.options as PerseusImageOptions).backgroundImage?.url
						if (imageUrl) {
							itemBody.ele("figure").ele("img", {
								src: imageUrl,
								alt: (detail.widget.options as PerseusImageOptions).alt || "Question image"
							})
						}
						break
					}
					case "explanation":
					case "definition": {
						const togglePrompt = (detail.widget.options as PerseusDefinitionOptions).togglePrompt
						const showPrompt = (detail.widget.options as PerseusExplanationOptions).showPrompt
						const prompt = togglePrompt || showPrompt || "Info"
						itemBody.ele("qti-show-hide-interaction", { "response-identifier": detail.responseId, title: prompt })
						break
					}
					case "numeric-input": {
						if (detail.isMathInput) {
							// For math input, use qti-math-entry-interaction
							itemBody.ele("qti-math-entry-interaction", {
								"response-identifier": detail.responseId
							})
						} else {
							// For regular numeric input, use text-entry-interaction
							itemBody.ele("qti-text-entry-interaction", {
								"response-identifier": detail.responseId,
								"expected-length": "10"
							})
						}
						break
					}
					case "interactive-graph": {
						const graphOptions = detail.widget.options as PerseusInteractiveGraphOptions
						// Generate a grid image based on the range
						if (graphOptions.range) {
							const [[xMin, xMax], [yMin, yMax]] = graphOptions.range
							const width = 400
							const height = 400

							// Generate the grid SVG or use provided background image
							let gridUrl: string
							if (graphOptions.backgroundImage?.url) {
								gridUrl = graphOptions.backgroundImage.url
							} else {
								gridUrl = generateCoordinateGridSVG(graphOptions.range, width, height, graphOptions.gridStep)
							}

							// Create the graphic interaction with the grid embedded
							const graphicInteraction = itemBody.ele("qti-graphic-interaction", {
								"response-identifier": detail.responseId,
								"layout-width": `${width}px`,
								"layout-height": `${height}px`
							})

							// Add the grid as a qti-object inside the interaction with the actual data URL
							graphicInteraction.ele("qti-object", {
								identifier: "grid",
								href: gridUrl,
								type: "image/svg+xml"
							})

							// Add hotspots for each coordinate
							if (graphOptions.correct?.coords) {
								graphOptions.correct.coords.forEach(([x, y], idx) => {
									// Convert graph coordinates to pixel coordinates
									const xPixel = ((x - xMin) / (xMax - xMin)) * width
									const yPixel = height - ((y - yMin) / (yMax - yMin)) * height // Flip Y axis

									// Create a hotspot around each point (10px radius)
									const coords = `${Math.round(xPixel - 10)},${Math.round(yPixel - 10)},${Math.round(xPixel + 10)},${Math.round(yPixel + 10)}`

									graphicInteraction.ele("qti-hotspot", {
										identifier: `hotspot_${idx}`,
										shape: "rect",
										coords: coords
									})
								})
							}
						}
						break
					}
					default:
						if (detail.isInteractive) {
							itemBody.ele("qti-text-entry-interaction", {
								"response-identifier": detail.responseId,
								"expected-length": "10"
							})
						}
				}
			}
		} else {
			// No text before widget, handle widget normally
			switch (detail.widget.type) {
				case "radio": {
					const InteractionType = isFillInTheBlank ? "qti-inline-choice-interaction" : "qti-choice-interaction"
					const choiceTag = isFillInTheBlank ? "qti-inline-choice" : "qti-simple-choice"
					const interaction = itemBody.ele(InteractionType, {
						"response-identifier": detail.responseId,
						shuffle: "false"
					})
					;(detail.widget.options as PerseusRadioOptions).choices.forEach((choice, choiceIndex) => {
						const choiceNode = interaction.ele(choiceTag, { identifier: `choice_${choiceIndex}` })
						if (isFillInTheBlank) {
							choiceNode.txt(choice.content)
						} else {
							const wrappedContent = `<div>${transformContent(choice.content)}</div>`
							choiceNode.ele(wrappedContent)
						}
					})
					break
				}
				case "image": {
					const imageUrl = (detail.widget.options as PerseusImageOptions).backgroundImage?.url
					if (imageUrl) {
						itemBody.ele("figure").ele("img", {
							src: imageUrl,
							alt: (detail.widget.options as PerseusImageOptions).alt || "Question image"
						})
					}
					break
				}
				case "explanation":
				case "definition": {
					const togglePrompt = (detail.widget.options as PerseusDefinitionOptions).togglePrompt
					const showPrompt = (detail.widget.options as PerseusExplanationOptions).showPrompt
					const prompt = togglePrompt || showPrompt || "Info"
					itemBody.ele("qti-show-hide-interaction", { "response-identifier": detail.responseId, title: prompt })
					break
				}
				case "numeric-input": {
					if (detail.isMathInput) {
						// For math input, use qti-math-entry-interaction
						itemBody.ele("qti-math-entry-interaction", {
							"response-identifier": detail.responseId
						})
					} else {
						// For regular numeric input, use text-entry-interaction
						itemBody.ele("qti-text-entry-interaction", {
							"response-identifier": detail.responseId,
							"expected-length": "10"
						})
					}
					break
				}
				default:
					if (detail.isInteractive) {
						itemBody.ele("qti-text-entry-interaction", {
							"response-identifier": detail.responseId,
							"expected-length": "10"
						})
					}
			}
		}
		remainingContent = remainingContent.substring(placeholderIndex + placeholder.length)
	}
	if (remainingContent.trim()) {
		const wrappedContent = `<div>${transformContent(remainingContent)}</div>`
		itemBody.ele(wrappedContent)
	}
	if (hints.length > 0) {
		itemBody.ele("p").ele("qti-show-hide-interaction", { "response-identifier": "HINTREQUEST", title: "Show Hint" })
	}

	// --- 3. Create Response Processing ---
	const responseProcessing = assessmentItem.ele("qti-response-processing")
	if (hints.length > 0) {
		const hintIf = responseProcessing.ele("qti-response-condition").ele("qti-response-if")
		hintIf.ele("qti-variable", { identifier: "HINTREQUEST" })
		hintIf
			.ele("qti-set-outcome-value", { identifier: "HINTCOUNT" })
			.ele("qti-sum")
			.ele("qti-variable", { identifier: "HINTCOUNT" })
			.up()
			.ele("qti-base-value", { "base-type": "integer" })
			.txt("1")
	}

	for (const detail of interactionDetails) {
		// Skip widgets that don't need response processing (like images)
		if (!detail.needsResponseDeclaration) continue

		if (detail.isInteractive) {
			const scoreIf = responseProcessing.ele("qti-response-condition").ele("qti-response-if")

			if (detail.widget.type === "interactive-graph") {
				// For interactive-graph, we need to check if all required hotspots are selected
				const graphOptions = detail.widget.options as PerseusInteractiveGraphOptions
				if (graphOptions.correct?.coords) {
					// Create an AND condition for all hotspots
					const andCondition = scoreIf.ele("qti-and")
					graphOptions.correct.coords.forEach((_, idx) => {
						andCondition
							.ele("qti-match")
							.ele("qti-variable", { identifier: detail.responseId })
							.up()
							.ele("qti-base-value", { "base-type": "identifier" })
							.txt(`hotspot_${idx}`)
					})
				}
			} else {
				// For other widget types, use the standard match/correct pattern
				scoreIf
					.ele("qti-match")
					.ele("qti-variable", { identifier: detail.responseId })
					.up()
					.ele("qti-correct", { identifier: detail.responseId })
			}

			scoreIf
				.ele("qti-set-outcome-value", { identifier: "SCORE" })
				.ele("qti-sum")
				.ele("qti-variable", { identifier: "SCORE" })
				.up()
				.ele("qti-base-value", { "base-type": "float" })
				.txt("1")
			if (detail.widget.type === "radio") {
				;(detail.widget.options as PerseusRadioOptions).choices.forEach((choice, choiceIndex) => {
					if (choice.clue) {
						const feedbackIf = responseProcessing.ele("qti-response-condition").ele("qti-response-if")
						feedbackIf
							.ele("qti-match")
							.ele("qti-variable", { identifier: detail.responseId })
							.up()
							.ele("qti-base-value", { "base-type": "identifier" })
							.txt(`choice_${choiceIndex}`)
						feedbackIf
							.ele("qti-set-outcome-value", { identifier: "FEEDBACK" })
							.ele("qti-base-value", { "base-type": "identifier" })
							.txt(`${detail.responseId}_choice_${choiceIndex}_feedback`)
					}
				})
			}
		} else {
			const feedbackIf = responseProcessing.ele("qti-response-condition").ele("qti-response-if")
			feedbackIf.ele("qti-variable", { identifier: detail.responseId })
			feedbackIf
				.ele("qti-set-outcome-value", { identifier: "FEEDBACK" })
				.ele("qti-base-value", { "base-type": "identifier" })
				.txt(`${detail.id}_content`)
		}
	}

	// --- 4. Add All Feedback Blocks ---
	for (const detail of interactionDetails) {
		if (detail.widget.type === "radio") {
			;(detail.widget.options as PerseusRadioOptions).choices.forEach((choice, choiceIndex) => {
				if (choice.clue) {
					const feedbackId = `${detail.responseId}_choice_${choiceIndex}_feedback`
					const wrappedContent = `<div>${transformContent(choice.clue)}</div>`
					assessmentItem
						.ele("qti-feedback-inline", {
							identifier: feedbackId,
							"outcome-identifier": "FEEDBACK",
							"show-hide": "show"
						})
						.ele(wrappedContent)
				}
			})
		}
		if (detail.widget.type === "explanation" || detail.widget.type === "definition") {
			const expOptions = detail.widget.options as PerseusExplanationOptions
			const defOptions = detail.widget.options as PerseusDefinitionOptions
			const content = expOptions.explanation || defOptions.definition
			if (content) {
				const wrappedContent = `<div>${transformContent(content)}</div>`
				assessmentItem
					.ele("qti-modal-feedback", {
						identifier: `${detail.id}_content`,
						"outcome-identifier": "FEEDBACK",
						"show-hide": "show"
					})
					.ele(wrappedContent)
			}
		}
	}
	for (const [i, hint] of hints.entries()) {
		const feedback = assessmentItem.ele("qti-modal-feedback", {
			identifier: `HINT_${i + 1}`,
			"outcome-identifier": "HINTCOUNT",
			"show-hide": "show"
		})
		feedback
			.ele("qti-outcome-condition")
			.ele("qti-match")
			.ele("qti-variable", { identifier: "HINTCOUNT" })
			.up()
			.ele("qti-base-value", { "base-type": "integer" })
			.txt((i + 1).toString())
		const wrappedContent = `<div>${transformContent(hint.content, hint.widgets)}</div>`
		feedback.ele(wrappedContent)
	}
}

/**
 * Processes a single exercise/quiz/unitTest and generates QTI XML files.
 * Creates one XML file per question for full QTI 3.0 compliance.
 */
function processExercise(exercise: KhanExercise, outputDir: string) {
	logger.info("processing exercise", {
		exerciseId: exercise.id,
		slug: exercise.slug,
		questionCount: exercise.questions?.length || 0,
		outputDir
	})

	if (!exercise.questions || exercise.questions.length === 0) {
		logger.warn("exercise has no questions, skipping", { exerciseId: exercise.id })
		return
	}

	// Create directory for this exercise
	const exerciseDir = path.join(outputDir, exercise.slug)
	ensureDirectory(exerciseDir)

	let validQuestions = 0

	for (const [index, question] of exercise.questions.entries()) {
		logger.debug("processing question", {
			index,
			questionId: question.id,
			problemType: question.problemType
		})

		// Check if question has required data
		if (!question.parsedData?.question) {
			logger.warn("question missing required data, skipping", { questionId: question.id })
			continue
		}

		// Create individual QTI file for each question
		const root = create({ version: "1.0", encoding: "UTF-8" })
		createAssessmentItem(root, question, validQuestions)

		const xmlString = root.end({ prettyPrint: true })
		const outputPath = path.join(exerciseDir, `question_${validQuestions + 1}.xml`)

		const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, xmlString))
		if (writeResult.error) {
			logger.error("failed to write qti output", { error: writeResult.error, outputPath })
			throw errors.wrap(writeResult.error, "file write")
		}

		validQuestions++
	}

	if (validQuestions === 0) {
		logger.warn("no valid questions found in exercise, skipping file creation", { exerciseId: exercise.id })
		// Remove empty directory
		const rmResult = errors.trySync(() => fs.rmdirSync(exerciseDir))
		if (rmResult.error) {
			logger.debug("failed to remove empty directory", { error: rmResult.error, exerciseDir })
		}
		return
	}

	// Create IMS manifest file for QTI content packaging
	const manifestPath = path.join(exerciseDir, "imsmanifest.xml")

	// Create XML manifest
	const manifestRoot = create({ version: "1.0", encoding: "UTF-8" })
	const manifestElement = manifestRoot.ele("manifest", {
		xmlns: "http://www.imsglobal.org/xsd/imscp_v1p1",
		"xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
		identifier: exercise.slug,
		version: "1.0"
	})

	const resources = manifestElement.ele("resources")

	// Add each question as a resource
	for (let i = 0; i < validQuestions; i++) {
		const resourceId = `item${i + 1}`
		const fileName = `question_${i + 1}.xml`

		const resource = resources.ele("resource", {
			identifier: resourceId,
			type: "imsqti_xmlv3p0_item",
			href: fileName
		})
		resource.ele("file", { href: fileName })
	}

	const manifestXml = manifestRoot.end({ prettyPrint: true })

	const manifestResult = errors.trySync(() => fs.writeFileSync(manifestPath, manifestXml))
	if (manifestResult.error) {
		logger.error("failed to write ims manifest", { error: manifestResult.error, manifestPath })
	}

	logger.info("successfully generated qti files", {
		exerciseDir,
		questionsProcessed: validQuestions,
		totalQuestions: exercise.questions.length,
		manifestFile: "imsmanifest.xml"
	})
}

/**
 * Ensures a directory exists, creating it if necessary.
 */
function ensureDirectory(dirPath: string) {
	const mkdirResult = errors.trySync(() => fs.mkdirSync(dirPath, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create directory", { error: mkdirResult.error, dirPath })
		throw errors.wrap(mkdirResult.error, "directory creation")
	}
}

/**
 * Sanitizes a filename by removing/replacing invalid characters.
 */
function sanitizeFilename(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\-_]/g, "-") // Replace non-alphanumeric with hyphens
		.replace(/-+/g, "-") // Replace multiple hyphens with single
		.replace(/^-|-$/g, "") // Remove leading/trailing hyphens
}

/**
 * Main function to process the entire Khan Academy course.
 */
async function main() {
	const inputFilePath = path.join(process.cwd(), "src/data/ela-4th-grade-reading-and-vocab.json")
	const outputBaseDir = path.join(process.cwd(), "qti-output")

	// Read and parse the course JSON
	const readResult = errors.trySync(() => fs.readFileSync(inputFilePath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read course file", { error: readResult.error, inputFilePath })
		throw errors.wrap(readResult.error, "file read")
	}

	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse course json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "json parse")
	}

	const course = parseResult.data as KhanCourse
	logger.info("starting khan to qti conversion", {
		courseId: course.id,
		courseTitle: course.title,
		unitCount: course.units?.length || 0
	})

	// Create base output directory
	const courseDir = path.join(outputBaseDir, sanitizeFilename(course.title))
	ensureDirectory(courseDir)

	let totalExercisesProcessed = 0
	let totalQuestionsProcessed = 0

	// Process each unit
	for (const unit of course.units) {
		logger.info("processing unit", {
			unitId: unit.id,
			unitTitle: unit.title,
			lessonCount: unit.lessons?.length || 0
		})

		const unitDir = path.join(courseDir, sanitizeFilename(unit.title))
		ensureDirectory(unitDir)

		// Process lessons within the unit
		for (const lesson of unit.lessons) {
			logger.debug("processing lesson", {
				lessonId: lesson.id,
				lessonTitle: lesson.title,
				exerciseCount: lesson.exercises?.length || 0,
				quizCount: lesson.quizzes?.length || 0
			})

			// Process exercises
			if (lesson.exercises) {
				for (const exercise of lesson.exercises) {
					processExercise(exercise, unitDir)

					// Check if directory was actually created
					const dirExistsResult = errors.trySync(() => fs.existsSync(path.join(unitDir, exercise.slug)))
					if (!dirExistsResult.error && dirExistsResult.data) {
						totalExercisesProcessed++
						// Count all valid questions
						const validQuestions = exercise.questions?.filter((q) => q.parsedData?.question).length || 0
						totalQuestionsProcessed += validQuestions
					}
				}
			}

			// Process quizzes (if any)
			if (lesson.quizzes) {
				for (const quiz of lesson.quizzes) {
					processExercise(quiz, unitDir)

					// Check if directory was actually created
					const dirExistsResult = errors.trySync(() => fs.existsSync(path.join(unitDir, quiz.slug)))
					if (!dirExistsResult.error && dirExistsResult.data) {
						totalExercisesProcessed++
						// Count all valid questions
						const validQuestions = quiz.questions?.filter((q) => q.parsedData?.question).length || 0
						totalQuestionsProcessed += validQuestions
					}
				}
			}
		}

		// Process unit test (if any)
		if (unit.unitTest) {
			const unitTest = unit.unitTest
			const unitTestDir = path.join(courseDir, "unit-tests")
			ensureDirectory(unitTestDir)
			processExercise(unitTest, unitTestDir)

			// Check if directory was actually created
			const dirExistsResult = errors.trySync(() => fs.existsSync(path.join(unitTestDir, unitTest.slug)))
			if (!dirExistsResult.error && dirExistsResult.data) {
				totalExercisesProcessed++
				// Count all valid questions
				const validQuestions = unitTest.questions?.filter((q) => q.parsedData?.question).length || 0
				totalQuestionsProcessed += validQuestions
			}
		}
	}

	logger.info("khan to qti conversion complete", {
		courseTitle: course.title,
		outputDirectory: courseDir,
		totalExercisesProcessed,
		totalQuestionsProcessed,
		unitsProcessed: course.units?.length || 0
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("conversion failed", { error: result.error })
	process.exit(1)
}
