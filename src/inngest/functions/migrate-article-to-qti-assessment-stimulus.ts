import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { ErrQtiInternalServerError, ErrQtiNotFound, ErrQtiUnprocessable, QtiApiClient } from "@/lib/qti"

// Helper function to encapsulate the idempotent upsert logic for stimuli.
async function upsertStimulus(
	client: QtiApiClient,
	identifier: string,
	title: string,
	content: string
): Promise<string> {
	const safeTitle = title.replace(/"/g, "&quot;")

	// This regex finds the <qti-assessment-stimulus> tag and allows us to modify its attributes.
	const finalXml = content.replace(/<qti-assessment-stimulus([^>]*?)>/, (_match: string, group1: string) => {
		// Replace the identifier attribute.
		let updatedAttrs = group1.replace(/identifier="[^"]*"/, `identifier="${identifier}"`)
		// Replace the title attribute.
		updatedAttrs = updatedAttrs.replace(/title="[^"]*"/, `title="${safeTitle}"`)
		return `<qti-assessment-stimulus${updatedAttrs}>`
	})

	const payload = { identifier, title: safeTitle, content: finalXml }

	const updateResult = await errors.try(client.updateStimulus(identifier, payload))
	if (updateResult.error) {
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(client.createStimulus(payload))
			if (createResult.error) {
				throw errors.wrap(createResult.error, "qti stimulus create after update 404")
			}
			return createResult.data.identifier
		}
		throw updateResult.error
	}
	return updateResult.data.identifier
}

export const migrateArticleToQtiAssessmentStimulus = inngest.createFunction(
	{ id: "migrate-article-to-qti-assessment-stimulus" },
	{ event: "nice/qti.assessment-stimulus.migration.requested" },
	async ({ event, step, logger }) => {
		const { articleId } = event.data
		logger.info("starting perseus article to qti assessment stimulus migration", { articleId })

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

		// Step 2: Convert Perseus JSON to QTI Stimulus XML via Gemini AI.
		const qtiStimulusXml = await step.run("generate-qti-assessment-stimulus-from-perseus", async () => {
			const generationResult = await errors.try(
				generateQtiFromPerseus(logger, article.perseusContent, { type: "stimulus" })
			)
			if (generationResult.error) {
				logger.error("ai conversion to assessment stimulus failed", { articleId, error: generationResult.error })
				throw errors.wrap(generationResult.error, "ai assessment stimulus conversion")
			}
			return generationResult.data
		})

		// Step 3: Attempt to upsert the QTI stimulus to the Timeback service.
		const upsertResult = await step.run("attempt-initial-stimulus-upsert", async () => {
			const client = new QtiApiClient()
			const qtiId = `nice-article-${article.id}`

			const result = await errors.try(upsertStimulus(client, qtiId, article.title, qtiStimulusXml))

			if (result.error) {
				if (errors.is(result.error, ErrQtiUnprocessable) || errors.is(result.error, ErrQtiInternalServerError)) {
					logger.warn("initial qti stimulus upsert failed, will attempt correction", { qtiId, error: result.error })
					return {
						success: false as const,
						qtiId: qtiId,
						error: result.error.message,
						invalidXml: qtiStimulusXml
					}
				}
				throw result.error
			}
			return { success: true as const, identifier: result.data, qtiId }
		})

		let finalIdentifier: string

		if (upsertResult.success) {
			finalIdentifier = upsertResult.identifier
		} else {
			// Step 4 (Conditional): Fix the XML using the new AI model.
			const correctedXml = await step.run("fix-invalid-qti-stimulus-xml", async () => {
				const { qtiId, error: errorMessage, invalidXml } = upsertResult
				const fixResult = await errors.try(
					fixInvalidQtiXml(logger, {
						invalidXml,
						errorMessage,
						rootTag: "qti-assessment-stimulus"
					})
				)

				if (fixResult.error) {
					logger.error("failed to fix invalid qti stimulus xml", { qtiId, error: fixResult.error })
					throw errors.wrap(fixResult.error, "ai xml correction")
				}
				return fixResult.data
			})

			// Step 5 (Conditional): Retry the upsert with the corrected XML.
			finalIdentifier = await step.run("retry-stimulus-upsert-with-corrected-xml", async () => {
				const client = new QtiApiClient()
				const { qtiId } = upsertResult

				const secondUpsertResult = await errors.try(upsertStimulus(client, qtiId, article.title, correctedXml))
				if (secondUpsertResult.error) {
					logger.error("stimulus upsert failed even after ai correction", { qtiId, error: secondUpsertResult.error })
					throw errors.wrap(secondUpsertResult.error, "second qti stimulus upsert attempt")
				}
				return secondUpsertResult.data
			})
		}

		// Final Step: Update our local database with the new QTI stimulus identifier.
		const updateDbResult = await errors.try(
			db.update(niceArticles).set({ qtiIdentifier: finalIdentifier }).where(eq(niceArticles.id, articleId))
		)

		if (updateDbResult.error) {
			logger.error("failed to update article with qti stimulus identifier", {
				articleId,
				stimulusIdentifier: finalIdentifier,
				error: updateDbResult.error
			})
			throw errors.wrap(updateDbResult.error, "db update")
		}

		logger.info("successfully migrated article to qti assessment stimulus", {
			articleId,
			stimulusIdentifier: finalIdentifier
		})
		return { status: "success", stimulusIdentifier: finalIdentifier }
	}
)
