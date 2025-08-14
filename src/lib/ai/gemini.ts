import { type Content, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, SchemaType } from "@google/generative-ai"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"
import { produceQtiParaphrasingPrompt } from "@/lib/ai/prompts/qti-paraphrasing"

const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY)

// ✅ ADD: New Zod schema for the paraphrasing output
const QtiParaphrasingOutputSchema = z.object({
	paraphrasedStimulus: z.string().min(1)
})

// Retry configuration
const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelayMs: 1000,
	maxDelayMs: 10000
}

/**
 * Custom error types for better retry logic
 */
const ErrGeminiParsing = errors.new("gemini parsing failed")
const ErrGeminiValidation = errors.new("gemini validation failed")
const ErrGeminiEmpty = errors.new("gemini returned empty response")

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false
	}

	return (
		errors.is(error, ErrGeminiParsing) ||
		errors.is(error, ErrGeminiValidation) ||
		errors.is(error, ErrGeminiEmpty) ||
		error.message.includes("quota") ||
		error.message.includes("rate limit") ||
		error.message.includes("timeout") ||
		error.message.includes("network")
	)
}

/**
 * Sleeps for the specified duration with exponential backoff
 */
async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculates delay for exponential backoff
 */
function calculateDelay(attempt: number): number {
	const delay = RETRY_CONFIG.baseDelayMs * 2 ** attempt
	return Math.min(delay, RETRY_CONFIG.maxDelayMs)
}

/**
 * Single attempt to paraphrase QTI stimulus (extracted for retry logic)
 */
async function attemptQtiStimulusParaphrasing(sourceQtiXml: string, attempt: number): Promise<string> {
	const { developer, user } = await produceQtiParaphrasingPrompt(sourceQtiXml)

	const model = gemini.getGenerativeModel({
		model: "gemini-1.5-flash",
		systemInstruction: developer
	})

	const contents: Content[] = [{ role: "user", parts: [{ text: user }] }]

	const safetySettings = [
		{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
		{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
		{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
		{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
	]

	const result = await errors.try(
		model.generateContent({
			contents,
			generationConfig: {
				responseMimeType: "application/json",
				responseSchema: {
					type: SchemaType.OBJECT,
					properties: {
						paraphrasedStimulus: {
							type: SchemaType.STRING
						}
					},
					required: ["paraphrasedStimulus"]
				}
			},
			safetySettings
		})
	)

	if (result.error) {
		logger.error("gemini api call for qti paraphrasing failed", { error: result.error, attempt })
		throw errors.wrap(result.error, "gemini api call")
	}

	const responseText = result.data.response.text()
	if (!responseText) {
		logger.error("gemini returned an empty response for qti paraphrasing", { attempt })
		throw errors.wrap(ErrGeminiEmpty, "empty response from gemini")
	}

	const parsedResult = errors.trySync(() => JSON.parse(responseText))
	if (parsedResult.error) {
		logger.error("failed to parse gemini json response for qti", {
			error: parsedResult.error,
			responseText: responseText.substring(0, 500), // Log first 500 chars only
			attempt
		})
		throw errors.wrap(ErrGeminiParsing, "parsing gemini response for qti")
	}

	const validationResult = QtiParaphrasingOutputSchema.safeParse(parsedResult.data)
	if (!validationResult.success) {
		logger.error("gemini response for qti paraphrasing did not match expected schema", {
			error: validationResult.error,
			parsedData: parsedResult.data,
			attempt
		})
		throw errors.wrap(ErrGeminiValidation, "gemini qti paraphrasing response validation failed")
	}

	logger.info("successfully generated and validated paraphrased qti stimulus", {
		attempt: attempt + 1
	})

	return validationResult.data.paraphrasedStimulus
}

/**
 * Paraphrases a QTI assessment stimulus using the Gemini AI model with retry logic.
 *
 * @param sourceQtiXml The original QTI stimulus XML string.
 * @returns A promise that resolves to a single string containing the paraphrased QTI XML.
 */
export async function paraphraseQtiStimulus(sourceQtiXml: string): Promise<string> {
	logger.info("paraphrasing qti stimulus")

	for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
		const result = await errors.try(attemptQtiStimulusParaphrasing(sourceQtiXml, attempt))

		if (result.error) {
			const isLastAttempt = attempt === RETRY_CONFIG.maxRetries
			const shouldRetry = isRetryableError(result.error)

			if (isLastAttempt || !shouldRetry) {
				logger.error("failed to paraphrase qti stimulus after all retries", {
					error: result.error,
					attempt: attempt + 1,
					shouldRetry,
					isLastAttempt
				})
				throw result.error
			}

			const delayMs = calculateDelay(attempt)
			logger.warn("retrying qti stimulus paraphrasing after error", {
				error: result.error,
				attempt: attempt + 1,
				retryAfterMs: delayMs
			})
			await sleep(delayMs)
			continue
		}

		return result.data
	}

	// This should never be reached due to the throw in the error handling above
	logger.error("unexpected end of retry loop")
	throw errors.new("unexpected end of retry loop")
}
