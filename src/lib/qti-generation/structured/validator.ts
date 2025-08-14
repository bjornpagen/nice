import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import {
	checkNoLatex,
	checkNoMfencedElements,
	checkNoPerseusArtifacts,
	sanitizeHtmlEntities,
	sanitizeMathMLOperators
} from "@/lib/qti-validation/utils"
import type { AssessmentItemInput, BlockContent, InlineContent } from "../schemas"

// NEW: Recursive walker function for inline content
function processInlineContent(items: InlineContent | null, logger: logger.Logger): void {
	if (!items) return
	for (const item of items) {
		if (item.type === "text") {
			// MODIFIED: Add a type check to prevent crashes on undefined.
			if (typeof item.content === "string") {
				let sanitized = sanitizeHtmlEntities(item.content)
				checkNoLatex(sanitized, logger)
				checkNoPerseusArtifacts(sanitized, logger)
				item.content = sanitized
			} else {
				// This should not happen with the new strict schema, but we log it as a safeguard.
				logger.warn("sanitizer skipping text item with missing or invalid 'content' field")
			}
		} else if (item.type === "math") {
			// MODIFIED: Add a type check to prevent crashes on undefined.
			if (typeof item.mathml === "string") {
				let sanitized = sanitizeMathMLOperators(item.mathml)
				checkNoMfencedElements(sanitized, logger)
				item.mathml = sanitized
			} else {
				// This should not happen with the new strict schema, but we log it as a safeguard.
				logger.warn("sanitizer skipping math item with missing or invalid 'mathml' field")
			}
		}
	}
}

// NEW: Recursive walker function for block content
function processBlockContent(items: BlockContent | null, logger: logger.Logger): void {
	if (!items) return
	for (const item of items) {
		if (item.type === "paragraph") {
			processInlineContent(item.content, logger)
		}
	}
}

export function validateAndSanitizeHtmlFields(item: AssessmentItemInput, logger: logger.Logger): AssessmentItemInput {
	// Deep clone the object to avoid mutating the original
	// Using JSON parse/stringify for deep cloning
	const clonedData = JSON.parse(JSON.stringify(item))
	// Validate the cloned data has the expected shape
	const sanitizedItem: AssessmentItemInput = clonedData

	// Apply processing to all structured content fields
	processBlockContent(sanitizedItem.body, logger)
	processBlockContent(sanitizedItem.feedback.correct, logger)
	processBlockContent(sanitizedItem.feedback.incorrect, logger)

	if (sanitizedItem.interactions) {
		for (const key in sanitizedItem.interactions) {
			const interaction = sanitizedItem.interactions[key]
			if (!interaction) continue

			if ("prompt" in interaction && interaction.prompt) {
				processInlineContent(interaction.prompt, logger)
			}
			if ("choices" in interaction && interaction.choices) {
				// Runtime validation for minimum number of choices
				if (interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") {
					if (interaction.choices.length < 2) {
						logger.error("interaction has insufficient choices", {
							interactionType: interaction.type,
							choiceCount: interaction.choices.length
						})
						throw errors.new(
							`${interaction.type} must have at least 2 choices, but only ${interaction.choices.length} found`
						)
					}
				}

				// Type narrowing based on interaction type
				if (interaction.type === "inlineChoiceInteraction") {
					// Now TypeScript knows this is an inlineChoiceInteraction
					for (const choice of interaction.choices) {
						processInlineContent(choice.content, logger)
					}
				} else if (interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") {
					// Now TypeScript knows this is a choice/order interaction
					for (const choice of interaction.choices) {
						processBlockContent(choice.content, logger)
						if (choice.feedback) {
							processInlineContent(choice.feedback, logger)
						}
					}
				}
			}
		}
	}

	return sanitizedItem
}
