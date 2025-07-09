import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { ErrQtiInternalServerError, ErrQtiNotFound, ErrQtiUnprocessable, QtiApiClient } from "@/lib/qti"

// Helper function to encapsulate the idempotent upsert logic.
async function upsertItem(client: QtiApiClient, identifier: string, title: string, xml: string): Promise<string> {
	// Use a robust regex to replace attributes on the root tag, avoiding a full parse/rebuild cycle
	// that was corrupting namespace declarations. This is safer and more reliable.
	const safeTitle = title.replace(/"/g, "&quot;")

	// This regex finds the <qti-assessment-item> tag and allows us to modify its attributes.
	const finalXml = xml.replace(/<qti-assessment-item([^>]*?)>/, (_match: string, group1: string) => {
		// Replace the identifier attribute.
		let updatedAttrs = group1.replace(/identifier="[^"]*"/, `identifier="${identifier}"`)
		// Replace the title attribute.
		updatedAttrs = updatedAttrs.replace(/title="[^"]*"/, `title="${safeTitle}"`)
		return `<qti-assessment-item${updatedAttrs}>`
	})

	const updateResult = await errors.try(client.updateAssessmentItem({ identifier, xml: finalXml }))
	if (updateResult.error) {
		// Use errors.is for type-safe error checking
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(client.createAssessmentItem({ xml: finalXml }))
			if (createResult.error) {
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return finalXml
		}
		// For other errors, re-throw to be handled by the caller.
		throw updateResult.error
	}
	return finalXml
}

export const convertPerseusQuestionToQtiItem = inngest.createFunction(
	{
		id: "convert-perseus-question-to-qti-item",
		name: "Convert Perseus Question to QTI Item",
		concurrency: {
			// Limit to 10 concurrent executions for this function.
			// The key ensures this function shares its concurrency limit with
			// the 'convert-perseus-article-to-qti-stimulus' function.
			limit: 10,
			key: "gemini-api"
		}
	},
	{ event: "qti/item.migrate" },
	async ({ event, step, logger }) => {
		const { questionId } = event.data
		logger.info("starting question to qti item validation", { questionId })

		// Step 1: Fetch question data from DB (Read-only)
		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData,
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
		if (!question || !question.parsedData) {
			logger.warn("question not found or has no parsed data", { questionId })
			return { status: "aborted", reason: "not_found_or_no_data" }
		}

		// Step 2: Convert Perseus JSON to QTI XML via AI
		const qtiXml = await step.run("generate-qti-from-perseus", async () => {
			const result = await errors.try(generateQtiFromPerseus(logger, question.parsedData))
			if (result.error) {
				logger.error("failed to generate qti from perseus", { questionId, error: result.error })
				throw errors.wrap(result.error, "ai conversion")
			}
			return result.data
		})

		const client = new QtiApiClient({
			serverUrl: env.TIMEBACK_QTI_SERVER_URL,
			tokenUrl: env.TIMEBACK_TOKEN_URL,
			clientId: env.TIMEBACK_CLIENT_ID,
			clientSecret: env.TIMEBACK_CLIENT_SECRET
		})
		const tempIdentifier = `nice-tmp:${question.id}`

		// Step 3: Validate XML by creating and immediately deleting it from the QTI API
		const validatedXml = await step.run("validate-and-delete-from-qti-api", async () => {
			let finalXml = qtiXml
			const upsertResult = await errors.try(upsertItem(client, tempIdentifier, question.exerciseTitle, qtiXml))

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
							rootTag: "qti-assessment-item"
						})
					)
					if (fixResult.error) {
						logger.error("failed to fix invalid qti xml", { qtiId: tempIdentifier, error: fixResult.error })
						throw errors.wrap(fixResult.error, "ai xml correction")
					}
					finalXml = fixResult.data

					const secondResult = await errors.try(upsertItem(client, tempIdentifier, question.exerciseTitle, finalXml))
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

			// On success, immediately delete the temporary item
			const deleteResult = await errors.try(client.deleteAssessmentItem(tempIdentifier))
			if (deleteResult.error) {
				logger.error("failed to delete validated item from QTI API, but continuing", {
					identifier: tempIdentifier,
					error: deleteResult.error
				})
			}

			return finalXml
		})

		logger.info("successfully validated qti item", { questionId, identifier: tempIdentifier })
		// Return the validated data to the orchestrator. DO NOT WRITE TO DB.
		return { status: "success", questionId: question.id, qtiXml: validatedXml }
	}
)
