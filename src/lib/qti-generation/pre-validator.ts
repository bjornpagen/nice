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
	if (trimmed && !trimmed.startsWith("<")) {
		throw errors.new(
			`QTI Validation Error in ${context}: Content must be wrapped in block-level elements (e.g., <p>, <div>). Raw text is not permitted.`
		)
	}

	// Check for text entry interactions floating outside inline contexts
	validateTextEntryInteractionPlacement(html, context)
}

/**
 * Validates that text entry interactions are properly placed within inline contexts.
 * Text entry interactions are inline elements and must be inside text containers like <p> or <span>.
 */
function validateTextEntryInteractionPlacement(html: string, context: string): void {
	// Find all text entry and inline choice interaction slot tags
	const textEntrySlotRegex = /<slot\s+name="[^"]*(?:text_entry|inline_choice)[^"]*"[^>]*\/?>(?:<\/slot>)?/g
	const slots = Array.from(html.matchAll(textEntrySlotRegex))

	for (const slot of slots) {
		const slotTag = slot[0]
		const slotIndex = slot.index
		if (slotIndex === undefined) continue

		const beforeSlot = html.substring(0, slotIndex)
		const afterSlot = html.substring(slotIndex + slotTag.length)

		// Check if the slot is floating adjacent to closing tags or math elements
		// Pattern: </any-tag>slot, <math>slot, slot</any-tag>, slot<math>
		const beforeEndsWithTag = /<\/[^>]+>\s*$/.test(beforeSlot)
		const beforeEndsWithMath = /<math[^>]*>[^<]*<\/math>\s*$/.test(beforeSlot) || /<\/math>\s*$/.test(beforeSlot)
		const afterStartsWithTag = /^\s*<[^>/]+/.test(afterSlot)
		const beforeStartsWithMath = /<math\b[^>]*>\s*$/.test(beforeSlot)

		// Also check if it's at the very start/end without proper wrapping
		const isAtStart = beforeSlot.trim() === ""

		// Check if it's directly adjacent to block-level elements or math elements without being wrapped
		if (beforeEndsWithTag || beforeEndsWithMath || beforeStartsWithMath || (isAtStart && afterStartsWithTag)) {
			// Now check if it's NOT inside an inline container
			// Look backwards to see if we're inside a <p>, <span>, etc. that hasn't been closed
			const openInlineContainers = /(?:<(p|span|em|strong|a|code)\b[^>]*>(?![^<]*<\/\1>))/g
			const openContainers = Array.from(beforeSlot.matchAll(openInlineContainers))

			// Check if any open containers are still unclosed
			let hasOpenInlineContainer = false
			for (const container of openContainers) {
				const tagName = container[1]
				const containerIndex = container.index
				if (containerIndex === undefined) continue

				const afterContainer = beforeSlot.substring(containerIndex + container[0].length)
				const closeTagRegex = new RegExp(`<\\/${tagName}>`)
				if (!closeTagRegex.test(afterContainer)) {
					hasOpenInlineContainer = true
					break
				}
			}

			if (!hasOpenInlineContainer) {
				throw errors.new(
					`QTI Validation Error in ${context}: Text entry interaction slot '${slotTag}' is floating outside an inline context. Text entry interactions are inline elements and must be placed inside text containers like <p> or <span>.`
				)
			}
		}
	}
}

/**
 * Validates content that must adhere to an inline-only model (e.g., qti-prompt).
 * Throws an error if any block-level elements are detected.
 */
function validateInlineContent(html: string, context: string, logger: logger.Logger): void {
	validateBaseContent(html, context, logger)
	const blockTagRegex = /<(\/)?(p|div|table|ul|ol|blockquote|pre|h[1-6]|hr)\b/g
	const match = html.match(blockTagRegex)
	if (match) {
		throw errors.new(
			`QTI Validation Error in ${context}: Block-level element '${match[0]}' is not allowed in an inline context. Only inline elements like <span>, <em>, or <a> are permitted.`
		)
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
				validateInlineContent(interaction.prompt, `interaction[${key}].prompt`, logger)
			}
			if ("choices" in interaction && interaction.choices) {
				for (const choice of interaction.choices) {
					// For inline choice interactions, content can be raw text
					// For other interactions, content must be wrapped in block elements
					if (interaction.type === "inlineChoiceInteraction") {
						// Inline choices can have raw text content - just validate base content
						validateBaseContent(choice.content, `interaction[${key}].choices[${choice.identifier}].content`, logger)
						// BUT they cannot have block elements like <p>
						validateInlineContent(choice.content, `interaction[${key}].choices[${choice.identifier}].content`, logger)
					} else {
						// Regular choices must have block-level content
						validateBlockContent(choice.content, `interaction[${key}].choices[${choice.identifier}].content`, logger)
					}
					if ("feedback" in choice && choice.feedback) {
						validateInlineContent(choice.feedback, `interaction[${key}].choices[${choice.identifier}].feedback`, logger)
					}
				}
			}
		}
	}
}
