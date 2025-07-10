import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { qti } from "@/lib/clients"
import { ErrQtiInternalServerError, ErrQtiNotFound, ErrQtiUnprocessable } from "@/lib/qti"

// Helper function to encapsulate the idempotent upsert logic.
async function upsertStimulus(identifier: string, title: string, content: string): Promise<string> {
	const updateResult = await errors.try(
		qti.updateStimulus(identifier, {
			identifier,
			title,
			content
		})
	)
	if (updateResult.error) {
		// Use errors.is for type-safe error checking
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(
				qti.createStimulus({
					identifier,
					title,
					content
				})
			)
			if (createResult.error) {
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return content
		}
		// For other errors, re-throw to be handled by the caller.
		throw updateResult.error
	}
	return content
}

export const convertPerseusArticleToQtiStimulus = inngest.createFunction(
	{
		id: "convert-perseus-article-to-qti-stimulus",
		name: "Convert Perseus Article to QTI Stimulus",
		concurrency: {
			// Limit to 5 concurrent executions, shared across all Gemini functions account-wide.
			// This global limit prevents rate-limiting from the Gemini API.
			limit: 5,
			key: '"gemini-api-global-concurrency"'
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

		// Step 2: Convert Perseus JSON to QTI XML via AI
		const qtiXml = await step.run("generate-qti-stimulus-from-perseus", async () => {
			const result = await errors.try(generateQtiFromPerseus(logger, article.perseusContent, { type: "stimulus" }))
			if (result.error) {
				logger.error("failed to generate qti stimulus from perseus", { articleId, error: result.error })
				throw errors.wrap(result.error, "ai conversion")
			}
			return result.data
		})

		const tempIdentifier = `nice-tmp:${article.id}`

		// Step 3: Validate XML by creating and immediately deleting it from the QTI API
		const validatedXml = await step.run("validate-and-delete-from-qti-api", async () => {
			let finalXml = qtiXml
			const upsertResult = await errors.try(upsertStimulus(tempIdentifier, article.title, qtiXml))

			if (upsertResult.error) {
				if (
					errors.is(upsertResult.error, ErrQtiUnprocessable) ||
					errors.is(upsertResult.error, ErrQtiInternalServerError)
				) {
					logger.warn("initial upsert failed, attempting correction", {
						qtiId: tempIdentifier,
						error: upsertResult.error
					})

					const fixResult = await errors.try(
						fixInvalidQtiXml(logger, {
							invalidXml: qtiXml,
							errorMessage: upsertResult.error.toString(),
							rootTag: "qti-assessment-stimulus"
						})
					)
					if (fixResult.error) {
						logger.error("failed to fix invalid qti xml", { qtiId: tempIdentifier, error: fixResult.error })
						throw errors.wrap(fixResult.error, "ai xml correction")
					}
					finalXml = fixResult.data

					const secondResult = await errors.try(upsertStimulus(tempIdentifier, article.title, finalXml))
					if (secondResult.error) {
						logger.error("second qti upsert attempt failed", { qtiId: tempIdentifier, error: secondResult.error })
						throw errors.wrap(secondResult.error, "second qti upsert")
					}
					finalXml = secondResult.data
				} else {
					logger.error("qti upsert failed with unexpected error", { qtiId: tempIdentifier, error: upsertResult.error })
					throw upsertResult.error
				}
			} else {
				finalXml = upsertResult.data
			}

			// On success, immediately delete the temporary stimulus
			const deleteResult = await errors.try(qti.deleteStimulus(tempIdentifier))
			if (deleteResult.error) {
				logger.error("failed to delete validated stimulus from QTI API, but continuing", {
					identifier: tempIdentifier,
					error: deleteResult.error
				})
			}

			return finalXml
		})

		logger.info("successfully validated qti stimulus", { articleId, identifier: tempIdentifier })

		// NEW Step 4: Write the validated XML to the database.
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
