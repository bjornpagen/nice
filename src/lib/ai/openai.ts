import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { z } from "zod"
import { env } from "@/env"
import { produceQtiVariationsPrompt } from "@/lib/ai/prompts/qti-differentiation"
import { produceQtiParaphrasingPrompt } from "@/lib/ai/prompts/qti-paraphrasing"

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
})

// Zod schema for validating the expected output from the OpenAI API
const QtiVariationsOutputSchema = z.object({
	differentiatedQuestions: z.array(z.string().min(1)).min(1)
})

// Zod schema for the paraphrasing output
const QtiParaphrasingOutputSchema = z.object({
	paraphrasedStimulus: z.string().min(1)
})

// Retry configuration - more aggressive since o3 has better rate limits
const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelayMs: 500, // Shorter delays due to better rate limits
	maxDelayMs: 5000
}

/**
 * Custom error types for better retry logic
 */
const ErrOpenAIParsing = errors.new("openai parsing failed")
const ErrOpenAIValidation = errors.new("openai validation failed")
const ErrOpenAIEmpty = errors.new("openai returned empty response")

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false
	}

	return (
		errors.is(error, ErrOpenAIParsing) ||
		errors.is(error, ErrOpenAIValidation) ||
		errors.is(error, ErrOpenAIEmpty) ||
		error.message.includes("rate_limit") ||
		error.message.includes("timeout") ||
		error.message.includes("network") ||
		error.message.includes("502") ||
		error.message.includes("503") ||
		error.message.includes("504")
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
 * Single attempt to generate QTI variations using OpenAI o3
 */
async function attemptQtiVariationGeneration(
	sourceQtiXml: string,
	numberOfVariations: number,
	khanId: string,
	attempt: number,
	startingIndex = 1
): Promise<string[]> {
	const { developer, user } = produceQtiVariationsPrompt(sourceQtiXml, numberOfVariations, khanId, startingIndex)

	const result = await errors.try(
		openai.chat.completions.create({
			model: "o3-mini", // Using o3-mini for better cost/performance balance
			messages: [
				{
					role: "system",
					content: developer
				},
				{
					role: "user",
					content: user
				}
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "qti_variations",
					schema: {
						type: "object",
						properties: {
							differentiatedQuestions: {
								type: "array",
								items: {
									type: "string"
								}
							}
						},
						required: ["differentiatedQuestions"],
						additionalProperties: false
					}
				}
			}
			// ✅ REMOVED: o3 models only support default temperature (1.0)
			// ✅ REMOVED: max_completion_tokens to allow unrestricted output
		})
	)

	if (result.error) {
		logger.error("openai api call for qti differentiation failed", { error: result.error, attempt })
		throw errors.wrap(result.error, "openai api call")
	}

	const responseContent = result.data.choices[0]?.message?.content
	if (!responseContent) {
		logger.error("openai returned an empty response for qti differentiation", { attempt })
		throw errors.wrap(ErrOpenAIEmpty, "empty response from openai")
	}

	const parsedResult = errors.trySync(() => JSON.parse(responseContent))
	if (parsedResult.error) {
		logger.error("failed to parse openai json response for qti", {
			error: parsedResult.error,
			responseText: responseContent.substring(0, 500), // Log first 500 chars only
			attempt
		})
		throw errors.wrap(ErrOpenAIParsing, "parsing openai response for qti")
	}

	const validationResult = QtiVariationsOutputSchema.safeParse(parsedResult.data)
	if (!validationResult.success) {
		logger.error("openai response for qti did not match expected schema", {
			error: validationResult.error,
			parsedData: parsedResult.data,
			attempt
		})
		throw errors.wrap(ErrOpenAIValidation, "openai qti response validation failed")
	}

	logger.info("successfully generated and validated qti variations", {
		count: validationResult.data.differentiatedQuestions.length,
		attempt: attempt + 1
	})

	return validationResult.data.differentiatedQuestions
}

/**
 * Single attempt to paraphrase QTI stimulus using OpenAI o3
 */
async function attemptQtiStimulusParaphrasing(sourceQtiXml: string, attempt: number): Promise<string> {
	const { developer, user } = produceQtiParaphrasingPrompt(sourceQtiXml)

	const result = await errors.try(
		openai.chat.completions.create({
			model: "o3",
			messages: [
				{
					role: "system",
					content: developer
				},
				{
					role: "user",
					content: user
				}
			],
			response_format: {
				type: "json_schema",
				json_schema: {
					name: "qti_paraphrasing",
					schema: {
						type: "object",
						properties: {
							paraphrasedStimulus: {
								type: "string"
							}
						},
						required: ["paraphrasedStimulus"],
						additionalProperties: false
					}
				}
			}
			// ✅ REMOVED: o3 models only support default temperature (1.0)
			// ✅ REMOVED: max_completion_tokens to allow unrestricted output
		})
	)

	if (result.error) {
		logger.error("openai api call for qti paraphrasing failed", { error: result.error, attempt })
		throw errors.wrap(result.error, "openai api call")
	}

	const responseContent = result.data.choices[0]?.message?.content
	if (!responseContent) {
		logger.error("openai returned an empty response for qti paraphrasing", { attempt })
		throw errors.wrap(ErrOpenAIEmpty, "empty response from openai")
	}

	const parsedResult = errors.trySync(() => JSON.parse(responseContent))
	if (parsedResult.error) {
		logger.error("failed to parse openai json response for qti", {
			error: parsedResult.error,
			responseText: responseContent.substring(0, 500), // Log first 500 chars only
			attempt
		})
		throw errors.wrap(ErrOpenAIParsing, "parsing openai response for qti")
	}

	const validationResult = QtiParaphrasingOutputSchema.safeParse(parsedResult.data)
	if (!validationResult.success) {
		logger.error("openai response for qti paraphrasing did not match expected schema", {
			error: validationResult.error,
			parsedData: parsedResult.data,
			attempt
		})
		throw errors.wrap(ErrOpenAIValidation, "openai qti paraphrasing response validation failed")
	}

	logger.info("successfully generated and validated paraphrased qti stimulus", {
		attempt: attempt + 1
	})

	return validationResult.data.paraphrasedStimulus
}

/**
 * Generates variations of a QTI assessment item using OpenAI o3 with retry logic.
 *
 * This function has the same signature as the Gemini version for drop-in replacement.
 *
 * @param sourceQtiXml The original QTI XML string.
 * @param numberOfVariations The number of new question variations to generate.
 * @param khanId The original Khan Academy question ID for identifier generation.
 * @param startingIndex The starting index for ID generation (default: 1).
 * @returns A promise that resolves to an array of generated QTI XML strings.
 */
export async function generateQtiVariations(
	sourceQtiXml: string,
	numberOfVariations: number,
	khanId: string,
	startingIndex = 1
): Promise<string[]> {
	logger.info("generating qti variations with openai o3", { numberOfVariations, khanId, startingIndex })

	for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
		const result = await errors.try(
			attemptQtiVariationGeneration(sourceQtiXml, numberOfVariations, khanId, attempt, startingIndex)
		)

		if (result.error) {
			const isLastAttempt = attempt === RETRY_CONFIG.maxRetries
			const shouldRetry = isRetryableError(result.error)

			if (isLastAttempt || !shouldRetry) {
				logger.error("failed to generate qti variations after all retries", {
					error: result.error,
					khanId,
					startingIndex,
					attempt: attempt + 1,
					shouldRetry,
					isLastAttempt
				})
				throw result.error
			}

			const delayMs = calculateDelay(attempt)
			logger.warn("retrying qti variation generation after error", {
				error: result.error,
				khanId,
				startingIndex,
				attempt: attempt + 1,
				retryAfterMs: delayMs
			})
			await sleep(delayMs)
			continue
		}

		return result.data
	}

	// This should never be reached due to the throw in the error handling above
	throw errors.new("unexpected end of retry loop")
}

/**
 * Paraphrases a QTI assessment stimulus using OpenAI o3 with retry logic.
 *
 * This function has the same signature as the Gemini version for drop-in replacement.
 *
 * @param sourceQtiXml The original QTI stimulus XML string.
 * @returns A promise that resolves to a single string containing the paraphrased QTI XML.
 */
export async function paraphraseQtiStimulus(sourceQtiXml: string): Promise<string> {
	logger.info("paraphrasing qti stimulus with openai o3")

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
	throw errors.new("unexpected end of retry loop")
}
