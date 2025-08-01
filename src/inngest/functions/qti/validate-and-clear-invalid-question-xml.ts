import * as errors from "@superbuilders/errors"
import { eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { runValidationPipeline } from "@/lib/perseus-qti/validator"

const BATCH_SIZE = 500

export const validateAndClearInvalidQuestionXml = inngest.createFunction(
	{
		id: "validate-and-clear-invalid-question-xml",
		name: "Validate and Clear Invalid Question XML"
	},
	{ event: "qti/questions.validate-all" },
	async ({ step, logger }) => {
		logger.info("starting validation of all question xml")

		// Fetch all question IDs with XML outside of step.run
		const questionIdsResult = await errors.try(
			db.select({ id: schema.niceQuestions.id }).from(schema.niceQuestions).where(isNotNull(schema.niceQuestions.xml))
		)
		if (questionIdsResult.error) {
			logger.error("failed to fetch question ids", { error: questionIdsResult.error })
			throw errors.wrap(questionIdsResult.error, "database query for question ids")
		}
		const questionIds = questionIdsResult.data.map((q) => q.id)

		const totalQuestions = questionIds.length
		if (totalQuestions === 0) {
			logger.info("no questions with xml found, finishing early")
			return { message: "No questions with XML to validate." }
		}

		logger.info("found questions to validate", { count: totalQuestions })

		const stats = {
			totalChecked: 0,
			totalInvalid: 0,
			totalCleared: 0
		}

		for (let i = 0; i < totalQuestions; i += BATCH_SIZE) {
			const batchIds = questionIds.slice(i, i + BATCH_SIZE)
			const batchNumber = i / BATCH_SIZE + 1

			logger.info("processing batch", { batchNumber, batchSize: batchIds.length })

			// Fetch batch data outside step.run
			const questionsResult = await errors.try(
				db
					.select({
						id: schema.niceQuestions.id,
						xml: schema.niceQuestions.xml,
						exerciseTitle: schema.niceExercises.title
					})
					.from(schema.niceQuestions)
					.leftJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.where(inArray(schema.niceQuestions.id, batchIds))
			)
			if (questionsResult.error) {
				logger.error("failed to fetch batch questions data", { batchNumber, error: questionsResult.error })
				throw errors.wrap(questionsResult.error, "database query for batch questions")
			}

			// Process validation in step.run with parallel execution
			const batchResult = await step.run(`process-batch-${batchNumber}`, async () => {
				const validationPromises = questionsResult.data.map(async (question) => {
					if (!question.xml) return null

					const validationContext = {
						id: question.id,
						rootTag: "qti-assessment-item" as const,
						title: question.exerciseTitle ?? "Untitled Exercise",
						logger
					}

					const validationResult = await runValidationPipeline(question.xml, validationContext)

					if (!validationResult.isValid) {
						logger.warn("xml validation failed", {
							questionId: question.id,
							exerciseTitle: validationContext.title,
							errorCount: validationResult.errors.length,
							errors: validationResult.errors.map((e) => e.message)
						})
						return question.id
					}
					return null
				})

				const results = await Promise.all(validationPromises)
				const invalidQuestionIds = results.filter((id): id is string => id !== null)

				return { invalidQuestionIds }
			})

			// Update database outside step.run
			if (batchResult.invalidQuestionIds.length > 0) {
				logger.info("clearing invalid xml for questions", {
					count: batchResult.invalidQuestionIds.length,
					batchNumber
				})
				const updateResult = await errors.try(
					db
						.update(schema.niceQuestions)
						.set({ xml: null })
						.where(inArray(schema.niceQuestions.id, batchResult.invalidQuestionIds))
				)
				if (updateResult.error) {
					logger.error("failed to clear invalid xml", {
						batchNumber,
						error: updateResult.error,
						questionIds: batchResult.invalidQuestionIds
					})
					// Do not throw, just log the failure and report 0 cleared for this batch
					stats.totalChecked += batchIds.length
					stats.totalInvalid += batchResult.invalidQuestionIds.length
					// cleared remains 0 since we failed to update
					continue
				}
				stats.totalChecked += batchIds.length
				stats.totalInvalid += batchResult.invalidQuestionIds.length
				stats.totalCleared += batchResult.invalidQuestionIds.length
			} else {
				stats.totalChecked += batchIds.length
			}

			logger.info("batch complete", {
				batchNumber,
				checked: batchIds.length,
				invalid: batchResult.invalidQuestionIds.length,
				cleared: batchResult.invalidQuestionIds.length,
				progress: `${stats.totalChecked}/${totalQuestions}`
			})
		}

		logger.info("completed validation of all question xml", { stats })
		return {
			message: `Validation complete. Checked ${stats.totalChecked} questions, found ${stats.totalInvalid} invalid, and cleared ${stats.totalCleared}.`,
			stats
		}
	}
)
