import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import { loadConversionExamples } from "./qti-examples"
import { VALID_QTI_TAGS } from "./qti-tags"

const OPENAI_MODEL = "o4-mini-2025-04-16"

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const QtiGenerationSchema = z.object({
	qti_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

const QtiCorrectionSchema = z.object({
	corrected_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

/**
 * Creates the structured prompt for the AI model to convert Perseus JSON to QTI XML,
 * including a rich set of few-shot examples.
 * @param logger The logger instance.
 * @param perseusJsonString The stringified Perseus JSON data for the current conversion task.
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @returns The system instruction and user content for the AI prompt.
 */
export async function createQtiConversionPrompt(
	logger: logger.Logger,
	perseusJsonString: string,
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" }
) {
	const { type } = options
	const rootTag = type === "stimulus" ? "qti-assessment-stimulus" : "qti-assessment-item"

	logger.debug("creating qti conversion prompt", {
		type,
		rootTag,
		perseusDataLength: perseusJsonString.length
	})

	const systemInstruction = `You are an expert XML generator for educational content. Your primary and most critical function is to convert a Perseus JSON object into a single, well-formed QTI 3.0 XML \`${rootTag}\`. Your output MUST be only the raw XML. The XML MUST be perfect and parseable. The most common and catastrophic failure is an incomplete or malformed closing tag. You are STRICTLY FORBIDDEN from using partial or lazy closing tags like \`</_>\` or \`</>\`. Every single XML element, such as \`<p>\`, must have a corresponding full closing tag, \`</p>\`. This rule is absolute and cannot be violated.`

	logger.debug("loading conversion examples", { type })
	const examples = await loadConversionExamples({ type })
	logger.debug("loaded conversion examples", {
		exampleCount: examples.length,
		exampleNames: examples.map((e) => e.name)
	})

	const examplesXml = examples
		.map(
			(example) => `
<example name="${example.name}">
  <perseus_json>
${JSON.stringify(example.perseus, null, 2)}
  </perseus_json>
  <qti_xml>
${example.qti}
  </qti_xml>
</example>
`
		)
		.join("\n")

	const userContent = `
<examples>
${examplesXml}
</examples>

<instructions>
Below is a Perseus JSON object. Your task is to provide the corresponding QTI 3.0 XML. Use the PERFECT examples above to inform your output. Respond with ONLY the XML content.

Your output will be fed directly into an automated XML parser. If the XML is not well-formed, the entire system will crash. Pay extreme attention to the rules below.

---
### ABSOLUTE XML RULES - NON-NEGOTIABLE ###

1.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.**
    Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags are strictly forbidden and will cause a catastrophic failure.

    - ✅ **CORRECT:** \`</qti-simple-choice>\`, \`</p>\`, \`</math>\`, \`</div>\`
    - ❌ **ABSOLUTELY FORBIDDEN:** \`</_>\`, \`</>\`, \`</qti-simple-cho... \`

2.  **NO TRUNCATED OUTPUT.**
    Your response must be the complete XML file from start to finish. Do not stop generating mid-tag or mid-file. Ensure the final \`</${rootTag}>\` tag is present and correct.

3.  **MENTAL CHECK.**
    Before you output your final answer, perform a mental check: "Did I close every single tag I opened with its full name? Is the final closing tag present?"

4.  **ESCAPE ALL XML-RESERVED CHARACTERS.**
    In text nodes and attribute values, you must never emit raw \`<\`, \`>\`, \`&\`, \`'\` or \`"\` – always replace them with \`&lt;\`, \`&gt;\`, \`&amp;\`, \`&apos;\` and \`&quot;\` respectively.
    - ✅ **CORRECT:** \`&lt;mo&gt;&lt;/mo&gt;\`, \`title="AT&amp;T"\`
    - ❌ **FORBIDDEN:** \`<mo>\`, \`title="AT&T"\`

---

### Other Content Rules:
- NEVER place MathML within <qti-correct-response>. Correct responses must be simple values (e.g., "A", "7/4", "42").
- When Perseus JSON shows answerForms as ["proper", "improper"], the response MUST be a fraction.
- Remember: Users must be able to type or select the correct answer - they cannot input MathML markup!

FINAL REMINDER: The examples demonstrate PERFECT QTI 3.0 XML output. Follow their patterns exactly. Your top priority is generating a well-formed XML document with complete closing tags.
</instructions>

<perseus_json>
${perseusJsonString}
</perseus_json>

# FINAL OUTPUT
Return a single JSON object with the final generated XML, as per the specified schema.
`

	logger.debug("prompt created", {
		systemInstructionLength: systemInstruction.length,
		userContentLength: userContent.length,
		totalPromptLength: systemInstruction.length + userContent.length
	})

	return { systemInstruction, userContent, rootTag }
}

/**
 * Converts a Perseus JSON object into a QTI 3.0 XML string using the Gemini AI model.
 * @param logger The logger instance.
 * @param perseusData The Perseus question data as a JavaScript object.
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @returns A promise that resolves to the QTI XML string.
 */
export async function generateQtiFromPerseus(
	logger: logger.Logger,
	perseusData: unknown,
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" }
): Promise<string> {
	logger.debug("starting qti generation from perseus with openai", { type: options.type })

	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	logger.debug("stringified perseus data", { jsonLength: perseusJsonString.length })

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
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason
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
		logger.warn("openai returned an empty qti_xml in response")
		throw errors.new("empty ai response")
	}

	// ROBUST XML VALIDATION AND EXTRACTION:
	// Step 1: Check for XML declaration (optional)
	const xmlDeclMatch = qtiXml.match(/^(?<declaration><\?xml[^>]*\?>)?/s)
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

	const rootMatch = qtiXml.match(rootElementRegex)

	if (!rootMatch || !rootMatch.groups) {
		// Try to find ANY qti root element for better error reporting
		const anyQtiMatch = qtiXml.match(/<(?<anyRoot>qti-[a-z-]+)(?:\s+[^>]*)?>/)

		logger.error("robust extraction failed: ai response did not contain valid qti xml", {
			expectedRootTag: rootTag,
			foundRootTag: anyQtiMatch?.groups?.anyRoot,
			response: qtiXml.substring(0, 200),
			responseEnd: qtiXml.substring(qtiXml.length - 200)
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

	logger.debug("successfully generated and extracted qti xml from openai", {
		xmlLength: extractedXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return extractedXml
}

/**
 * Attempts to fix invalid QTI XML using a more powerful AI model.
 * @param {logger.Logger} logger - The logger instance.
 * @param {object} input - The input object.
 * @param {string} input.invalidXml - The malformed XML string.
 * @param {string} input.errorMessage - The error message from the QTI API.
 * @param {'qti-assessment-item' | 'qti-assessment-stimulus'} input.rootTag - The expected root tag.
 * @returns {Promise<string>} A promise that resolves to the corrected QTI XML string.
 */
export async function fixInvalidQtiXml(
	logger: logger.Logger,
	input: {
		invalidXml: string
		errorMessage: string
		rootTag: "qti-assessment-item" | "qti-assessment-stimulus"
	}
): Promise<string> {
	const { invalidXml, errorMessage, rootTag } = input
	logger.debug("attempting to fix invalid qti xml", {
		rootTag,
		error: errorMessage,
		invalidXmlLength: invalidXml.length
	})

	const userPrompt = `You are an expert XML developer specializing in the QTI 3.0 standard. You have been given a piece of XML that was rejected by an API, along with the API's error message. Your task is to analyze the XML and the error, fix the XML so that it is perfectly well-formed and valid according to the QTI 3.0 standard, and return the corrected XML.

# CONTEXT
<invalid_xml>
${invalidXml}
</invalid_xml>

<api_error_message>
${errorMessage}
</api_error_message>

# VALID QTI TAGS
The only valid QTI tags for this application are:
[${VALID_QTI_TAGS.join(", ")}]

# INSTRUCTIONS & RULES
1.  **Primary Goal: Fix the XML.** Your only job is to produce a valid, well-formed QTI 3.0 XML document.
2.  **Analyze the Error:** Use the <api_error_message> to diagnose the problem. Common issues include unclosed tags, incorrect attributes, or invalid structure.
3.  **Enforce Correct Tag Names:** The generated XML MUST only use tags from the provided valid tag list. You will often see tags like \`assessmentItem\` or \`choiceInteraction\`; these are incorrect and MUST be corrected to \`qti-assessment-item\` and \`qti-choice-interaction\`, respectively. The \`qti-\` prefix is mandatory for all QTI elements.
4.  **Remove Hallucinated Tags:** The invalid XML might contain hallucinated, non-standard tags like \`<contentBody>\`. These tags must be completely removed, but their inner content (e.g., the \`<p>\` tags within them) must be preserved and correctly placed within the parent element.
5.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.** Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags like \`</_>\` are strictly forbidden. For example, \`<p>\` must be closed with \`</p>\`.
6.  **NO TRUNCATED OUTPUT.** Your response must be the complete XML file from start to finish, beginning with \`<?xml ...?>\` and ending with the final \`</${rootTag}>\` tag.
7.  **Return ONLY XML:** Your final output must be a single JSON object containing only the corrected XML string, as per the specified schema.

# FINAL OUTPUT
Return a single JSON object with the final corrected XML.
`

	logger.debug("calling openai for xml correction", {
		model: OPENAI_MODEL,
		promptLength: userPrompt.length,
		validTagCount: VALID_QTI_TAGS.length
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
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason
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

	// ROBUST XML VALIDATION AND EXTRACTION:
	// Step 1: Check for XML declaration (optional)
	const xmlDeclMatch = correctedXml.match(/^(?<declaration><\?xml[^>]*\?>)?/s)
	const hasXmlDeclaration = !!xmlDeclMatch?.groups?.declaration

	logger.debug("xml declaration check for corrected xml", {
		hasXmlDeclaration,
		declaration: xmlDeclMatch?.groups?.declaration?.substring(0, 50)
	})

	// Step 2: Extract the root element with robust named capture groups
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

	const rootMatch = correctedXml.match(rootElementRegex)

	if (!rootMatch || !rootMatch.groups) {
		// Try to find ANY qti root element for better error reporting
		const anyQtiMatch = correctedXml.match(/<(?<anyRoot>qti-[a-z-]+)(?:\s+[^>]*)?>/)

		logger.error("robust extraction failed: corrected xml is not valid", {
			expectedRootTag: rootTag,
			foundRootTag: anyQtiMatch?.groups?.anyRoot,
			response: correctedXml.substring(0, 200),
			responseEnd: correctedXml.substring(correctedXml.length - 200)
		})
		throw errors.new(
			`invalid corrected xml output: expected ${rootTag} but ${anyQtiMatch?.groups?.anyRoot ? `found ${anyQtiMatch.groups.anyRoot}` : "found no valid QTI root element"}`
		)
	}

	// TypeScript now knows rootMatch.groups is defined
	const { content, rootTag: extractedRootTag, attributes } = rootMatch.groups

	// Step 3: Validate the content doesn't have truncated closing tags
	if (!content) {
		logger.error("corrected xml has no content", { rootTag })
		throw errors.new("invalid corrected xml output: empty content")
	}

	const truncatedTagMatch = content.match(/<\/(?:_|\s*>|\.\.\.)/)
	if (truncatedTagMatch) {
		const matchIndex = truncatedTagMatch.index ?? 0
		logger.error("detected truncated closing tag in corrected xml content", {
			truncatedTag: truncatedTagMatch[0],
			context: content.substring(Math.max(0, matchIndex - 50), Math.min(content.length, matchIndex + 50))
		})
		throw errors.new("invalid corrected xml output: contains truncated closing tags")
	}

	// Step 4: Reconstruct the complete XML with declaration if present
	const extractedXml = (
		(hasXmlDeclaration && xmlDeclMatch?.groups?.declaration ? xmlDeclMatch.groups.declaration : "") +
		rootMatch[0].trim()
	).trim()

	logger.debug("correction complete", {
		originalLength: invalidXml.length,
		correctedLength: extractedXml.length,
		lengthDiff: extractedXml.length - invalidXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return extractedXml
}
