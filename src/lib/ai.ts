import { type GenerateContentRequest, GoogleGenerativeAI } from "@google/generative-ai"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { loadConversionExamples } from "./qti-examples"

const GEMINI_MODEL = "gemini-2.5-pro"
const MAX_RETRIES = 5
const INITIAL_BACKOFF_MS = 1000

const ai = new GoogleGenerativeAI(env.GEMINI_API_KEY)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Generates content using the Gemini API with a retry mechanism for rate limiting.
 * @param request The generation request object.
 * @returns The generated content response.
 */
async function generateContentWithRetry(request: GenerateContentRequest) {
	let lastError: unknown
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const result = await errors.try(ai.getGenerativeModel({ model: GEMINI_MODEL }).generateContent(request))

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
 * @returns The system instruction and user content for the AI prompt.
 */
export async function createQtiConversionPrompt(perseusJsonString: string) {
	const systemInstruction =
		"You are an expert in educational content standards. Your task is to convert a Perseus JSON object into a valid QTI 3.0 XML `assessmentItem`. You MUST return ONLY the raw XML content, without any extra text, explanations, or markdown formatting. The output MUST be well-formed, valid XML that can be parsed without errors - ensure all tags are properly closed, attributes are quoted, and special characters are escaped. The examples provided are PERFECT outputs - study them carefully and match their structure, formatting, and patterns exactly."

	const examples = await loadConversionExamples()

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
below is a perseus json. please give me the corresponding qti 3.0 xml, using the above examples to inform the exact xml output. respond with only the corresponding qti 3.0 xml.

PAY VERY CLOSE ATTENTION TO THE EXAMPLES ABOVE - they are all examples of PERFECT output. Study their structure, formatting, and patterns carefully. Your output should match their quality and style exactly.

CRITICAL REQUIREMENTS:
1. Output MUST be valid, well-formed XML:
   - All tags must be properly closed
   - All attributes must be quoted
   - Special characters (<, >, &, ", ') must be properly escaped as XML entities
   - The XML must parse without any errors
2. NEVER place MathML or any complex markup within <qti-correct-response> tags
3. Correct responses must ALWAYS be simple values that users can actually input:
   - For multiple choice: use simple identifiers like "A", "B", "C", "D"
   - For numeric input that requires exact answers: use fractions like "5/81", "1/2", "7/4" (NEVER decimals like "0.0617" or "3.14")
   - For integer answers: use plain integers like "5", "-9", "42"
   - For text input: use plain text strings
4. When Perseus JSON shows answerForms as ["proper", "improper"], the response MUST be a fraction, not a decimal
5. MathML should only appear in:
   - Question prompts and content
   - Answer choice labels (within <qti-simple-choice>)
   - Feedback messages
   - But NEVER in the actual correct response values

Remember: Users must be able to type or select the correct answer - they cannot input MathML markup!
ABSOLUTELY CRITICAL: The output MUST be parseable XML. Invalid XML will cause the entire conversion to fail.

FINAL REMINDER: The examples above demonstrate PERFECT QTI 3.0 XML output. Follow their patterns exactly. Match their formatting, structure, and style precisely.
</instructions>

<perseus_json>
${perseusJsonString}
</perseus_json>
`
	return { systemInstruction, userContent }
}

/**
 * Converts a Perseus JSON object into a QTI 3.0 XML string using the Gemini AI model.
 * @param perseusData The Perseus question data as a JavaScript object.
 * @returns A promise that resolves to the QTI XML string.
 */
export async function generateQtiFromPerseus(perseusData: unknown): Promise<string> {
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	const { systemInstruction, userContent } = await createQtiConversionPrompt(perseusJsonString)

	const result = await errors.try(
		generateContentWithRetry({
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
	const xmlMatch = responseText.match(/<qti-assessment-item[\s\S]*?>[\s\S]*?<\/qti-assessment-item>/)
	if (!xmlMatch?.[0]) {
		logger.error("ai response did not contain valid qti xml", { response: responseText })
		throw errors.new("invalid ai xml output")
	}

	return xmlMatch[0]
}
