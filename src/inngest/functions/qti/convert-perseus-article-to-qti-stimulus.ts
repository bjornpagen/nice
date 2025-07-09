import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { ErrQtiInternalServerError, ErrQtiNotFound, ErrQtiUnprocessable, QtiApiClient } from "@/lib/qti"

// Helper function to encapsulate the idempotent upsert logic.
async function upsertStimulus(
	client: QtiApiClient,
	identifier: string,
	title: string,
	content: string
): Promise<string> {
	const updateResult = await errors.try(
		client.updateStimulus(identifier, {
			identifier,
			title,
			content
		})
	)
	if (updateResult.error) {
		// Use errors.is for type-safe error checking
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(
				client.createStimulus({
					identifier,
					title,
					content
				})
			)
			if (createResult.error) {
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return createResult.data.identifier
		}
		// For other errors, re-throw to be handled by the caller.
		throw updateResult.error
	}
	return updateResult.data.identifier
}

export const convertPerseusArticleToQtiStimulus = inngest.createFunction(
	{
		id: "convert-perseus-article-to-qti-stimulus",
		name: "Convert Perseus Article to QTI Stimulus",
		concurrency: {
			// Limit to 20 concurrent executions for this function.
			// The key ensures this function shares its concurrency limit with
			// the 'convert-perseus-question-to-qti-item' function.
			limit: 20,
			key: "gemini-api"
		}
	},
	{ event: "qti/stimulus.migrate" },
	async ({ event, step, logger }) => {
		const { articleId } = event.data
		logger.info("starting article to qti stimulus migration", { articleId })

		// Step 1: Fetch article data from our database.
		const articleResult = await errors.try(
			db
				.select({
					id: niceArticles.id,
					title: niceArticles.title,
					perseusContent: niceArticles.perseusContent,
					qtiIdentifier: niceArticles.qtiIdentifier
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
		if (!article) {
			logger.warn("article not found, aborting migration", { articleId })
			return { status: "aborted", reason: "not_found" }
		}
		if (!article.perseusContent) {
			logger.warn("article has no perseus data, aborting", { articleId })
			return { status: "aborted", reason: "no_perseus_data" }
		}
		if (article.qtiIdentifier && article.qtiIdentifier !== "") {
			logger.info("article already migrated, skipping", { articleId, qtiIdentifier: article.qtiIdentifier })
			return { status: "skipped", qtiIdentifier: article.qtiIdentifier }
		}

		// Step 2: Convert Perseus JSON to QTI XML via Gemini AI.
		const qtiXml = await step.run("generate-qti-stimulus-from-perseus", async () => {
			const generationResult = await errors.try(
				generateQtiFromPerseus(logger, article.perseusContent, { type: "stimulus" })
			)
			if (generationResult.error) {
				logger.error("ai conversion failed", { articleId, error: generationResult.error })
				throw errors.wrap(generationResult.error, "ai conversion")
			}
			return generationResult.data
		})

		// Step 3: Attempt to upsert the generated QTI to the service.
		const upsertResult = await step.run("attempt-initial-upsert", async () => {
			const client = new QtiApiClient({
				serverUrl: env.TIMEBACK_QTI_SERVER_URL,
				tokenUrl: env.TIMEBACK_TOKEN_URL,
				clientId: env.TIMEBACK_CLIENT_ID,
				clientSecret: env.TIMEBACK_CLIENT_SECRET
			})
			const qtiId = `nice:${article.id}`

			const result = await errors.try(upsertStimulus(client, qtiId, article.title, qtiXml))

			if (result.error) {
				// Use errors.is to check if the failure is a validation error
				if (errors.is(result.error, ErrQtiUnprocessable) || errors.is(result.error, ErrQtiInternalServerError)) {
					logger.warn("initial qti upsert failed validation, will attempt correction", {
						qtiId,
						error: result.error,
						xml: qtiXml
					})
					return {
						success: false as const,
						qtiId,
						// ✅ CORRECT: Serialize the full error chain to a string.
						error: result.error.toString(),
						invalidXml: qtiXml // Pass original XML to the fixer
					}
				}
				// For other errors, fail the step to trigger Inngest retries.
				throw result.error
			}

			return { success: true as const, identifier: result.data, qtiId }
		})

		let finalIdentifier: string

		if (upsertResult.success) {
			finalIdentifier = upsertResult.identifier
		} else {
			// Step 4 (Conditional): Fix the XML using the new AI model.
			const correctedXml = await step.run("fix-invalid-qti-xml", async () => {
				const { qtiId, error: errorMessage, invalidXml } = upsertResult
				const fixResult = await errors.try(
					fixInvalidQtiXml(logger, {
						invalidXml,
						errorMessage,
						rootTag: "qti-assessment-stimulus"
					})
				)

				if (fixResult.error) {
					logger.error("failed to fix invalid qti xml", { qtiId, error: fixResult.error })
					throw errors.wrap(fixResult.error, "ai xml correction")
				}
				return fixResult.data
			})

			// Step 5 (Conditional): Retry the upsert with the corrected XML.
			finalIdentifier = await step.run("retry-upsert-with-corrected-xml", async () => {
				const client = new QtiApiClient({
					serverUrl: env.TIMEBACK_QTI_SERVER_URL,
					tokenUrl: env.TIMEBACK_TOKEN_URL,
					clientId: env.TIMEBACK_CLIENT_ID,
					clientSecret: env.TIMEBACK_CLIENT_SECRET
				})
				const { qtiId } = upsertResult

				const secondUpsertResult = await errors.try(upsertStimulus(client, qtiId, article.title, correctedXml))
				if (secondUpsertResult.error) {
					logger.error("upsert failed even after ai correction", { qtiId, error: secondUpsertResult.error })
					throw errors.wrap(secondUpsertResult.error, "second qti upsert attempt")
				}
				return secondUpsertResult.data
			})
		}

		// Final Step: Update our local database with the QTI identifier.
		const updateDbResult = await errors.try(
			db.update(niceArticles).set({ qtiIdentifier: finalIdentifier }).where(eq(niceArticles.id, articleId))
		)
		if (updateDbResult.error) {
			logger.error("failed to update article with qti identifier", {
				articleId,
				qtiIdentifier: finalIdentifier,
				error: updateDbResult.error
			})
			throw errors.wrap(updateDbResult.error, "db update")
		}

		logger.info("successfully migrated article to qti stimulus", { articleId, qtiIdentifier: finalIdentifier })
		return { status: "success", qtiIdentifier: finalIdentifier }
	}
)
