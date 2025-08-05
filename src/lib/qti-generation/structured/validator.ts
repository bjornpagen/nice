import type * as logger from "@superbuilders/slog"
import {
	checkNoLatex,
	// ADD: Import the new validation check functions.
	checkNoMfencedElements,
	checkNoPerseusArtifacts,
	sanitizeHtmlEntities,
	sanitizeMathMLOperators
} from "@/lib/qti-validation/utils"
import type { AnyInteraction, AssessmentItemInput } from "../schemas"

/**
 * Validates and sanitizes all user-facing HTML content within a structured AssessmentItemInput object.
 * This function is designed to be called immediately after parsing the LLM output.
 * It throws an error if any validation fails, ensuring a fail-fast mechanism.
 *
 * @param item The parsed AssessmentItemInput object.
 * @param logger The logger instance.
 * @returns A new AssessmentItemInput object with all HTML fields sanitized.
 */
export function validateAndSanitizeHtmlFields(item: AssessmentItemInput, logger: logger.Logger): AssessmentItemInput {
	// Deep clone the object to avoid mutating the original
	const sanitizedItem = JSON.parse(JSON.stringify(item))

	// MODIFIED: This function no longer needs to build a separate array of fields.
	// We will process the fields directly on the cloned object.

	// Process each field
	const processString = (html: string): string => {
		// 1. Sanitize
		let sanitizedHtml = sanitizeHtmlEntities(html)
		sanitizedHtml = sanitizeMathMLOperators(sanitizedHtml)

		// 2. Validate
		checkNoLatex(sanitizedHtml, logger)
		// ADD: Add calls to the new validation checks.
		// These will throw an error and fail the job if the checks do not pass.
		checkNoPerseusArtifacts(sanitizedHtml, logger)
		checkNoMfencedElements(sanitizedHtml, logger)
		// ... add other future synchronous validation checks here ...

		return sanitizedHtml
	}

	// Apply processing to all fields by reference
	sanitizedItem.body = processString(sanitizedItem.body)
	sanitizedItem.feedback.correct = processString(sanitizedItem.feedback.correct)
	sanitizedItem.feedback.incorrect = processString(sanitizedItem.feedback.incorrect)

	if (sanitizedItem.interactions) {
		for (const key in sanitizedItem.interactions) {
			const interaction: AnyInteraction = sanitizedItem.interactions[key]
			if ("prompt" in interaction && interaction.prompt) {
				interaction.prompt = processString(interaction.prompt)
			}
			if ("choices" in interaction && interaction.choices) {
				for (const choice of interaction.choices) {
					choice.content = processString(choice.content)
					if ("feedback" in choice && choice.feedback) {
						choice.feedback = processString(choice.feedback)
					}
				}
			}
		}
	}

	return sanitizedItem
}
