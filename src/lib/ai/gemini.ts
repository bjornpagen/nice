import { type Content, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory, SchemaType } from "@google/generative-ai"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"
import { produceQtiVariationsPrompt } from "@/lib/ai/prompts/qti-differentiation"
import { produceQtiParaphrasingPrompt } from "@/lib/ai/prompts/qti-paraphrasing"

const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY)

// Zod schema for validating the expected output from the Gemini API
const QtiVariationsOutputSchema = z.object({
	differentiatedQuestions: z.array(z.string().min(1)).min(1)
})

// ✅ ADD: New Zod schema for the paraphrasing output
const QtiParaphrasingOutputSchema = z.object({
	paraphrasedStimulus: z.string().min(1)
})

/**
 * Generates variations of a QTI assessment item using the Gemini AI model.
 *
 * @param sourceQtiXml The original QTI XML string.
 * @param numberOfVariations The number of new question variations to generate.
 * @returns A promise that resolves to an array of generated QTI XML strings.
 */
export async function generateQtiVariations(sourceQtiXml: string, numberOfVariations: number): Promise<string[]> {
	logger.info("generating qti variations", { numberOfVariations })

	const { developer, user } = produceQtiVariationsPrompt(sourceQtiXml, numberOfVariations)

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
						differentiatedQuestions: {
							type: SchemaType.ARRAY,
							items: {
								type: SchemaType.STRING
							}
						}
					},
					required: ["differentiatedQuestions"]
				}
			},
			safetySettings
		})
	)

	if (result.error) {
		logger.error("gemini api call for qti differentiation failed", { error: result.error })
		throw errors.wrap(result.error, "gemini api call")
	}

	const responseText = result.data.response.text()
	if (!responseText) {
		logger.error("gemini returned an empty response for qti differentiation")
		throw errors.new("gemini returned an empty response")
	}

	const parsedResult = errors.trySync(() => JSON.parse(responseText))
	if (parsedResult.error) {
		logger.error("failed to parse gemini json response for qti", {
			error: parsedResult.error,
			responseText
		})
		throw errors.wrap(parsedResult.error, "parsing gemini response for qti")
	}

	const validationResult = QtiVariationsOutputSchema.safeParse(parsedResult.data)
	if (!validationResult.success) {
		logger.error("gemini response for qti did not match expected schema", {
			error: validationResult.error,
			parsedData: parsedResult.data
		})
		throw errors.wrap(validationResult.error, "gemini qti response validation failed")
	}

	logger.info("successfully generated and validated qti variations", {
		count: validationResult.data.differentiatedQuestions.length
	})

	return validationResult.data.differentiatedQuestions
}

/**
 * Paraphrases a QTI assessment stimulus using the Gemini AI model.
 *
 * @param sourceQtiXml The original QTI stimulus XML string.
 * @returns A promise that resolves to a single string containing the paraphrased QTI XML.
 */
export async function paraphraseQtiStimulus(sourceQtiXml: string): Promise<string> {
	logger.info("paraphrasing qti stimulus")

	const { developer, user } = produceQtiParaphrasingPrompt(sourceQtiXml)

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
		logger.error("gemini api call for qti paraphrasing failed", { error: result.error })
		throw errors.wrap(result.error, "gemini api call")
	}

	const responseText = result.data.response.text()
	if (!responseText) {
		logger.error("gemini returned an empty response for qti paraphrasing")
		throw errors.new("gemini returned an empty response")
	}

	const parsedResult = errors.trySync(() => JSON.parse(responseText))
	if (parsedResult.error) {
		logger.error("failed to parse gemini json response for qti", {
			error: parsedResult.error,
			responseText
		})
		throw errors.wrap(parsedResult.error, "parsing gemini response for qti")
	}

	const validationResult = QtiParaphrasingOutputSchema.safeParse(parsedResult.data)
	if (!validationResult.success) {
		logger.error("gemini response for qti paraphrasing did not match expected schema", {
			error: validationResult.error,
			parsedData: parsedResult.data
		})
		throw errors.wrap(validationResult.error, "gemini qti paraphrasing response validation failed")
	}

	logger.info("successfully generated and validated paraphrased qti stimulus")

	return validationResult.data.paraphrasedStimulus
}
