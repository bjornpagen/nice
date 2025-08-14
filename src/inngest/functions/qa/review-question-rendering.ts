import * as errors from "@superbuilders/errors"
import { and, eq, isNotNull } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { db } from "@/db"
import { niceQuestionRenderReviews, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { createVisualQAPrompt } from "@/lib/qti-generation/structured/prompts"
import { uploadScreenshot } from "@/lib/utils/blob-storage"
import { analyzeScreenshotWithVision, type VisualQAResponse } from "@/lib/utils/openai-vision"
import { captureProductionQTIScreenshot } from "@/lib/utils/screenshot-capture"

// Temporary type definitions for TODO implementations
type ScreenshotBuffer = Buffer
type ScreenshotUrls = {
	productionUrl: string
	perseusUrl: string // placeholder for future use
}
type AIAnalysis = {
	summary: string
	maxSeverity: "major" | "minor" | "patch"
	rawResponse: VisualQAResponse
	issues: Array<{ category: string; severity: string; details: string }>
}

// Helper to handle Inngest Buffer serialization
function deserializeBuffer(bufferLike: ScreenshotBuffer | { type: string; data: number[] }): Buffer {
	if (Buffer.isBuffer(bufferLike)) {
		return bufferLike
	}

	// Validate the serialized buffer structure
	if (
		typeof bufferLike === "object" &&
		bufferLike !== null &&
		"type" in bufferLike &&
		"data" in bufferLike &&
		bufferLike.type === "Buffer" &&
		Array.isArray(bufferLike.data)
	) {
		return Buffer.from(bufferLike.data)
	}

	throw errors.new("invalid buffer format received from inngest step")
}

export const reviewQuestionRendering = inngest.createFunction(
	{
		id: "review-question-rendering",
		name: "Review Question Rendering Quality",
		concurrency: {
			limit: 3
		}
	},
	{
		event: "qa/question.review-rendering"
	},
	async ({ event, step, logger }) => {
		const { questionId } = event.data
		logger.info("starting visual qa review", { questionId })

		// Fetch question data (outside step.run as per project rules)
		logger.debug("fetching question data", { questionId })
		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					xml: niceQuestions.xml,
					sha: niceQuestions.sha,
					problemType: niceQuestions.problemType,
					parsedData: niceQuestions.parsedData
				})
				.from(niceQuestions)
				.where(and(eq(niceQuestions.id, questionId), isNotNull(niceQuestions.xml)))
				.limit(1)
		)
		if (questionResult.error) {
			logger.error("failed to fetch question data", { error: questionResult.error, questionId })
			throw errors.wrap(questionResult.error, "question data fetch")
		}

		if (questionResult.data.length === 0) {
			logger.error("question not found or has no xml", { questionId })
			throw new NonRetriableError(`Question ${questionId} not found or has no XML`)
		}

		const questionData = questionResult.data[0]
		if (!questionData) {
			logger.error("question data not found", { questionId })
			throw new NonRetriableError(`Question ${questionId} data not found`)
		}

		logger.debug("question data fetched", {
			questionId: questionData.id,
			hasXml: !!questionData.xml,
			hasParsedData: !!questionData.parsedData,
			problemType: questionData.problemType
		})

		// Step 1: Return question data for use in subsequent steps
		const question = await step.run("prepare-question-data", async () => {
			return questionData
		})

		// Step 2: Capture production QTI screenshot
		const productionScreenshot = await step.run(
			"capture-production-screenshot",
			async (): Promise<ScreenshotBuffer> => {
				logger.debug("capturing production qti screenshot", { questionId })

				const screenshotResult = await errors.try(captureProductionQTIScreenshot(questionId))

				if (screenshotResult.error) {
					logger.error("failed to capture production screenshot", {
						error: screenshotResult.error,
						questionId
					})
					throw errors.wrap(screenshotResult.error, "production screenshot capture")
				}

				logger.debug("production screenshot captured", {
					questionId,
					bufferSize: screenshotResult.data.length
				})

				return screenshotResult.data
			}
		)

		// Step 3: Capture Perseus ground truth screenshot
		// TODO: Re-enable when Perseus automation is stable
		// const perseusScreenshot = await step.run("capture-perseus-screenshot", async (): Promise<ScreenshotBuffer> => {
		// 	logger.debug("capturing perseus ground truth screenshot", { questionId })

		// 	const screenshotResult = await errors.try(capturePerseusScreenshot(questionId, question.parsedData))

		// 	if (screenshotResult.error) {
		// 		logger.error("failed to capture perseus screenshot", {
		// 			error: screenshotResult.error,
		// 			questionId
		// 		})
		// 		throw errors.wrap(screenshotResult.error, "perseus screenshot capture")
		// 	}

		// 	logger.debug("perseus screenshot captured", {
		// 		questionId,
		// 		bufferSize: screenshotResult.data.length
		// 	})

		// 	return screenshotResult.data
		// })

		// Perseus screenshot capture is disabled for now

		// Step 4: Upload production screenshot to Vercel Blob
		const screenshotUrls = await step.run("upload-production-screenshot", async (): Promise<ScreenshotUrls> => {
			logger.debug("uploading production screenshot to vercel blob", { questionId })

			// Convert serialized buffer back to Buffer object
			const productionBuffer = deserializeBuffer(productionScreenshot)

			const uploadResult = await errors.try(uploadScreenshot(questionId, "production", productionBuffer))

			if (uploadResult.error) {
				logger.error("failed to upload production screenshot to vercel blob", {
					error: uploadResult.error,
					questionId
				})
				throw errors.wrap(uploadResult.error, "production screenshot upload")
			}

			logger.debug("production screenshot uploaded successfully", {
				questionId,
				productionUrl: uploadResult.data
			})

			return {
				productionUrl: uploadResult.data,
				perseusUrl: "" // placeholder until perseus is re-enabled
			}
		})

		// Step 5: AI analysis with OpenAI Vision
		const analysis = await step.run("ai-analysis", async (): Promise<AIAnalysis> => {
			logger.debug("analyzing screenshots with ai", {
				questionId,
				productionUrl: screenshotUrls.productionUrl
			})

			// Create visual QA prompt
			const { systemInstruction, userContent } = createVisualQAPrompt(questionId, screenshotUrls.productionUrl)

			// Call OpenAI Vision API with structured outputs
			const visionResult = await errors.try(
				analyzeScreenshotWithVision(screenshotUrls.productionUrl, systemInstruction, userContent)
			)

			if (visionResult.error) {
				logger.error("failed to analyze screenshot with openai vision", {
					error: visionResult.error,
					questionId
				})
				throw errors.wrap(visionResult.error, "openai vision analysis")
			}

			const visionResponse = visionResult.data

			// Determine max severity from structured response
			const severities = visionResponse.issues.map((issue) => issue.severity)
			let maxSeverity: "major" | "minor" | "patch" = "patch"
			if (severities.includes("major")) {
				maxSeverity = "major"
			} else if (severities.includes("minor")) {
				maxSeverity = "minor"
			}

			logger.debug("ai analysis completed", {
				questionId,
				maxSeverity,
				issueCount: visionResponse.issues.length,
				summary: visionResponse.summary
			})

			return {
				summary: visionResponse.summary,
				maxSeverity,
				rawResponse: visionResponse,
				issues: visionResponse.issues
			}
		})

		// Step 6: Prepare analysis data for database upsert
		const analysisData = await step.run("prepare-analysis-data", async () => {
			return {
				questionId: question.id,
				analysisNotes: analysis.summary,
				severity: analysis.maxSeverity,
				model: "gpt-4o",
				raw: analysis.rawResponse,
				productionScreenshotUrl: screenshotUrls.productionUrl,
				perseusScreenshotUrl: screenshotUrls.perseusUrl,
				reviewedAt: new Date().toISOString()
			}
		})

		// Upsert analysis to database (outside step.run as per project rules)
		logger.debug("upserting analysis to database", { questionId })
		const upsertResult = await errors.try(
			db
				.insert(niceQuestionRenderReviews)
				.values(analysisData)
				.onConflictDoUpdate({
					target: niceQuestionRenderReviews.questionId,
					set: {
						analysisNotes: analysisData.analysisNotes,
						severity: analysisData.severity,
						model: analysisData.model,
						raw: analysisData.raw,
						productionScreenshotUrl: analysisData.productionScreenshotUrl,
						perseusScreenshotUrl: analysisData.perseusScreenshotUrl,
						reviewedAt: analysisData.reviewedAt
					}
				})
				.returning({ id: niceQuestionRenderReviews.questionId })
		)

		if (upsertResult.error) {
			logger.error("failed to upsert analysis", { error: upsertResult.error, questionId })
			throw errors.wrap(upsertResult.error, "analysis upsert")
		}

		const reviewResult = upsertResult.data[0]
		if (!reviewResult) {
			logger.error("failed to get review result after upsert", { questionId })
			throw errors.new("review result not returned after upsert")
		}

		logger.info("analysis upserted successfully", {
			questionId,
			severity: analysis.maxSeverity,
			issueCount: analysis.issues?.length || 0
		})

		logger.info("visual qa review completed", {
			questionId,
			reviewId: reviewResult.id,
			severity: analysis.maxSeverity
		})

		return {
			questionId,
			reviewId: reviewResult.id,
			severity: analysis.maxSeverity,
			issueCount: analysis.issues?.length || 0
		}
	}
)
