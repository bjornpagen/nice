import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { XMLValidator } from "fast-xml-parser"
import {
	checkNoCDataSections,
	checkNoInvalidXmlChars,
	checkNoLatex,
	checkNoMfencedElements,
	checkNoPerseusArtifacts
} from "@/lib/qti-validation/utils"
import type { AssessmentItemInput, BlockContent, InlineContent } from "./schemas"

/**
 * Validates that a MathML fragment is well-formed XML.
 * Throws an error if the XML is malformed.
 * @param mathml The MathML string to validate.
 * @param context The context for error reporting.
 * @param logger The logger instance.
 */
function validateMathMLWellFormed(mathml: string, context: string, logger: logger.Logger): void {
	// Wrap the MathML in a root element to ensure it's a complete XML document
	const wrappedMathML = `<math xmlns="http://www.w3.org/1998/Math/MathML">${mathml}</math>`

	const validationResult = XMLValidator.validate(wrappedMathML, {
		allowBooleanAttributes: true,
		unpairedTags: [
			"br",
			"hr",
			"img",
			"area",
			"base",
			"col",
			"embed",
			"input",
			"link",
			"meta",
			"param",
			"source",
			"track",
			"wbr"
		]
	})

	if (validationResult !== true) {
		// Extract the error message
		const errorMessage =
			typeof validationResult === "object" && validationResult.err
				? validationResult.err.msg
				: "Unknown XML validation error"

		logger.error("malformed MathML XML", {
			mathml,
			context,
			error: errorMessage,
			validationResult
		})

		throw errors.new(`invalid mathml in ${context}: ${errorMessage}`)
	}
}

function validateInlineContent(items: InlineContent, _context: string, logger: logger.Logger): void {
	for (const item of items) {
		if (item.type === "text") {
			// Ensure PCDATA-safe content (ban control chars etc.)
			checkNoInvalidXmlChars(item.content, logger)
			checkNoCDataSections(item.content, logger)
			checkNoLatex(item.content, logger)
			// FIX: Restore missing Perseus artifact validation
			checkNoPerseusArtifacts(item.content, logger)

			// Strict currency/percent enforcement: raw text currency/percent are banned.
			// Require MathML tokens instead (e.g., <mo>$</mo><mn>50</mn> and <mn>5</mn><mo>%</mo>).
			const hasCurrencySpan = /<span\s+class\s*=\s*["']currency["']\s*>/i.test(item.content)
			const hasDollarNumber = /\$(?=\s*\d)/.test(item.content)
			const hasNumberPercent = /\d\s*%/.test(item.content)
			if (hasCurrencySpan || hasDollarNumber || hasNumberPercent) {
				logger.error("raw currency/percent in text content", {
					context: _context,
					text: item.content.substring(0, 120)
				})
				throw errors.new(
					"currency and percent must be expressed in MathML, not raw text (use <mo>$</mo><mn>n</mn> and <mn>n</mn><mo>%</mo>)"
				)
			}
		} else if (item.type === "math") {
			// First validate that the MathML is well-formed XML
			checkNoInvalidXmlChars(item.mathml, logger)
			checkNoCDataSections(item.mathml, logger)
			validateMathMLWellFormed(item.mathml, _context, logger)
			// Then check for deprecated elements
			checkNoMfencedElements(item.mathml, logger)
			// Note: Input schema defines mathml as content without the outer <math> element.
			// The renderer is responsible for wrapping tokens in <math xmlns="http://www.w3.org/1998/Math/MathML">…</math>.
			// Therefore, do not reject unwrapped MathML tokens here.
			// Check for msup elements with missing children
			const msupMatches = item.mathml.match(/<msup[^>]*>(.*?)<\/msup>/gi)
			if (msupMatches) {
				for (const msupMatch of msupMatches) {
					const innerContent = msupMatch.replace(/<\/?msup[^>]*>/gi, "").trim()
					// Count child elements - msup needs exactly 2 children (base and exponent)
					const childElementCount = (innerContent.match(/<[^>]+>/g) || []).length
					if (childElementCount < 2 || innerContent.includes("<mo></mo>") || innerContent.includes("<mo />")) {
						logger.error("msup element missing required children", { context: _context, msup: msupMatch })
						throw errors.new("msup elements must have exactly 2 children (base and exponent)")
					}
				}
			}
			// Check for forbidden mo attributes like 'superscript'
			if (/<mo[^>]*\ssuperscript\s*=/i.test(item.mathml)) {
				logger.error("forbidden mo attribute detected", { context: _context, mathml: item.mathml.substring(0, 80) })
				throw errors.new("mo elements cannot have superscript attribute; use msup instead")
			}

			// Strict repeating decimal enforcement: require <mover> over the repeating part
			// Heuristic: if a decimal point is followed by a numeric token and no <mover> appears in the fragment,
			// we reject to force explicit overline usage when repeating decimals are intended.
			const hasDecimalWithoutMover = /<mo>\.<\/mo>\s*<mn>\d+<\/mn>/.test(item.mathml) && !/<mover>/i.test(item.mathml)
			if (hasDecimalWithoutMover) {
				logger.error("decimal without overline mover", { context: _context, mathml: item.mathml })
				throw errors.new("repeating decimals must use <mover> with an overline for the repeating part")
			}
		}
		// inlineSlot is just a reference, no validation needed
	}
}

function validateBlockContent(items: BlockContent, _context: string, logger: logger.Logger): void {
	for (const item of items) {
		if (item.type === "paragraph") {
			validateInlineContent(item.content, `${_context}.paragraph`, logger)
		}
		// blockSlot is just a reference, no validation needed
	}
}

export function validateAssessmentItemInput(item: AssessmentItemInput, logger: logger.Logger): void {
	if (item.body) validateBlockContent(item.body, "item.body", logger)
	validateBlockContent(item.feedback.correct, "item.feedback.correct", logger)
	validateBlockContent(item.feedback.incorrect, "item.feedback.incorrect", logger)

	if (item.interactions) {
		for (const [key, interaction] of Object.entries(item.interactions)) {
			if ("prompt" in interaction && interaction.prompt) {
				validateInlineContent(interaction.prompt, `interaction[${key}].prompt`, logger)
			}

			// Type narrowing based on interaction type
			if (interaction.type === "inlineChoiceInteraction" && interaction.choices) {
				// Now TypeScript knows this is an inlineChoiceInteraction
				for (const choice of interaction.choices) {
					validateInlineContent(choice.content, `interaction[${key}].choice[${choice.identifier}]`, logger)
				}
			} else if (
				(interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") &&
				interaction.choices
			) {
				// Runtime validation for minimum number of choices
				if (interaction.choices.length < 2) {
					throw errors.new(
						`${interaction.type} must have at least 2 choices, but only ${interaction.choices.length} found in interaction[${key}]`
					)
				}

				// Now TypeScript knows this is a choice/order interaction
				for (const choice of interaction.choices) {
					validateBlockContent(choice.content, `interaction[${key}].choice[${choice.identifier}]`, logger)
					if (choice.feedback) {
						validateInlineContent(choice.feedback, `interaction[${key}].choice[${choice.identifier}].feedback`, logger)
					}
				}
			}
		}
	}
}
