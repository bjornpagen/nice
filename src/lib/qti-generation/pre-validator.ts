import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { XMLParser, XMLValidator } from "fast-xml-parser"
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
	if (!Array.isArray(items)) {
		logger.error("inline content is not an array", { context: _context })
		throw errors.new(`${_context} must be an array of inline items`)
	}
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

			// Reject any HTML tags embedded inside MathML fragments
			if (/<\s*(span|div|p|br|img|strong|em|code|pre)(\s|>|\/)/i.test(item.mathml)) {
				logger.error("html elements found inside mathml fragment", {
					context: _context,
					mathml: item.mathml.substring(0, 120)
				})
				throw errors.new("mathml must not contain html elements like <span>, <div>, <p>, <img>")
			}
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

			// Basic mfrac validation: exactly two top-level child elements (numerator and denominator)
			// Use a real XML parse to correctly handle nested <mfrac> elements in exponents, etc.
			const wrappedForParse = `<math xmlns="http://www.w3.org/1998/Math/MathML">${item.mathml}</math>`
			const parseValid = XMLValidator.validate(wrappedForParse)
			if (parseValid !== true) {
				logger.error("malformed MathML XML", { context: _context, error: parseValid })
				throw errors.new("invalid mathml xml")
			}
			const parser = new XMLParser({ ignoreAttributes: false, preserveOrder: true })
			const parseResult = parser.parse(wrappedForParse)
			if (!Array.isArray(parseResult)) {
				logger.error("XML parser returned non-array result", { context: _context })
				throw errors.new("invalid xml parse result")
			}
			const ast = parseResult

			function countElementChildren(nodes: Array<Record<string, unknown>>): number {
				// Count only element nodes (ignore #text and attribute nodes)
				return nodes.filter((n) => {
					const keys = Object.keys(n)
					if (keys.length !== 1) return false
					const key = keys[0]
					return key !== "#text" && key !== ":@"
				}).length
			}

			function walk(nodes: Array<Record<string, unknown>>): void {
				for (const node of nodes) {
					for (const [key, value] of Object.entries(node)) {
						if (key === ":@" || key === "#text") continue
						const children = Array.isArray(value) ? value : []
						if (key.toLowerCase() === "mfrac") {
							const childCount = countElementChildren(children)
							if (childCount !== 2) {
								logger.error("mfrac has invalid number of children", {
									context: _context,
									mfrac: wrappedForParse.substring(0, 120)
								})
								throw errors.new("mfrac elements must have exactly 2 children (numerator and denominator)")
							}
						}
						// Recurse into children
						if (Array.isArray(children) && children.length > 0) {
							walk(children)
						}
					}
				}
			}

			walk(ast)
		}
		// inlineSlot is just a reference, no validation needed
	}
}

function validateBlockContent(items: BlockContent, _context: string, logger: logger.Logger): void {
	if (!Array.isArray(items)) {
		logger.error("block content is not an array", { context: _context })
		throw errors.new(`${_context} must be an array of block items`)
	}
	for (const item of items) {
		if (item.type === "paragraph") {
			validateInlineContent(item.content, `${_context}.paragraph`, logger)
		}
		// blockSlot is just a reference, no validation needed
	}
}

export function validateAssessmentItemInput(item: AssessmentItemInput, logger: logger.Logger): void {
	// Require at least one response declaration to avoid generating empty response-processing blocks
	if (!item.responseDeclarations || item.responseDeclarations.length === 0) {
		logger.error("no response declarations present", {
			identifier: item.identifier,
			title: item.title
		})
		throw errors.new("assessment item must declare at least one response for scoring")
	}

	if (item.body !== null) {
		if (!Array.isArray(item.body)) {
			logger.error("item body is not an array", { identifier: item.identifier })
			throw errors.new("item.body must be null or an array of block items")
		}
		validateBlockContent(item.body, "item.body", logger)
	}
	if (!Array.isArray(item.feedback?.correct)) {
		logger.error("feedback.correct is not an array", { identifier: item.identifier })
		throw errors.new("item.feedback.correct must be an array of block items")
	}
	if (!Array.isArray(item.feedback?.incorrect)) {
		logger.error("feedback.incorrect is not an array", { identifier: item.identifier })
		throw errors.new("item.feedback.incorrect must be an array of block items")
	}
	validateBlockContent(item.feedback.correct, "item.feedback.correct", logger)
	validateBlockContent(item.feedback.incorrect, "item.feedback.incorrect", logger)

	if (item.interactions) {
		for (const [key, interaction] of Object.entries(item.interactions)) {
			if ("prompt" in interaction && interaction.prompt) {
				validateInlineContent(interaction.prompt, `interaction[${key}].prompt`, logger)
			}

			// Type narrowing based on interaction type
			if (interaction.type === "inlineChoiceInteraction" && interaction.choices) {
				if (!Array.isArray(interaction.choices)) {
					logger.error("inlineChoiceInteraction.choices is not an array", { interactionKey: key })
					throw errors.new(`interaction[${key}].choices must be an array`)
				}
				// Now TypeScript knows this is an inlineChoiceInteraction
				for (const choice of interaction.choices) {
					validateInlineContent(choice.content, `interaction[${key}].choice[${choice.identifier}]`, logger)
				}
			} else if (
				(interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") &&
				interaction.choices
			) {
				if (!Array.isArray(interaction.choices)) {
					logger.error("choice/order interaction choices is not an array", { interactionKey: key })
					throw errors.new(`interaction[${key}].choices must be an array`)
				}
				// Runtime validation for minimum number of choices
				if (interaction.choices.length < 2) {
					logger.error("interaction has insufficient choices", {
						interactionKey: key,
						interactionType: interaction.type,
						choiceCount: interaction.choices.length
					})
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

				// Enforce response cardinality consistency with minChoices/maxChoices for choiceInteraction
				if (interaction.type === "choiceInteraction") {
					// Find matching response declaration by identifier
					const decl = item.responseDeclarations.find((d) => d.identifier === interaction.responseIdentifier)
					if (!decl) {
						logger.error("response declaration without matching interaction found during cardinality check", {
							interactionKey: key,
							responseIdentifier: interaction.responseIdentifier
						})
						throw errors.new(
							`response declaration '${interaction.responseIdentifier}' has no matching interaction for cardinality check`
						)
					}

					if (decl.cardinality === "single") {
						const maxChoices = interaction.maxChoices
						if (typeof maxChoices === "number" && maxChoices > 1) {
							logger.error("cardinality mismatch: single with max-choices > 1", {
								interactionKey: key,
								responseIdentifier: interaction.responseIdentifier,
								maxChoices
							})
							throw errors.new("choiceInteraction with single cardinality must have max-choices <= 1")
						}
					}

					if (decl.cardinality === "multiple") {
						const maxChoices = interaction.maxChoices
						if (typeof maxChoices === "number" && maxChoices <= 1) {
							logger.error("cardinality mismatch: multiple with max-choices <= 1", {
								interactionKey: key,
								responseIdentifier: interaction.responseIdentifier,
								maxChoices
							})
							throw errors.new("choiceInteraction with multiple cardinality must have max-choices > 1")
						}
					}
				}
			}
		}
	}

	// Validate each response declaration has a corresponding interaction responseIdentifier
	// or an embedded input within a widget (e.g., dataTable input cells)
	if (item.responseDeclarations.length > 0) {
		const interactionResponseIds = new Set<string>()
		if (item.interactions) {
			for (const interaction of Object.values(item.interactions)) {
				interactionResponseIds.add(interaction.responseIdentifier)
			}
		}

		const widgetEmbeddedResponseIds = new Set<string>()
		if (item.widgets) {
			for (const widget of Object.values(item.widgets)) {
				// Best-effort detection for dataTable widget with input cells
				// We avoid importing widget types here; rely on duck-typing by field presence
				if (typeof widget === "object" && widget !== null && "type" in widget) {
					const w: any = widget
					if (w.type === "dataTable") {
						// Helper: extract responseIdentifier from a cell using the standard "type" discriminant
						const extractResponseId = (cell: unknown): string | null => {
							if (typeof cell !== "object" || cell === null) return null
							const obj: any = cell
							const discrim = typeof obj.type === "string" ? obj.type : null
							if (discrim !== "input" && discrim !== "dropdown") return null
							const rid = obj.responseIdentifier
							return typeof rid === "string" ? rid : null
						}

						const data = typeof widget === "object" && widget !== null && "data" in widget ? w.data : undefined
						if (Array.isArray(data)) {
							for (const row of data) {
								if (!Array.isArray(row)) continue
								for (const cell of row) {
									const rid = extractResponseId(cell)
									if (rid) widgetEmbeddedResponseIds.add(rid)
								}
							}
						}

						const footer = typeof widget === "object" && widget !== null && "footer" in widget ? w.footer : undefined
						if (Array.isArray(footer)) {
							for (const cell of footer) {
								const rid = extractResponseId(cell)
								if (rid) widgetEmbeddedResponseIds.add(rid)
							}
						}
					}
				}
			}
		}

		for (const decl of item.responseDeclarations) {
			if (!interactionResponseIds.has(decl.identifier) && !widgetEmbeddedResponseIds.has(decl.identifier)) {
				logger.error("response declaration without matching interaction", { responseIdentifier: decl.identifier })
				throw errors.new(`response declaration '${decl.identifier}' has no matching interaction or embedded widget input`)
			}
		}
	}
}