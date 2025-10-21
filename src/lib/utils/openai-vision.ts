import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod/v3"
import { env } from "@/env"

// Zod schema for visual QA analysis response
const VisualQAResponseSchema = z.object({
	summary: z.string().describe("Brief overall assessment of the production rendering quality"),
	issues: z.array(
		z.object({
			category: z.string().describe("Descriptive category name"),
			severity: z.enum(["major", "minor", "patch"]).describe("Issue severity level"),
			details: z.string().describe("Specific description of what's wrong and why it matters")
		})
	),
	recommendations: z.array(z.string()).describe("Actionable recommendations for fixing identified issues"),
	production_assessment: z.string().describe("Detailed analysis of what you observe in the production screenshot")
})

export type VisualQAResponse = z.infer<typeof VisualQAResponseSchema>

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
})

/**
 * Analyzes a screenshot using OpenAI Vision API with structured outputs
 */
export async function analyzeScreenshotWithVision(
	imageUrl: string,
	systemPrompt: string,
	userPrompt: string
): Promise<VisualQAResponse> {
	const completionResult = await errors.try(
		openai.chat.completions.parse({
			model: "gpt-5",
			messages: [
				{
					role: "system",
					content: systemPrompt
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: userPrompt
						},
						{
							type: "image_url",
							image_url: {
								url: imageUrl
							}
						}
					]
				}
			],
			response_format: zodResponseFormat(VisualQAResponseSchema, "visual_qa_analysis")
		})
	)

	if (completionResult.error) {
		logger.error("openai vision api request failed", { error: completionResult.error, imageUrl })
		throw errors.wrap(completionResult.error, "openai vision api request failed")
	}

	const completion = completionResult.data
	const message = completion.choices[0]?.message

	if (!message) {
		logger.error("no message in openai response", { imageUrl })
		throw errors.new("no message in openai response")
	}

	// Handle refusals
	if (message.refusal) {
		logger.error("openai refused request", { refusal: message.refusal, imageUrl })
		throw errors.new(`openai refused request: ${message.refusal}`)
	}

	// Get parsed response
	if (!message.parsed) {
		logger.error("no parsed response from openai", { imageUrl, message })
		throw errors.new("no parsed response from openai")
	}

	return message.parsed
}
