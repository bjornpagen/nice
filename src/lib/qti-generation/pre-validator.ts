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

	// Widget placement validation removed - no longer checking text entry interaction placement
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
