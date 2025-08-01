import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { env } from "@/env"
import { produceQtiQualityReviewPrompt, QtiReviewResultSchema } from "@/lib/ai/prompts/qti-quality-review"

const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
})

export interface QtiSourceContext {
	khanId: string
	exerciseId: string | null
	exerciseSlug: string | null
	exerciseTitle: string | null
}

export interface QualityAnalysisFindings {
	overallQuality: "excellent" | "good" | "needs_improvement" | "poor"
	issuesFound: Array<{
		category: string
		severity: string
		description: string
	}>
}

export interface ModificationSummary {
	type: string
	description: string
}

export interface QtiReviewResult {
	originalXml: string
	improvedXml: string
	analysisFindings: QualityAnalysisFindings | null
	modificationsApplied: ModificationSummary[]
	requiresRegeneration: boolean
}

export async function reviewAndImproveQtiQuestions(
	generatedXmls: string[],
	sourceContext: QtiSourceContext
): Promise<QtiReviewResult[]> {
	logger.info("starting ai quality review for batch", {
		khanId: sourceContext.khanId,
		batchSize: generatedXmls.length
	})

	const reviewPromises = generatedXmls.map(async (xml, index) => {
		const reviewResult = await errors.try(reviewSingleQti(xml, sourceContext))

		if (reviewResult.error) {
			logger.error("ai quality review for a single item failed, returning original xml", {
				error: reviewResult.error,
				khanId: sourceContext.khanId,
				variationIndex: index
			})
			// On failure, fall back to the original XML to not lose the generation
			return {
				originalXml: xml,
				improvedXml: xml,
				analysisFindings: {
					overallQuality: "poor" as const,
					issuesFound: [{ category: "ReviewFailure", severity: "critical", description: reviewResult.error.message }]
				},
				modificationsApplied: [],
				requiresRegeneration: true
			}
		}

		logger.debug("ai quality review completed for variation", {
			khanId: sourceContext.khanId,
			variationIndex: index,
			overallQuality: reviewResult.data.analysisFindings?.overallQuality,
			modificationsCount: reviewResult.data.modificationsApplied.length
		})

		return reviewResult.data
	})

	const results = await Promise.all(reviewPromises)

	logger.info("completed ai quality review for batch", {
		khanId: sourceContext.khanId,
		batchSize: results.length,
		qualityRatings: results.map((r) => r.analysisFindings?.overallQuality),
		totalModifications: results.reduce((sum, r) => sum + r.modificationsApplied.length, 0)
	})

	return results
}

async function reviewSingleQti(xml: string, sourceContext: QtiSourceContext): Promise<QtiReviewResult> {
	const { systemInstruction, userContent } = await produceQtiQualityReviewPrompt(xml, sourceContext)

	logger.debug("sending qti xml to ai quality reviewer", {
		khanId: sourceContext.khanId,
		xmlLength: xml.length,
		model: "o3"
	})

	const response = await openai.chat.completions.parse({
		model: "o3",
		messages: [
			{ role: "system", content: systemInstruction },
			{ role: "user", content: userContent }
		],
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "qti_quality_review",
				schema: {
					type: "object",
					properties: {
						analysis: {
							type: "object",
							properties: {
								overallQuality: { type: "string", enum: ["excellent", "good", "needs_improvement", "poor"] },
								issuesFound: {
									type: "array",
									items: {
										type: "object",
										properties: {
											category: { type: "string" },
											severity: { type: "string" },
											description: { type: "string" }
										},
										required: ["category", "severity", "description"]
									}
								}
							},
							required: ["overallQuality", "issuesFound"]
						},
						improvements: {
							type: "object",
							properties: {
								modificationsApplied: {
									type: "array",
									items: {
										type: "object",
										properties: {
											type: { type: "string" },
											description: { type: "string" }
										},
										required: ["type", "description"]
									}
								},
								improvedXml: { type: "string" }
							},
							required: ["modificationsApplied", "improvedXml"]
						},
						requiresRegeneration: { type: "boolean" }
					},
					required: ["analysis", "improvements", "requiresRegeneration"]
				}
			}
		}
	})

	const parsed = response.choices[0]?.message.parsed
	if (!parsed) {
		throw errors.new("ai quality review: no parsed content returned from openai")
	}

	const validation = QtiReviewResultSchema.safeParse(parsed)
	if (!validation.success) {
		logger.error("ai quality review response validation failed", {
			khanId: sourceContext.khanId,
			validationErrors: validation.error.errors,
			rawResponse: parsed
		})
		throw errors.wrap(validation.error, "ai quality review: openai response failed schema validation")
	}

	const reviewData = validation.data

	logger.debug("ai quality review response validated successfully", {
		khanId: sourceContext.khanId,
		overallQuality: reviewData.analysis.overallQuality,
		issuesFound: reviewData.analysis.issuesFound.length,
		modificationsApplied: reviewData.improvements.modificationsApplied.length,
		requiresRegeneration: reviewData.requiresRegeneration
	})

	return {
		originalXml: xml,
		improvedXml: reviewData.improvements.improvedXml,
		analysisFindings: reviewData.analysis,
		modificationsApplied: reviewData.improvements.modificationsApplied,
		requiresRegeneration: reviewData.requiresRegeneration
	}
}
