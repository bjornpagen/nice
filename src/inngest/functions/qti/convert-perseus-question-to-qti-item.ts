import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { fixInvalidQtiXml, generateQtiFromPerseus } from "@/lib/ai"
import { qti } from "@/lib/clients"

// REMOVED: The `upsertItem` helper function is no longer needed for validation.

export const convertPerseusQuestionToQtiItem = inngest.createFunction(
	{
		id: "convert-perseus-question-to-qti-item",
		name: "Convert Perseus Question to QTI Item",
		concurrency: {
			// Limit to 10 concurrent executions, shared across all OpenAI functions account-wide.
			// This global limit prevents rate-limiting from the OpenAI API.
			limit: 160,
			key: '"openai-api-global-concurrency"'
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

		// Step 3: Validate XML using the dedicated QTI validateXml method
		const validatedXml = await step.run("validate-with-qti-api", async () => {
			let finalXml = qtiXml
			const validationResult = await errors.try(qti.validateXml({ xml: finalXml, schema: "item" }))

			if (validationResult.error) {
				// API call failed - this is a critical error
				logger.error("qti validation api call failed", {
					questionId,
					error: validationResult.error
				})
				throw errors.wrap(validationResult.error, "qti validation api call")
			}

			if (!validationResult.data.success) {
				// Validation failed with specific errors
				const errorMessage = validationResult.data.validationErrors.join("\n")

				logger.warn("initial validation failed, attempting correction", {
					questionId,
					error: errorMessage
				})

				const fixResult = await errors.try(
					fixInvalidQtiXml(logger, {
						invalidXml: finalXml,
						errorMessage: errorMessage,
						rootTag: "qti-assessment-item"
					})
				)
				if (fixResult.error) {
					logger.error("failed to fix invalid qti xml", { questionId, error: fixResult.error })
					throw errors.wrap(fixResult.error, "ai xml correction")
				}
				finalXml = fixResult.data

				const secondValidationResult = await errors.try(qti.validateXml({ xml: finalXml, schema: "item" }))
				if (secondValidationResult.error) {
					// API call failed on second attempt - critical error
					logger.error("second qti validation api call failed", {
						questionId,
						error: secondValidationResult.error
					})
					throw errors.wrap(secondValidationResult.error, "second qti validation api call")
				}

				if (!secondValidationResult.data.success) {
					// Second validation failed with specific errors
					const secondErrorMessage = secondValidationResult.data.validationErrors.join("\n")
					logger.error("second qti validation attempt failed after correction", {
						questionId,
						error: secondErrorMessage
					})
					throw errors.new(`qti validation failed after ai correction: ${secondErrorMessage}`)
				}
			}

			return finalXml
		})

		logger.info("successfully validated qti item", { questionId })

		// Step 4: Write the validated XML to the database.
		const updateResult = await errors.try(
			db.update(niceQuestions).set({ xml: validatedXml }).where(eq(niceQuestions.id, questionId))
		)

		if (updateResult.error) {
			logger.error("failed to update question with qti xml", { questionId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("successfully stored qti xml in database", { questionId })
		return { status: "success", questionId: question.id }
	}
)
