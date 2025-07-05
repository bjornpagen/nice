import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { create } from "xmlbuilder2"
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces"

// --- TYPE DEFINITIONS for Perseus JSON (Your definitions are kept) ---
interface PerseusItem {
	id: string
	parsedData: {
		question: {
			content: string
			widgets: { [key: string]: PerseusWidget }
		}
		hints: PerseusHint[]
		answerArea?: object
	}
}

interface PerseusHint {
	content: string
	images?: { [key: string]: { height: number; width: number } }
	replace: boolean
	widgets: { [key: string]: PerseusWidget }
}

interface PerseusWidget {
	type: "radio" | "numeric-input" | string
	options: PerseusRadioOptions | PerseusNumericOptions
}

interface PerseusRadioOptions {
	choices: { content: string; correct: boolean; isNoneOfTheAbove?: boolean }[]
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
	}[]
	coefficient: boolean
	labelText: string
	multipleNumberInput: boolean
	rightAlign: boolean
	size: string
	static: boolean
}

interface PerseusQuestionWrapper {
	item?: {
		id: string
		itemData?: string
		sha?: string
		problemType?: string
	}
	parsedData?: {
		question: {
			content: string
			widgets: { [key: string]: PerseusWidget }
		}
		hints: PerseusHint[]
		answerArea?: object
	}
}

interface PerseusData {
	exercise?: {
		id: string
		slug?: string
		topicId?: string
		unitId?: string
		courseId?: string
	}
	questions: PerseusQuestionWrapper[]
}

/**
 * Enhanced transformer for Perseus content.
 */
function transformContent(content: string): string {
	if (!content) return ""
	let transformed = content
	transformed = transformed.replace(/web\+graphie:\/\//g, "https://")
	transformed = transformed.replace(
		/!\[.*?\]\((.*?)\)/g,
		(_match, url: string) => `<img src="${url}" alt="A number line diagram"/>`
	)
	transformed = transformed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
	transformed = transformed.replace(/\$((?:\\?[a-zA-Z]+\{[^}]+\}|[^$])+)\$/g, (_match, mathContent: string) => {
		const cleaned = mathContent
			.replace(/\\?[a-zA-Z]+\{([^}]+)\}/g, "$1")
			.replace(/[{}]/g, "")
			.trim()
		const parts = cleaned.split(/([+\-=])/).filter((p: string) => p.trim() !== "")
		const mathParts = parts
			.map((part: string) => {
				const trimmedPart = part.trim()
				return ["+", "-", "="].includes(trimmedPart) ? `<mo>${trimmedPart}</mo>` : `<mn>${trimmedPart}</mn>`
			})
			.join("")
		return `<m:math>${mathParts}</m:math>`
	})
	return transformed.replace(/\n/g, "<br/>")
}

/**
 * Creates the XML for a single Assessment Item with all corrections.
 */
function createAssessmentItem(parentBuilder: XMLBuilder, itemData: PerseusItem, itemIndex: number) {
	const question = itemData.parsedData.question
	const hints = itemData.parsedData.hints || []
	const widgets = question.widgets

	const placeholderRegex = /\[\[☃ (.*?)\]\]/g
	const orderedWidgetIds = [...question.content.matchAll(placeholderRegex)]
		.map((match) => match[1])
		.filter((widgetId): widgetId is string => !!widgetId)

	const itemIdentifier = itemData.id || `item_${itemIndex + 1}`
	const assessmentItem = parentBuilder.ele("qti-assessment-item", {
		xmlns: "http://www.imsglobal.org/xsd/imsqtiasi_v3p0",
		"xmlns:m": "http://www.w3.org/1998/Math/MathML",
		identifier: itemIdentifier,
		title: `Question ${itemIndex + 1}`,
		adaptive: hints.length > 0 ? "true" : "false",
		"time-dependent": "false"
	})

	const interactionDetails = orderedWidgetIds
		.map((widgetId, i) => {
			const widget = widgets[widgetId]
			if (!widget) {
				logger.warn("widget not found", { widgetId, itemIndex })
				return null
			}
			return {
				id: widgetId,
				widget: widget,
				responseId: `RESPONSE_${i + 1}`
			}
		})
		.filter((detail): detail is { id: string; widget: PerseusWidget; responseId: string } => detail !== null)

	// --- 1. Create Response Declarations ---
	for (const { widget, responseId } of interactionDetails) {
		let baseType = "string"
		let correctValue = ""
		if (widget.type === "radio") {
			baseType = "identifier"
			const correctChoiceIndex = (widget.options as PerseusRadioOptions).choices.findIndex((c) => c.correct)
			correctValue = `choice_${correctChoiceIndex}`
		} else if (widget.type === "numeric-input") {
			baseType = "integer"
			const answers = (widget.options as PerseusNumericOptions).answers
			correctValue = answers?.[0] ? answers[0].value.toString() : "0"
		}
		assessmentItem
			.ele("qti-response-declaration", { identifier: responseId, cardinality: "single", baseType })
			.ele("qti-correct-response")
			.ele("qti-value")
			.txt(correctValue)
	}

	// --- 2. Create Outcome Declarations ---
	assessmentItem
		.ele("qti-outcome-declaration", { identifier: "SCORE", cardinality: "single", baseType: "float" })
		.ele("qti-default-value")
		.ele("qti-value")
		.txt("0")

	if (hints.length > 0) {
		assessmentItem.ele("qti-response-declaration", {
			identifier: "HINTREQUEST",
			cardinality: "single",
			baseType: "boolean"
		})
		assessmentItem
			.ele("qti-outcome-declaration", { identifier: "HINTCOUNT", cardinality: "single", baseType: "integer" })
			.ele("qti-default-value")
			.ele("qti-value")
			.txt("0")
	}

	// --- 3. Create Item Body (Corrected Logic) ---
	const itemBody = assessmentItem.ele("qti-item-body")
	const contentParts = question.content.split(/(\[\[☃ .*?\]\])/g)

	for (let i = 0; i < contentParts.length; i++) {
		const part = contentParts[i]
		if (!part) continue

		if (/\[\[☃ .*?\]\]/.test(part)) {
			const widgetId = part.match(/\[\[☃ (.*?)\]\]/)?.[1]
			const detail = interactionDetails.find((d) => d.id === widgetId)

			if (!detail) {
				logger.warn("no detail found for widget", { widgetId, part })
				continue
			}

			const { widget, responseId } = detail
			// The prompt is the text that came before this placeholder.
			const promptText = i > 0 && contentParts[i - 1] ? contentParts[i - 1] : ""

			if (widget.type === "radio") {
				const interaction = itemBody.ele("qti-choice-interaction", {
					responseIdentifier: responseId,
					shuffle: "false",
					maxChoices: "1"
				})
				if (promptText) {
					// Wrap content in a div and parse as XML to prevent double-encoding
					const wrappedContent = `<div>${transformContent(promptText)}</div>`
					interaction.ele("qti-prompt").ele(wrappedContent)
				}
				;(widget.options as PerseusRadioOptions).choices.forEach((choice, choiceIndex) => {
					const simpleChoice = interaction.ele("qti-simple-choice", { identifier: `choice_${choiceIndex}` })
					// Wrap content in a div and parse as XML to prevent double-encoding
					const wrappedContent = `<div>${transformContent(choice.content)}</div>`
					simpleChoice.ele(wrappedContent)
				})
			} else if (widget.type === "numeric-input") {
				if (promptText) {
					// Wrap content in a div and parse as XML to prevent double-encoding
					const wrappedContent = `<div>${transformContent(promptText)}</div>`
					itemBody.ele(wrappedContent) // Place prompt text before the input
				}
				itemBody.ele("qti-text-entry-interaction", { responseIdentifier: responseId, expectedLength: "10" })
			}
		} else if (i + 1 >= contentParts.length || !/\[\[☃ .*?\]\]/.test(contentParts[i + 1] || "")) {
			// This is general text, not a prompt for an upcoming interaction.
			if (part.trim()) {
				// Wrap content and parse as XML to prevent double-encoding
				const wrappedContent = `<div>${transformContent(part)}</div>`
				itemBody.ele(wrappedContent)
			}
		}
	}

	if (hints.length > 0) {
		itemBody.ele("p").ele("qti-end-attempt-interaction", { responseIdentifier: "HINTREQUEST", title: "Show Hint" })
	}

	// --- 4. Create Response Processing ---
	const responseProcessing = assessmentItem.ele("qti-response-processing")
	if (hints.length > 0) {
		const hintIf = responseProcessing.ele("qti-response-condition").ele("qti-response-if")
		hintIf.ele("qti-variable", { identifier: "HINTREQUEST" })
		const setHintCount = hintIf.ele("qti-set-outcome-value", { identifier: "HINTCOUNT" })
		setHintCount
			.ele("qti-sum")
			.ele("qti-variable", { identifier: "HINTCOUNT" })
			.up()
			.ele("qti-base-value", { baseType: "integer" })
			.txt("1")
	}
	for (const { responseId } of interactionDetails) {
		const responseIf = responseProcessing.ele("qti-response-condition").ele("qti-response-if")
		responseIf
			.ele("qti-match")
			.ele("qti-variable", { identifier: responseId })
			.up()
			.ele("qti-correct", { identifier: responseId })
		const setOutcome = responseIf.ele("qti-set-outcome-value", { identifier: "SCORE" })
		setOutcome
			.ele("qti-sum")
			.ele("qti-variable", { identifier: "SCORE" })
			.up()
			.ele("qti-base-value", { baseType: "float" })
			.txt("1")
	}

	// --- 5. Add Hint Content as Modal Feedback ---
	for (const [i, hint] of hints.entries()) {
		const feedback = assessmentItem.ele("qti-modal-feedback", {
			identifier: `HINT_${i + 1}`,
			outcomeIdentifier: "HINTCOUNT",
			showHide: "show"
		})
		const outcomeCondition = feedback.ele("qti-outcome-condition")
		outcomeCondition
			.ele("qti-match")
			.ele("qti-variable", { identifier: "HINTCOUNT" })
			.up()
			.ele("qti-base-value", { baseType: "integer" })
			.txt((i + 1).toString())
		// Wrap content and parse as XML to prevent double-encoding
		const wrappedHintContent = `<div>${transformContent(hint.content)}</div>`
		feedback.ele(wrappedHintContent)
	}
}

// --- Main Execution (Unchanged from your file) ---
async function main() {
	const inputFilePath = path.join(
		process.cwd(),
		"src/data/adding-and-subtracting-on-the-number-line-word-problems.json"
	)
	const outputFilePath = path.join(process.cwd(), "src/data/qti-ultimate-output.xml")
	const readResult = errors.trySync(() => fs.readFileSync(inputFilePath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read perseus file", { error: readResult.error, inputFilePath })
		throw errors.wrap(readResult.error, "file read")
	}
	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse perseus json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "json parse")
	}
	const perseusData = parseResult.data as PerseusData
	logger.info("starting perseus to qti ultimate conversion", {
		questionCount: perseusData.questions?.length || 0,
		exerciseId: perseusData.exercise?.id,
		exerciseSlug: perseusData.exercise?.slug
	})
	const root = create({ version: "1.0", encoding: "UTF-8" }).ele("qti-assessment-items")
	for (const [index, questionWrapper] of perseusData.questions.entries()) {
		logger.debug("processing question", {
			index,
			itemId: questionWrapper.item?.id,
			hasItemData: !!questionWrapper.item?.itemData,
			hasParsedData: !!questionWrapper.parsedData
		})
		let parsedData: PerseusItem["parsedData"]
		if (questionWrapper.parsedData) {
			parsedData = questionWrapper.parsedData
		} else if (questionWrapper.item?.itemData) {
			const { itemData } = questionWrapper.item
			const itemDataParseResult = errors.trySync(() => JSON.parse(itemData))
			if (itemDataParseResult.error) {
				logger.error("failed to parse itemData", { error: itemDataParseResult.error, index })
				throw errors.wrap(itemDataParseResult.error, "itemData parse")
			}
			parsedData = itemDataParseResult.data
		} else {
			throw errors.new(`question at index ${index} missing both parsedData and itemData`)
		}
		const item: PerseusItem = { id: questionWrapper.item?.id || `question_${index + 1}`, parsedData: parsedData }
		logger.debug("creating assessment item", {
			itemId: item.id,
			hintCount: parsedData.hints?.length || 0,
			widgetCount: Object.keys(parsedData.question.widgets).length
		})
		createAssessmentItem(root, item, index)
	}
	const xmlString = root.end({ prettyPrint: true })
	const writeResult = errors.trySync(() => fs.writeFileSync(outputFilePath, xmlString))
	if (writeResult.error) {
		logger.error("failed to write qti output", { error: writeResult.error, outputFilePath })
		throw errors.wrap(writeResult.error, "file write")
	}
	logger.info("successfully converted to qti ultimate v3", {
		outputPath: outputFilePath,
		questionCount: perseusData.questions?.length || 0,
		featuresEnabled: { enhancedMathML: true, hintSupport: true, preservedWidgetOrder: true, adaptiveAssessment: true }
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("conversion failed", { error: result.error })
	process.exit(1)
}
