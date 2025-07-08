import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { XMLBuilder, XMLParser } from "fast-xml-parser"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { ErrQtiNotFound, ErrQtiUnprocessable, QtiApiClient } from "@/lib/qti"

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" })
const xmlBuilder = new XMLBuilder({ ignoreAttributes: false, format: true, suppressBooleanAttributes: false })

// Helper function to encapsulate the idempotent upsert logic.
async function upsertItem(client: QtiApiClient, identifier: string, title: string, xml: string): Promise<string> {
	// Use a proper XML parser to safely override attributes
	const safeTitle = title.replace(/"/g, "&quot;")
	const parsedXml = xmlParser.parse(xml)
	const rootKey = Object.keys(parsedXml)[1] // Assumes second key is the root element
	if (rootKey) {
		parsedXml[rootKey].identifier = identifier
		parsedXml[rootKey].title = safeTitle
	}
	const finalXml = xmlBuilder.build(parsedXml)

	const updateResult = await errors.try(client.updateAssessmentItem({ identifier, xml: finalXml }))
	if (updateResult.error) {
		// Use errors.is for type-safe error checking
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(client.createAssessmentItem({ xml: finalXml }))
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

export const migrateQuestionToQtiAssessmentItem = inngest.createFunction(
	{ id: "migrate-question-to-qti-assessment-item" },
	{ event: "nice/qti.assessment-item.migration.requested" },
	async ({ event, step, logger }) => {
		const { questionId } = event.data
		logger.info("starting question to qti assessment item migration", { questionId })

		// Step 1: Fetch question data and its parent exercise's title from our database.
		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData,
					qtiIdentifier: niceQuestions.qtiIdentifier,
					exerciseTitle: niceExercises.title
				})
				.from(niceQuestions)
				.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
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
		if (question.qtiIdentifier && question.qtiIdentifier !== "") {
			logger.info("question already migrated, skipping", { questionId, qtiIdentifier: question.qtiIdentifier })
			return { status: "skipped", qtiIdentifier: question.qtiIdentifier }
		}

		// Step 2: Convert Perseus JSON to QTI XML via Gemini AI.
		const qtiXml = await step.run("generate-qti-from-perseus", async () => {
			const generationResult = await errors.try(generateQtiFromPerseus(question.parsedData))
			if (generationResult.error) {
				logger.error("ai conversion failed", { questionId, error: generationResult.error })
				throw errors.wrap(generationResult.error, "ai conversion")
			}
			return generationResult.data
		})

		// Step 3: Attempt to upsert the generated QTI to the service.
		const upsertResult = await step.run("attempt-initial-upsert", async () => {
			const client = new QtiApiClient()
			const qtiId = `nice-question-${question.id}`

			const result = await errors.try(upsertItem(client, qtiId, question.exerciseTitle, qtiXml))

			if (result.error) {
				// Use errors.is to check if the failure is a validation error
				if (errors.is(result.error, ErrQtiUnprocessable)) {
					logger.warn("initial qti upsert failed validation, will attempt correction", { qtiId, error: result.error })
					return {
						success: false as const,
						qtiId,
						error: result.error.message,
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
					fixInvalidQtiXml({
						invalidXml,
						errorMessage,
						rootTag: "qti-assessment-item"
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
				const client = new QtiApiClient()
				const { qtiId } = upsertResult

				const secondUpsertResult = await errors.try(upsertItem(client, qtiId, question.exerciseTitle, correctedXml))
				if (secondUpsertResult.error) {
					logger.error("upsert failed even after ai correction", { qtiId, error: secondUpsertResult.error })
					throw errors.wrap(secondUpsertResult.error, "second qti upsert attempt")
				}
				return secondUpsertResult.data
			})
		}

		// Final Step: Update our local database with the QTI identifier.
		const updateDbResult = await errors.try(
			db.update(niceQuestions).set({ qtiIdentifier: finalIdentifier }).where(eq(niceQuestions.id, questionId))
		)
		if (updateDbResult.error) {
			logger.error("failed to update question with qti identifier", {
				questionId,
				qtiIdentifier: finalIdentifier,
				error: updateDbResult.error
			})
			throw errors.wrap(updateDbResult.error, "db update")
		}

		logger.info("successfully migrated question to qti assessment item", { questionId, qtiIdentifier: finalIdentifier })
		return { status: "success", qtiIdentifier: finalIdentifier }
	}
)
