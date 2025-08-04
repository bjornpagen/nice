import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import type { ChatCompletionContentPart } from "openai/resources/chat/completions"
import { z } from "zod"
import { env } from "@/env"
import { type AssessmentItemInput, AssessmentItemSchema, createDynamicAssessmentItemSchema } from "@/lib/qti/schemas"
import { typedSchemas } from "@/lib/widgets/generators"
import {
	createAssessmentShellPrompt,
	createQtiConversionPrompt,
	createQtiSufficiencyValidationPrompt,
	createStructuredQtiCompletionPrompt,
	createWidgetMappingPrompt
} from "./prompts"
import {
	convertHtmlEntities,
	fixInequalityOperators,
	fixKhanGraphieUrls,
	fixMathMLOperators,
	stripXmlComments
} from "./strip"

const OPENAI_MODEL = "o3"
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const QtiGenerationSchema = z.object({
	qti_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

// NEW: Zod schema for the solvability validation response
const QtiSolvabilityValidationSchema = z.object({
	is_solvable: z.boolean(),
	reason: z.string()
})

// A new schema is needed for the shell from Shot 1.
// It defines widgets and interactions as maps of empty objects.
const AssessmentShellSchema = AssessmentItemSchema.extend({
	widgets: z.array(z.string()).describe("A list of unique identifiers for widget slots that must be filled."),
	interactions: z.array(z.string()).describe("A list of unique identifiers for interaction slots that must be filled.")
})
type AssessmentShell = z.infer<typeof AssessmentShellSchema>

/**
 * Extracts and validates the XML from the AI response
 */
function extractAndValidateXml(xml: string, rootTag: string, logger: logger.Logger): string {
	// ROBUST XML VALIDATION AND EXTRACTION:
	// Step 1: Check for XML declaration (optional)
	const xmlDeclMatch = xml.match(/^(?<declaration><\?xml[^>]*\?>)?/s)
	const hasXmlDeclaration = !!xmlDeclMatch?.groups?.declaration

	logger.debug("xml declaration check", {
		hasXmlDeclaration,
		declaration: xmlDeclMatch?.groups?.declaration?.substring(0, 50)
	})

	// Step 2: Extract the root element with robust named capture groups
	// This regex ensures we match the complete XML document with proper opening and closing tags
	const rootElementRegex = new RegExp(
		"(?:^|\\s)" + // Start of string or whitespace
			`<(?<rootTag>${rootTag})` + // Opening tag must match our expected root
			"(?<attributes>(?:\\s+[^>]*)?)" + // Optional attributes
			">" + // Close opening tag
			"(?<content>[\\s\\S]*?)" + // Content (non-greedy)
			"</\\k<rootTag>>" + // Closing tag with backreference to ensure it matches
			"(?:\\s*$)?", // Optional trailing whitespace
		"s" // Dot matches newline
	)

	const rootMatch = xml.match(rootElementRegex)

	if (!rootMatch || !rootMatch.groups) {
		// Try to find ANY qti root element for better error reporting
		const anyQtiMatch = xml.match(/<(?<anyRoot>qti-[a-z-]+)(?:\s+[^>]*)?>/)

		logger.error("robust extraction failed: ai response did not contain valid qti xml", {
			expectedRootTag: rootTag,
			foundRootTag: anyQtiMatch?.groups?.anyRoot,
			response: xml.substring(0, 200),
			responseEnd: xml.substring(xml.length - 200)
		})
		throw errors.new(
			`invalid ai xml output: expected ${rootTag} but ${anyQtiMatch?.groups?.anyRoot ? `found ${anyQtiMatch.groups.anyRoot}` : "found no valid QTI root element"}`
		)
	}

	// TypeScript now knows rootMatch.groups is defined
	const { content, rootTag: extractedRootTag, attributes } = rootMatch.groups

	// Step 3: Validate the content doesn't have truncated closing tags
	if (!content) {
		logger.error("extracted xml has no content", { rootTag })
		throw errors.new("invalid ai xml output: empty content")
	}

	const truncatedTagMatch = content.match(/<\/(?:_|\s*>|\.\.\.)/)
	if (truncatedTagMatch) {
		const matchIndex = truncatedTagMatch.index ?? 0
		logger.error("detected truncated closing tag in xml content", {
			truncatedTag: truncatedTagMatch[0],
			context: content.substring(Math.max(0, matchIndex - 50), Math.min(content.length, matchIndex + 50))
		})
		throw errors.new("invalid ai xml output: contains truncated closing tags")
	}

	// Step 4: Reconstruct the complete XML with declaration if present
	const extractedXml = (
		(hasXmlDeclaration && xmlDeclMatch?.groups?.declaration ? xmlDeclMatch.groups.declaration : "") +
		rootMatch[0].trim()
	).trim()

	// Step 5: Strip all XML comments to prevent malformed comment errors
	let strippedXml = stripXmlComments(extractedXml, logger)

	// Step 6: Fix unescaped angle brackets in MathML mo elements
	strippedXml = fixMathMLOperators(strippedXml, logger)

	// Step 7: Fix unescaped inequality operators throughout the XML
	strippedXml = fixInequalityOperators(strippedXml, logger)

	// Step 8: Fix Khan Academy graphie URLs by appending .svg extension
	strippedXml = fixKhanGraphieUrls(strippedXml, logger)

	logger.debug("successfully generated and extracted qti xml", {
		xmlLength: strippedXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return strippedXml
}

interface RegenerationContext {
	flawedXml: string
	errorReason: string
}

export async function generateXml(
	logger: logger.Logger,
	perseusData: unknown,
	options: { type: "assessmentItem" | "stimulus" },
	regenerationContext?: RegenerationContext
): Promise<string> {
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	const { systemInstruction, userContent, rootTag } = await createQtiConversionPrompt(
		logger,
		perseusJsonString,
		options,
		regenerationContext
	)

	logger.debug("calling openai for qti generation", { model: OPENAI_MODEL, rootTag })
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			response_format: zodResponseFormat(QtiGenerationSchema, "qti_generator"),
			reasoning_effort: "high"
		})
	)
	if (response.error) {
		logger.error("failed to generate qti xml from perseus via openai", { error: response.error })
		throw errors.wrap(response.error, "ai qti generation")
	}

	logger.debug("received openai response", {
		fullResponse: response.data,
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason,
		message: response.data.choices[0]?.message,
		parsed: response.data.choices[0]?.message?.parsed,
		usage: response.data.usage
	})

	const choice = response.data.choices[0]
	// ✅ CORRECT: Explicit validation, no fallbacks. Fails fast and loud.
	if (!choice) {
		logger.error("CRITICAL: OpenAI response contained no choices")
		throw errors.new("openai returned no choices")
	}
	const message = choice.message
	if (!message) {
		logger.error("CRITICAL: OpenAI choice contained no message")
		throw errors.new("empty ai response")
	}
	if (message.refusal) {
		logger.error("openai refused to generate qti xml", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}
	if (!message.parsed) {
		logger.error("CRITICAL: OpenAI returned no parsed content for qti conversion")
		throw errors.new("empty ai response: no parsed content")
	}

	const qtiXml = message.parsed.qti_xml
	if (!qtiXml) {
		logger.error("CRITICAL: OpenAI returned an empty qti_xml string in response")
		throw errors.new("empty ai response: qti_xml string is empty")
	}
	let cleanedXml = convertHtmlEntities(qtiXml, logger)
	cleanedXml = fixMathMLOperators(cleanedXml, logger)
	cleanedXml = fixInequalityOperators(cleanedXml, logger)
	cleanedXml = fixKhanGraphieUrls(cleanedXml, logger)
	return extractAndValidateXml(cleanedXml, rootTag, logger)
}

/**
 * ✅ REFACTORED: This is the new Shot 2 function.
 */
async function mapSlotsToWidgets(
	logger: logger.Logger,
	perseusJson: string,
	assessmentBody: string,
	slotNames: string[] // ✅ Takes the parsed slot names to generate the prompt.
): Promise<Record<string, keyof typeof typedSchemas>> {
	// ✅ The prompt and the schema are now generated together dynamically.
	const { systemInstruction, userContent, WidgetMappingSchema } = createWidgetMappingPrompt(
		perseusJson,
		assessmentBody,
		slotNames
	)

	logger.debug("calling openai for slot-to-widget mapping", { slotNames })
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			// ✅ The dynamically generated, constrained schema is used here.
			response_format: zodResponseFormat(WidgetMappingSchema, "widget_mapper")
		})
	)
	if (response.error) {
		logger.error("failed to map slots to widgets via openai", { error: response.error })
		throw errors.wrap(response.error, "ai widget mapping")
	}

	const choice = response.data.choices[0]
	if (!choice?.message?.parsed) {
		logger.error("CRITICAL: OpenAI widget mapping returned no parsed content")
		throw errors.new("empty ai response: no parsed content for widget mapping")
	}
	if (choice.message.refusal) {
		logger.error("openai refused widget mapping request", { refusal: choice.message.refusal })
		throw errors.new(`ai refused request: ${choice.message.refusal}`)
	}

	const rawMapping = choice.message.parsed.widget_mapping

	// Type guard to check if a value is a valid widget type
	const isValidWidgetType = (val: unknown): val is keyof typeof typedSchemas => {
		return typeof val === "string" && val in typedSchemas
	}

	// Validate and build the properly typed mapping
	const mapping: Record<string, keyof typeof typedSchemas> = {}
	for (const [key, value] of Object.entries(rawMapping)) {
		if (isValidWidgetType(value)) {
			mapping[key] = value
		} else {
			logger.error("invalid widget type in mapping", { slot: key, type: value })
			throw errors.new(`invalid widget type "${value}" for slot "${key}"`)
		}
	}

	logger.info("successfully mapped slots to widgets", { mapping, count: Object.keys(mapping).length })
	return mapping
}

/**
 * NEW - Shot 1: Generate Content Shell & Plan.
 */
async function generateAssessmentShell(logger: logger.Logger, perseusJson: string): Promise<AssessmentShell> {
	// Assumes a new prompt function is created for this shot.
	const { systemInstruction, userContent } = createAssessmentShellPrompt(perseusJson)

	logger.debug("calling openai for assessment shell generation")
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			response_format: zodResponseFormat(AssessmentShellSchema, "assessment_shell_generator")
		})
	)
	if (response.error) {
		logger.error("failed to generate assessment shell", { error: response.error })
		throw errors.wrap(response.error, "ai shell generation")
	}

	const choice = response.data.choices[0]
	if (!choice) {
		logger.error("CRITICAL: OpenAI response contained no choices")
		throw errors.new("openai returned no choices")
	}

	const message = choice.message
	if (!message.parsed) {
		logger.error("CRITICAL: OpenAI returned no parsed content for shell generation")
		throw errors.new("empty ai response: no parsed content")
	}

	return message.parsed
}

/**
 * ✅ REFACTORED: This is the new Shot 3 function.
 */
async function generateFullAssessmentItem(
	logger: logger.Logger,
	perseusData: unknown,
	assessmentShell: AssessmentShell,
	widgetMapping: Record<string, keyof typeof typedSchemas> // ✅ Receives the type-safe mapping.
): Promise<AssessmentItemInput> {
	const { systemInstruction, userContent } = createStructuredQtiCompletionPrompt(
		JSON.stringify(perseusData, null, 2),
		assessmentShell
	)
	// Use the mapping to create the precise schema
	// ✅ Use the mapping to create the precise schema for Shot 3.
	const { AssessmentItemSchema: dynamicSchema } = createDynamicAssessmentItemSchema(widgetMapping)

	logger.debug("calling openai for structured qti completion", {
		widgetMapping,
		widgetCount: Object.keys(widgetMapping).length
	})
	const result = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			response_format: zodResponseFormat(dynamicSchema, "assessment_item_generator")
		})
	)
	if (result.error) {
		logger.error("openai request failed for structured qti generation", { error: result.error })
		throw errors.wrap(result.error, "ai qti item generation")
	}

	const message = result.data.choices[0]?.message
	if (!message) {
		throw errors.new("openai response missing choices or message")
	}

	if (!message.parsed) {
		logger.error("openai parsing failed for structured qti generation", {
			refusal: message.refusal,
			finishReason: result.data.choices[0]?.finish_reason
		})
		throw errors.new("ai qti item generation: parsing failed")
	}

	return message.parsed
}

/**
 * ✅ REFACTORED: The main orchestrator implements the new, robust, and type-safe 3-shot flow.
 */
export async function generateStructuredQtiItem(
	logger: logger.Logger,
	perseusData: unknown
): Promise<AssessmentItemInput> {
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	logger.info("starting structured qti generation process")

	// Shot 1: Generate the content shell and plan.
	logger.debug("shot 1: generating assessment shell")
	const shellResult = await errors.try(generateAssessmentShell(logger, perseusJsonString))
	if (shellResult.error) {
		logger.error("shot 1 failed: shell generation pass failed", { error: shellResult.error })
		throw shellResult.error
	}
	const assessmentShell = shellResult.data
	logger.debug("shot 1 complete", { identifier: assessmentShell.identifier })

	// Step 1.5 (Deterministic): Extract widget slot names directly from the shell object keys.
	// This is the robust replacement for the fragile string parsing.
	const widgetSlotNames = assessmentShell.widgets
	logger.debug("extracted widget slot names from shell object", {
		count: widgetSlotNames.length,
		slotNames: widgetSlotNames
	})

	// Shot 2: Map the extracted slot names to widget types using a constrained schema.
	logger.debug("shot 2: mapping slots to widgets")
	const widgetMappingResult = await errors.try(
		mapSlotsToWidgets(logger, perseusJsonString, assessmentShell.body, widgetSlotNames)
	)
	if (widgetMappingResult.error) {
		logger.error("shot 2 failed: widget mapping pass failed", { error: widgetMappingResult.error })
		throw widgetMappingResult.error
	}
	const widgetMapping = widgetMappingResult.data
	logger.debug("shot 2 complete", { mapping: widgetMapping })

	// Shot 3: Generate the full item by filling in the shell.
	logger.debug("shot 3: generating final structured item")
	const structuredItemResult = await errors.try(
		generateFullAssessmentItem(logger, perseusData, assessmentShell, widgetMapping)
	)
	if (structuredItemResult.error) {
		logger.error("shot 3 failed: structured generation pass failed", { error: structuredItemResult.error })
		throw structuredItemResult.error
	}

	logger.info("structured qti generation process successful", { identifier: structuredItemResult.data.identifier })
	return structuredItemResult.data
}

/**
 * NEW: A dedicated client function for the AI-powered solvability validator.
 * @param logger The logger instance.
 * @param perseusJson The source Perseus JSON.
 * @param qtiXml The generated QTI XML to validate.
 * @param imageUrls An array of image URLs extracted from the QTI XML.
 * @param svgContents An array of SVG content objects with URL and content.
 * @returns A promise that resolves to the structured validation result.
 */
export async function validateXmlWithAi(
	logger: logger.Logger,
	perseusJson: unknown,
	qtiXml: string,
	imageUrls: string[], // NEW: Add imageUrls parameter
	svgContents: { url: string; content: string }[] = [] // NEW: Add svgContents parameter
): Promise<z.infer<typeof QtiSolvabilityValidationSchema>> {
	const { developer, user } = createQtiSufficiencyValidationPrompt(perseusJson, qtiXml, svgContents)

	logger.debug("calling openai for qti solvability validation", {
		model: OPENAI_MODEL,
		imageCount: imageUrls.length,
		svgCount: svgContents.length
	})

	// Construct the multimodal message payload
	const userMessageContent: ChatCompletionContentPart[] = [{ type: "text", text: user }]
	for (const url of imageUrls) {
		userMessageContent.push({
			type: "image_url",
			image_url: { url }
		})
	}

	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL, // CHANGED: Use o3 which supports vision
			messages: [
				{ role: "system", content: developer },
				{ role: "user", content: userMessageContent } // CHANGED: Send multimodal content
			],
			response_format: zodResponseFormat(QtiSolvabilityValidationSchema, "qti_validator")
		})
	)

	if (response.error) {
		logger.error("failed to validate qti xml via openai", { error: response.error })
		throw errors.wrap(response.error, "ai qti validation")
	}

	const choice = response.data.choices[0]
	// ✅ CORRECT: Explicit validation, no fallbacks.
	if (!choice) {
		logger.error("CRITICAL: OpenAI validation response contained no choices")
		throw errors.new("openai validation returned no choices")
	}
	const message = choice.message
	if (!message || !message.parsed) {
		logger.error("CRITICAL: OpenAI validation returned no parsed content")
		throw errors.new("empty ai response: no parsed content for validation")
	}
	if (message.refusal) {
		logger.error("openai refused qti validation request", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}

	return message.parsed
}
