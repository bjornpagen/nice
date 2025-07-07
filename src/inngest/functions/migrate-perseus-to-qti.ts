import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateQtiFromPerseus } from "@/lib/ai"
import { QtiApiClient } from "@/lib/qti"

export const migratePerseusToQti = inngest.createFunction(
	{ id: "migrate-perseus-to-qti", retries: 3 },
	{ event: "nice/qti.migration.requested" },
	async ({ event, step, logger }) => {
		const { questionId } = event.data
		logger.info("starting perseus to qti migration", { questionId })

		// Step 1: Fetch question data from our database. This is done outside a step.run
		// because a failure here is critical and should fail the entire function immediately.
		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData,
					qtiIdentifier: niceQuestions.qtiIdentifier
				})
				.from(niceQuestions)
				.where(eq(niceQuestions.id, questionId))
				.limit(1)
		)
		if (questionResult.error) {
			logger.error("failed to fetch question from db", { questionId, error: questionResult.error })
			throw errors.wrap(questionResult.error, "db query")
		}

		const question = questionResult.data[0]
		if (!question) {
			logger.warn("question not found, aborting migration", { questionId })
			return { status: "aborted", reason: "not_found" }
		}
		if (!question.parsedData) {
			logger.warn("question has no perseus data, aborting", { questionId })
			return { status: "aborted", reason: "no_perseus_data" }
		}
		// Idempotency Check: Do not re-process if already migrated.
		if (question.qtiIdentifier && question.qtiIdentifier !== "") {
			logger.info("question already migrated, skipping", { questionId, qtiIdentifier: question.qtiIdentifier })
			return { status: "skipped", qtiIdentifier: question.qtiIdentifier }
		}

		// Step 2: Convert Perseus JSON to QTI XML via AI.
		const qtiXml = await step.run("generate-qti-from-perseus", async () => {
			const generationResult = await errors.try(generateQtiFromPerseus(question.parsedData))
			if (generationResult.error) {
				logger.error("ai conversion failed", { questionId, error: generationResult.error })
				throw errors.wrap(generationResult.error, "ai conversion") // Inngest will retry this step
			}
			return generationResult.data
		})

		// Step 3: Upsert the QTI item to the Timeback service. This is idempotent.
		const qtiIdentifier = await step.run("upsert-qti-assessment-item", async () => {
			const client = new QtiApiClient()
			const qtiId = `nice-question-${question.id}` // Use a namespaced, predictable identifier

			// Forcefully replace the identifier in the AI-generated XML with our correct one.
			// This corrects any AI hallucination where it might copy an ID from an example.
			const finalXml = qtiXml.replace(/identifier="[^"]*"/, `identifier="${qtiId}"`)

			const updateResult = await errors.try(client.updateAssessmentItem({ identifier: qtiId, xml: finalXml }))

			if (updateResult.error) {
				// If update fails, check if it's a 404 (not found) and create it.
				// This makes the step idempotent.
				if (updateResult.error.message.includes("status 404")) {
					logger.debug("qti item not found, creating new one", { qtiId })
					// Use the corrected XML for creation.
					const createResult = await errors.try(client.createAssessmentItem({ xml: finalXml }))
					if (createResult.error) {
						logger.error("failed to create qti item after update failed", {
							qtiId,
							error: createResult.error
						})
						throw errors.wrap(createResult.error, "qti create")
					}
					// The response from create will now contain the correct identifier.
					return createResult.data.identifier
				}

				// For any other error, re-throw to let Inngest handle retries.
				logger.error("failed to update qti item", { qtiId, error: updateResult.error })
				throw errors.wrap(updateResult.error, "qti update")
			}
			// The response from update will also contain the correct identifier.
			return updateResult.data.identifier
		})

		// Step 4: Update our local database with the new QTI identifier.
		// DB operations must be outside of step.run()
		const updateDbResult = await errors.try(
			db.update(niceQuestions).set({ qtiIdentifier }).where(eq(niceQuestions.id, questionId))
		)
		if (updateDbResult.error) {
			logger.error("failed to update question with qti identifier", {
				questionId,
				qtiIdentifier,
				error: updateDbResult.error
			})
			// This is a critical failure. We might need a compensating action or manual alert.
			// For now, we throw, which will cause Inngest to retry the entire function.
			// Because the previous steps are idempotent, this is safe.
			throw errors.wrap(updateDbResult.error, "db update")
		}

		logger.info("successfully migrated question to qti", { questionId, qtiIdentifier })
		return { status: "success", qtiIdentifier }
	}
)
