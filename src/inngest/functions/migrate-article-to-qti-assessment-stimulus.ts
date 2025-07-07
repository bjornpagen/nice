import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateQtiFromPerseus } from "@/lib/ai"
import { QtiApiClient } from "@/lib/qti"

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
		if (!article) {
			logger.warn("article not found, aborting migration", { articleId })
			return { status: "aborted", reason: "not_found" }
		}
		if (!article.perseusContent) {
			logger.warn("article has no perseus data, aborting", { articleId })
			return { status: "aborted", reason: "no_perseus_data" }
		}

		// Step 2: Convert Perseus JSON to QTI Stimulus XML via AI.
		const qtiStimulusXml = await step.run("generate-qti-assessment-stimulus-from-perseus", async () => {
			const generationResult = await errors.try(generateQtiFromPerseus(article.perseusContent, { type: "stimulus" }))
			if (generationResult.error) {
				logger.error("ai conversion to assessment stimulus failed", { articleId, error: generationResult.error })
				throw errors.wrap(generationResult.error, "ai assessment stimulus conversion")
			}
			return generationResult.data
		})

		// Step 3: Upsert the QTI stimulus to the Timeback service. This is idempotent.
		const stimulusIdentifier = await step.run("upsert-qti-assessment-stimulus", async () => {
			const client = new QtiApiClient()
			// Use a namespaced, predictable identifier for idempotency.
			const qtiId = `nice-article-${article.id}`

			const upsertPayload = {
				identifier: qtiId,
				title: article.title,
				content: qtiStimulusXml
			}

			const updateResult = await errors.try(client.updateStimulus(qtiId, upsertPayload))

			if (updateResult.error) {
				if (updateResult.error.message.includes("status 404")) {
					logger.debug("qti assessment stimulus not found, creating new one", { qtiId })
					const createResult = await errors.try(client.createStimulus(upsertPayload))
					if (createResult.error) {
						logger.error("failed to create qti assessment stimulus after update failed", {
							qtiId,
							error: createResult.error
						})
						throw errors.wrap(createResult.error, "qti assessment stimulus create")
					}
					return createResult.data.identifier
				}
				logger.error("failed to update qti assessment stimulus", { qtiId, error: updateResult.error })
				throw errors.wrap(updateResult.error, "qti assessment stimulus update")
			}
			return updateResult.data.identifier
		})

		logger.info("successfully migrated article to qti assessment stimulus", { articleId, stimulusIdentifier })
		return { status: "success", stimulusIdentifier }
	}
)
