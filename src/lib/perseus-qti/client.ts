import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import { createQtiConversionPrompt, createQtiCorrectionPrompt } from "./prompts"
import { convertHtmlEntities, stripXmlComments } from "./strip"

const OPENAI_MODEL = "o3"
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const QtiGenerationSchema = z.object({
	qti_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

const QtiCorrectionSchema = z.object({
	corrected_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
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
	const strippedXml = stripXmlComments(extractedXml, logger)

	logger.debug("successfully generated and extracted qti xml", {
		xmlLength: strippedXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return strippedXml
}

export async function generateXml(
	logger: logger.Logger,
	perseusData: unknown,
	options: { type: "assessmentItem" | "stimulus" }
): Promise<string> {
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	const { systemInstruction, userContent, rootTag } = await createQtiConversionPrompt(
		logger,
		perseusJsonString,
		options
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

	const message = response.data.choices[0]?.message
	if (!message) {
		logger.error("openai returned no message")
		throw errors.new("empty ai response")
	}

	// Handle refusals
	if (message.refusal) {
		logger.error("openai refused to generate qti xml", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}

	// Access the automatically parsed data
	if (!message.parsed) {
		logger.error("openai returned no parsed content for qti conversion")
		throw errors.new("empty ai response")
	}

	const qtiXml = message.parsed.qti_xml
	if (!qtiXml) {
		logger.error("openai returned an empty qti_xml in response")
		throw errors.new("empty ai response")
	}

	// Convert problematic HTML entities before extraction and validation
	const cleanedXml = convertHtmlEntities(qtiXml, logger)

	// Extract and validate the XML using the EXACT same logic from the old code
	return extractAndValidateXml(cleanedXml, rootTag, logger)
}

export async function correctXml(
	logger: logger.Logger,
	input: { invalidXml: string; errorMessage: string; rootTag: "qti-assessment-item" | "qti-assessment-stimulus" }
): Promise<string> {
	const { invalidXml, errorMessage, rootTag } = input
	logger.debug("attempting to fix invalid qti xml", {
		rootTag,
		error: errorMessage,
		invalidXmlLength: invalidXml.length
	})

	const userPrompt = createQtiCorrectionPrompt(invalidXml, errorMessage, rootTag)
	logger.debug("calling openai for xml correction", {
		model: OPENAI_MODEL,
		promptLength: userPrompt.length
	})

	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [{ role: "user", content: userPrompt }],
			response_format: zodResponseFormat(QtiCorrectionSchema, "qti_corrector"),
			reasoning_effort: "high"
		})
	)
	if (response.error) {
		logger.error("failed to fix qti xml", { error: response.error })
		throw errors.wrap(response.error, "qti xml correction")
	}

	logger.debug("received openai response", {
		fullResponse: response.data,
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason,
		message: response.data.choices[0]?.message,
		parsed: response.data.choices[0]?.message?.parsed,
		usage: response.data.usage
	})

	const message = response.data.choices[0]?.message
	if (!message) {
		logger.error("openai returned no message")
		throw errors.new("qti xml correction returned no content")
	}

	// Handle refusals
	if (message.refusal) {
		logger.error("openai refused to correct qti xml", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}

	// Access the automatically parsed data
	if (!message.parsed) {
		logger.error("qti xml correction returned no parsed content")
		throw errors.new("qti xml correction returned no content")
	}

	const correctedXml = message.parsed.corrected_xml
	if (!correctedXml) {
		logger.error("qti xml correction returned empty corrected_xml")
		throw errors.new("qti xml correction returned no content")
	}

	logger.info("successfully corrected qti xml", {
		rootTag,
		correctedXmlLength: correctedXml.length
	})

	// Convert problematic HTML entities before extraction and validation
	const cleanedXml = convertHtmlEntities(correctedXml, logger)

	// Extract and validate the corrected XML using the EXACT same logic from the old code
	return extractAndValidateXml(cleanedXml, rootTag, logger)
}
