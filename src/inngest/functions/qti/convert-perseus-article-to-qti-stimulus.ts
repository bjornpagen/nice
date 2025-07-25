import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { qti } from "@/lib/clients"

// REMOVED: The `upsertStimulus` helper function is no longer needed for validation.

const PerseusContentSectionSchema = z.object({
	content: z.string().default(""),
	images: z.record(z.any()).default({}),
	widgets: z
		.record(
			z
				.object({
					type: z.string().optional()
				})
				.passthrough()
		)
		.default({})
})

const PerseusContentSchema = z.array(PerseusContentSectionSchema)

export const convertPerseusArticleToQtiStimulus = inngest.createFunction(
	{
		id: "convert-perseus-article-to-qti-stimulus",
		name: "Convert Perseus Article to QTI Stimulus",
		concurrency: {
			// Limit to 5 concurrent executions, shared across all OpenAI functions account-wide.
			// This global limit prevents rate-limiting from the OpenAI API.
			limit: 160,
			key: '"openai-api-global-concurrency"'
		}
	},
	{ event: "qti/stimulus.migrate" },
	async ({ event, step, logger }) => {
		const { articleId } = event.data
		logger.info("starting article to qti stimulus validation", { articleId })

		// Step 1: Fetch article data from DB (Read-only)
		const articleResult = await errors.try(
			db
				.select({
					id: niceArticles.id,
					title: niceArticles.title,
					slug: niceArticles.slug,
					path: niceArticles.path,
					perseusContent: niceArticles.perseusContent
				})
				.from(niceArticles)
				.where(eq(niceArticles.id, articleId))
				.limit(1)
		)
		if (articleResult.error) {
			logger.error("failed to fetch article from db", { articleId, error: articleResult.error })
			throw errors.wrap(articleResult.error, "db query")
		}
		const article = articleResult.data[0]
		if (!article || !article.perseusContent) {
			logger.warn("article not found or has no perseus content", { articleId })
			return { status: "aborted", reason: "not_found_or_no_data" }
		}

		// Step 2: Pre-process the Perseus content to remove interactive widgets
		const stimulusOnlyPerseusContent = await step.run("preprocess-perseus-content", async () => {
			const validationResult = PerseusContentSchema.safeParse(article.perseusContent)
			if (!validationResult.success) {
				throw errors.wrap(validationResult.error, "invalid perseus content structure")
			}

			const processedContent = validationResult.data.map((section) => {
				// Check if this section contains an interactive widget set
				const hasGradedGroup = Object.values(section.widgets).some((widget) => widget.type === "graded-group-set")

				if (hasGradedGroup) {
					// Replace the widget placeholder with empty string and remove the widget data.
					return {
						...section,
						content: section.content.replace(/\[\[☃ graded-group-set \d+\]\]/g, ""),
						widgets: {} // Remove all widgets from this section
					}
				}
				// If no interactive widgets, return the section as is.
				return section
			})

			return processedContent
		})

		// Step 3: Convert the sanitized Perseus JSON to QTI XML via AI
		const qtiXml = await step.run("generate-qti-stimulus-from-perseus", async () => {
			const result = await errors.try(generateQtiFromPerseus(logger, stimulusOnlyPerseusContent, { type: "stimulus" }))
			if (result.error) {
				logger.error("failed to generate qti stimulus from perseus", { articleId, error: result.error })
				throw errors.wrap(result.error, "ai conversion")
			}
			return result.data
		})

		// Step 4: Validate XML using the dedicated QTI validateXml method
		const validatedXml = await step.run("validate-with-qti-api", async () => {
			let finalXml = qtiXml
			const validationResult = await errors.try(qti.validateXml({ xml: finalXml, schema: "stimulus" }))

			if (validationResult.error) {
				// API call failed - this is a critical error
				logger.error("qti validation api call failed", {
					articleId,
					error: validationResult.error
				})
				throw errors.wrap(validationResult.error, "qti validation api call")
			}

			if (!validationResult.data.success) {
				// Validation failed with specific errors
				const errorMessage = validationResult.data.validationErrors.join("\n")

				logger.warn("initial validation failed, attempting correction", {
					articleId,
					error: errorMessage
				})

				const fixResult = await errors.try(
					fixInvalidQtiXml(logger, {
						invalidXml: finalXml,
						errorMessage: errorMessage,
						rootTag: "qti-assessment-stimulus"
					})
				)
				if (fixResult.error) {
					logger.error("failed to fix invalid qti xml", { articleId, error: fixResult.error })
					throw errors.wrap(fixResult.error, "ai xml correction")
				}
				finalXml = fixResult.data

				const secondValidationResult = await errors.try(qti.validateXml({ xml: finalXml, schema: "stimulus" }))
				if (secondValidationResult.error) {
					// API call failed on second attempt - critical error
					logger.error("second qti validation api call failed", {
						articleId,
						error: secondValidationResult.error
					})
					throw errors.wrap(secondValidationResult.error, "second qti validation api call")
				}

				if (!secondValidationResult.data.success) {
					// Second validation failed with specific errors
					const secondErrorMessage = secondValidationResult.data.validationErrors.join("\n")
					logger.error("second qti validation attempt failed after correction", {
						articleId,
						error: secondErrorMessage
					})
					throw errors.new(`qti validation failed after ai correction: ${secondErrorMessage}`)
				}
			}

			return finalXml
		})

		logger.info("successfully validated qti stimulus", { articleId })

		// Step 5: Write the validated XML to the database.
		const updateResult = await errors.try(
			db.update(niceArticles).set({ xml: validatedXml }).where(eq(niceArticles.id, articleId))
		)

		if (updateResult.error) {
			logger.error("failed to update article with qti xml", { articleId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("successfully stored qti xml in database", { articleId })
		return { status: "success", articleId: article.id }
	}
)
