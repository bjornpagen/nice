import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateXmlForStimulus } from "@/lib/qti-generation/direct/stimulus-generator"
import { runValidationPipeline } from "@/lib/qti-validation"

// A global key to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = "openai-api-global-concurrency"

const MAX_CONVERSION_ATTEMPTS = 3

export const convertPerseusArticleToQtiStimulus = inngest.createFunction(
	{
		id: "convert-perseus-article-to-qti-stimulus",
		name: "Convert Perseus Article to QTI Stimulus",
		concurrency: {
			limit: 400,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	{ event: "qti/stimulus.migrate" },
	async ({ event, logger }) => {
		const { articleId } = event.data
		logger.info("starting article to qti stimulus conversion", { articleId })

		const articleResult = await errors.try(
			db.query.niceArticles.findFirst({
				where: eq(niceArticles.id, articleId),
				columns: { id: true, title: true, perseusContent: true }
			})
		)
		if (articleResult.error) {
			logger.error("failed to fetch article", { articleId, error: articleResult.error })
			throw errors.wrap(articleResult.error, "db query for article")
		}
		const article = articleResult.data
		if (!article?.perseusContent) {
			logger.warn("article has no perseus content, skipping", { articleId })
			return { success: true, qtiXml: null }
		}

		// Validation loop for stimulus generation
		let lastXml = ""
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= MAX_CONVERSION_ATTEMPTS; attempt++) {
			logger.info("starting qti stimulus conversion attempt", {
				articleId,
				attempt,
				maxAttempts: MAX_CONVERSION_ATTEMPTS
			})

			let regenerationContext: { flawedXml: string; errorReason: string } | undefined
			if (attempt > 1 && lastError) {
				regenerationContext = {
					flawedXml: lastXml,
					errorReason: lastError.message
				}
			}

			// 1. Generation Attempt (or Regeneration Attempt)
			const generationResult: Awaited<ReturnType<typeof errors.try<string>>> = await errors.try(
				generateXmlForStimulus(logger, article.perseusContent, article.title, regenerationContext)
			)

			if (generationResult.error) {
				lastError = generationResult.error
				lastXml = ""
				logger.error("xml generation/regeneration failed", {
					attempt,
					error: lastError,
					articleId
				})
				continue // Go to next attempt
			}
			const generatedXml = generationResult.data
			lastXml = generatedXml

			// 2. Full Validation Pass
			const validationResult = await runValidationPipeline(generatedXml, {
				id: article.id,
				rootTag: "qti-assessment-stimulus",
				title: article.title,
				logger,
				perseusContent: article.perseusContent
			})

			if (validationResult.isValid) {
				logger.info("xml generation and validation successful", {
					articleId,
					attempt
				})

				// Update database with the validated XML
				const updateResult = await errors.try(
					db.update(niceArticles).set({ xml: validationResult.xml }).where(eq(niceArticles.id, articleId))
				)
				if (updateResult.error) {
					logger.error("failed to update article with qti xml", {
						articleId,
						error: updateResult.error
					})
					throw errors.wrap(updateResult.error, "db update")
				}

				logger.info("successfully converted article and stored qti xml", { articleId })
				return { status: "success", articleId: article.id }
			}

			// 3. Handle any Validation Failure
			const combinedErrorMessages = validationResult.errors.map((e) => e.message).join("\n- ")
			lastError = errors.new(
				`Validation failed with ${validationResult.errors.length} errors:\n- ${combinedErrorMessages}`
			)

			logger.warn("xml validation failed, preparing for regeneration", {
				articleId,
				attempt,
				errorCount: validationResult.errors.length,
				firstError: validationResult.errors[0]?.message
			})

			if (attempt === MAX_CONVERSION_ATTEMPTS) {
				break
			}
		}

		// All attempts failed
		if (!lastError) {
			logger.error("CRITICAL: Conversion loop finished without a final error", { articleId })
			throw errors.new(
				`all ${MAX_CONVERSION_ATTEMPTS} attempts to convert perseus stimulus failed without a specific error`
			)
		}
		logger.error("all qti stimulus conversion attempts failed", { articleId, lastError })
		throw errors.wrap(lastError, `all ${MAX_CONVERSION_ATTEMPTS} attempts to convert perseus stimulus failed`)
	}
)
