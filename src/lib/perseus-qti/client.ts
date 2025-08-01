import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import type { ChatCompletionContentPart } from "openai/resources/chat/completions"
import { z } from "zod"
import { env } from "@/env"
import { createQtiConversionPrompt, createQtiSufficiencyValidationPrompt } from "./prompts"
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
