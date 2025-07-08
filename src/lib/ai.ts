import { type GenerateContentRequest, GoogleGenerativeAI } from "@google/generative-ai"
import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import { loadConversionExamples } from "./qti-examples"

const GEMINI_MODEL = "gemini-2.5-pro"
const OPENAI_FIXER_MODEL = "o4-mini-high"
const MAX_RETRIES = 5
const INITIAL_BACKOFF_MS = 1000

const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY)
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const QtiCorrectionSchema = z.object({
	corrected_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Generates content using the Gemini API with a retry mechanism for rate limiting.
 * @param logger The logger instance.
 * @param request The generation request object.
 * @returns The generated content response.
 */
async function generateContentWithRetry(logger: logger.Logger, request: GenerateContentRequest) {
	let lastError: unknown
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const result = await errors.try(gemini.getGenerativeModel({ model: GEMINI_MODEL }).generateContent(request))

		if (result.error) {
			lastError = result.error
			const isRateLimitError = lastError instanceof Error && lastError.message.includes("429")

			if (!isRateLimitError) {
				logger.error("gemini api call failed with non-retriable error", { error: lastError })
				throw lastError
			}

			const delay = INITIAL_BACKOFF_MS * 2 ** attempt + Math.random() * 1000
			logger.warn("gemini api rate limited, retrying", {
				attempt: attempt + 1,
				delay: `${Math.round(delay / 1000)}s`
			})
			await sleep(delay)
			continue
		}

		return result.data
	}

	logger.error("gemini api call failed after all retries", { error: lastError })
	if (lastError instanceof Error) {
		throw errors.wrap(lastError, "gemini api call")
	}
	throw errors.new("gemini api call failed")
}

/**
 * Creates the structured prompt for the AI model to convert Perseus JSON to QTI XML,
 * including a rich set of few-shot examples.
 * @param perseusJsonString The stringified Perseus JSON data for the current conversion task.
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @returns The system instruction and user content for the AI prompt.
 */
export async function createQtiConversionPrompt(
	perseusJsonString: string,
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" }
) {
	const { type } = options
	const rootTag = type === "stimulus" ? "qti-assessment-stimulus" : "qti-assessment-item"

	const systemInstruction = `You are an expert XML generator for educational content. Your primary and most critical function is to convert a Perseus JSON object into a single, well-formed QTI 3.0 XML \`${rootTag}\`. Your output MUST be only the raw XML. The XML MUST be perfect and parseable. The most common and catastrophic failure is an incomplete or malformed closing tag. You are STRICTLY FORBIDDEN from using partial or lazy closing tags like \`</_>\` or \`</>\`. Every single XML element, such as \`<p>\`, must have a corresponding full closing tag, \`</p>\`. This rule is absolute and cannot be violated.`

	const examples = await loadConversionExamples({ type })

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
`
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
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	const { systemInstruction, userContent, rootTag } = await createQtiConversionPrompt(perseusJsonString, options)

	const result = await errors.try(
		generateContentWithRetry(logger, {
			contents: [{ role: "user", parts: [{ text: userContent }] }],
			systemInstruction: { role: "system", parts: [{ text: systemInstruction }] }
		})
	)
	if (result.error) {
		logger.error("failed to generate qti xml from perseus", { error: result.error })
		throw errors.wrap(result.error, "ai qti generation")
	}

	const response = result.data
	const responseText = response.response.text()
	if (!responseText) {
		logger.warn("gemini returned an empty response for qti conversion")
		throw errors.new("empty ai response")
	}

	// Clean the response to ensure it's only the XML content
	const xmlMatch = responseText.match(new RegExp(`<${rootTag}[\\s\\S]*?>[\\s\\S]*?<\\/${rootTag}>`))
	if (!xmlMatch?.[0]) {
		logger.error("ai response did not contain valid qti xml", { response: responseText, rootTag })
		throw errors.new("invalid ai xml output")
	}

	return xmlMatch[0]
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
	logger.debug("attempting to fix invalid qti xml", { rootTag, error: errorMessage })

	const userPrompt = `You are an expert XML developer specializing in the QTI 3.0 standard. You have been given a piece of XML that was rejected by an API, along with the API's error message. Your task is to analyze the XML and the error, fix the XML so that it is perfectly well-formed and valid according to the QTI 3.0 standard, and return the corrected XML.

# CONTEXT
<invalid_xml>
${invalidXml}
</invalid_xml>

<api_error_message>
${errorMessage}
</api_error_message>

# INSTRUCTIONS & RULES
1.  **Primary Goal: Fix the XML.** Your only job is to produce a valid, well-formed QTI 3.0 XML document.
2.  **Analyze the Error:** Use the <api_error_message> to diagnose the problem. Common issues include unclosed tags, incorrect attributes, or invalid structure.
3.  **Correct, Don't Invent:** Base your correction on the original <invalid_xml>. Do not add new content or change the meaning. The goal is to make the existing content valid.
4.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.** Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags like \`</_>\` are strictly forbidden. For example, \`<p>\` must be closed with \`</p>\`.
5.  **NO TRUNCATED OUTPUT.** Your response must be the complete XML file from start to finish, beginning with \`<?xml ...?>\` and ending with the final \`</${rootTag}>\` tag.
6.  **Return ONLY XML:** Your final output must be a single JSON object containing only the corrected XML string, as per the specified schema.

# FINAL OUTPUT
Return a single JSON object with the final corrected XML.
`

	const response = await errors.try(
		openai.chat.completions.create({
			model: OPENAI_FIXER_MODEL,
			messages: [{ role: "user", content: userPrompt }],
			response_format: zodResponseFormat(QtiCorrectionSchema, "qti_corrector")
		})
	)
	if (response.error) {
		logger.error("failed to fix qti xml", { error: response.error })
		throw errors.wrap(response.error, "qti xml correction")
	}

	const messageContent = response.data.choices[0]?.message.content
	if (!messageContent) {
		logger.error("qti xml correction returned no content")
		throw errors.new("qti xml correction returned no content")
	}

	const parsedResult = errors.trySync(() => JSON.parse(messageContent))
	if (parsedResult.error) {
		logger.error("failed to parse qti correction response", { error: parsedResult.error })
		throw errors.wrap(parsedResult.error, "parsing qti correction response")
	}

	const validationResult = QtiCorrectionSchema.safeParse(parsedResult.data)
	if (!validationResult.success) {
		logger.error("qti correction response validation failed", { error: validationResult.error })
		throw errors.wrap(validationResult.error, "qti correction response validation")
	}

	logger.info("successfully corrected qti xml", { rootTag })
	return validationResult.data.corrected_xml
}
