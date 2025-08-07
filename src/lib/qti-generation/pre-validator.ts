import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { checkNoLatex, checkNoMfencedElements, checkNoPerseusArtifacts } from "@/lib/qti-validation/utils"
import type { AssessmentItemInput } from "./schemas"

/**
 * A set of base validations that apply to ALL hypermedia content.
 * Throws an error if any validation fails.
 */
function validateBaseContent(html: string, context: string, logger: logger.Logger): void {
	checkNoLatex(html, logger)
	checkNoMfencedElements(html, logger)
	checkNoPerseusArtifacts(html, logger)

	// Validate that all <img> tags have a required 'alt' attribute.
	const imgTagRegex = /<img(?<attributes>[^>]+)>/g
	const matches = Array.from(html.matchAll(imgTagRegex))

	for (const match of matches) {
		const attributes = match.groups?.attributes ?? ""
		if (!/\balt\s*=\s*["']/.test(attributes)) {
			throw errors.new(
				`QTI Validation Error in ${context}: <img> tag is missing required 'alt' attribute. Full tag: ${match[0]}`
			)
		}
	}
}

/**
 * Validates content that must adhere to a block-level model (e.g., qti-item-body).
 * Ensures content is not raw text and is wrapped in appropriate block tags.
 * Throws an error if validation fails.
 */
function validateBlockContent(html: string, context: string, logger: logger.Logger): void {
	validateBaseContent(html, context, logger)
	const trimmed = html.trim()

	// Allow standalone math elements as they can act as block-level elements in QTI
	if (trimmed?.startsWith("<math")) {
		return
	}

	if (trimmed && !trimmed.startsWith("<")) {
		throw errors.new(
			`QTI Validation Error in ${context}: Content must be wrapped in block-level elements (e.g., <p>, <div>). Raw text is not permitted.`
		)
	}

	// Widget placement validation removed - no longer checking text entry interaction placement
}

/**
 * Validates content that can contain text with inline elements including math (e.g., qti-prompt).
 * Throws an error if any block-level elements are detected, but allows inline math.
 */
function validateMixedContent(html: string, context: string, logger: logger.Logger): void {
	validateBaseContent(html, context, logger)
	// Check for block-level elements that aren't allowed
	const blockTagRegex = /<(\/)?(p|div|table|ul|ol|blockquote|pre|h[1-6]|hr)\b/g
	const match = html.match(blockTagRegex)
	if (match) {
		throw errors.new(
			`QTI Validation Error in ${context}: Block-level element '${match[0]}' is not allowed in mixed inline contexts. Only inline elements and text are permitted.`
		)
	}
}

/**
 * Validates content that must adhere to an inline-only model (e.g., choice content in inline contexts).
 * Throws an error if any block-level elements or math elements are detected.
 */
function validateInlineContent(html: string, context: string, logger: logger.Logger): void {
	validateBaseContent(html, context, logger)

	// Check for block-level elements
	const blockTagRegex = /<(\/)?(p|div|table|ul|ol|blockquote|pre|h[1-6]|hr)\b/g
	const blockMatch = html.match(blockTagRegex)
	if (blockMatch) {
		throw errors.new(
			`QTI Validation Error in ${context}: Block-level element '${blockMatch[0]}' is not allowed in an inline context. Only inline elements like <span>, <em>, or <a> are permitted.`
		)
	}

	// Check for math elements in inline contexts - these are strictly forbidden
	// Math elements can only appear in block contexts according to QTI 3.0 content model
	const mathTagRegex = /<math\b[^>]*(?:\/>|>[\s\S]*?<\/math>)/gi
	const mathMatches = Array.from(html.matchAll(mathTagRegex))
	if (mathMatches.length > 0) {
		const firstMatch = mathMatches[0]
		if (firstMatch) {
			const mathTag = firstMatch[0]
			throw errors.new(
				`QTI Validation Error in ${context}: <math> elements are not allowed in inline contexts. Math content must be placed in block-level contexts (inside <p> or <div> elements). Found: ${mathTag.substring(0, 100)}${mathTag.length > 100 ? "..." : ""}`
			)
		}
	}

	// Check for nested div elements which are block-level and forbidden in inline contexts
	const divTagRegex = /<div\b[^>]*(?:\/>|>[\s\S]*?<\/div>)/gi
	const divMatches = Array.from(html.matchAll(divTagRegex))
	if (divMatches.length > 0) {
		const firstDivMatch = divMatches[0]
		if (firstDivMatch) {
			const divTag = firstDivMatch[0]
			throw errors.new(
				`QTI Validation Error in ${context}: <div> elements are block-level and not allowed in inline contexts. Found: ${divTag.substring(0, 100)}${divTag.length > 100 ? "..." : ""}`
			)
		}
	}

	// Check for any QTI interaction elements in inline contexts - these should be in block contexts
	const qtiInteractionRegex =
		/<qti-(choice|order|text-entry|inline-choice)-interaction\b[^>]*(?:\/>|>[\s\S]*?<\/qti-\w+-interaction>)/gi
	const interactionMatches = Array.from(html.matchAll(qtiInteractionRegex))
	for (const match of interactionMatches) {
		const interactionType = match[1]
		// Only inline-choice-interaction is allowed in inline contexts
		if (interactionType !== "inline-choice") {
			throw errors.new(
				`QTI Validation Error in ${context}: <qti-${interactionType}-interaction> elements are not allowed in inline contexts. Only <qti-inline-choice-interaction> is permitted in inline contexts.`
			)
		}
	}
}

/**
 * The main entry point for pre-validation.
 * Traverses the entire AssessmentItemInput and applies the correct validation rules.
 * Throws immediately if any validation fails.
 */
export function validateAssessmentItemInput(item: AssessmentItemInput, logger: logger.Logger): void {
	// Only validate body if it's provided (not null)
	if (item.body !== null) {
		validateBlockContent(item.body, "item.body", logger)
	}
	validateBlockContent(item.feedback.correct, "item.feedback.correct", logger)
	validateBlockContent(item.feedback.incorrect, "item.feedback.incorrect", logger)

	if (item.interactions) {
		for (const [key, interaction] of Object.entries(item.interactions)) {
			if ("prompt" in interaction && interaction.prompt !== undefined && interaction.prompt !== null) {
				validateMixedContent(interaction.prompt, `interaction[${key}].prompt`, logger)
			}
			if ("choices" in interaction && interaction.choices) {
				for (const choice of interaction.choices) {
					// For inline choice interactions, content can be raw text
					// For other interactions, content must be wrapped in block elements
					if (interaction.type === "inlineChoiceInteraction") {
						// Inline choices appear in dropdowns and cannot have complex formatting like math or block elements
						validateInlineContent(choice.content, `interaction[${key}].choices[${choice.identifier}].content`, logger)
					} else {
						// Regular choices must have block-level content
						validateBlockContent(choice.content, `interaction[${key}].choices[${choice.identifier}].content`, logger)
					}
					if ("feedback" in choice && choice.feedback) {
						// Feedback is rendered as block content, not inline
						validateBlockContent(choice.feedback, `interaction[${key}].choices[${choice.identifier}].feedback`, logger)
					}
				}
			}
		}
	}
}
