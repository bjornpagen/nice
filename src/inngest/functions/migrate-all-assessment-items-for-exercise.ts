import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"

const BATCH_SIZE = 100

export const migrateAllAssessmentItemsForExercise = inngest.createFunction(
	{ id: "migrate-all-assessment-items-for-exercise" },
	{ event: "nice/qti.assessment-item.migration.exercise.requested" },
	async ({ event, step, logger }) => {
		const { exerciseId } = event.data
		logger.info("starting migration for all questions in exercise", { exerciseId })

		// Step 1: Fetch all question IDs for the given exerciseId.
		// This is done outside a step because a failure here is critical and should fail the entire function.
		const questionIdsResult = await errors.try(
			db.select({ id: niceQuestions.id }).from(niceQuestions).where(eq(niceQuestions.exerciseId, exerciseId))
		)

		if (questionIdsResult.error) {
			logger.error("failed to fetch question ids for exercise", { exerciseId, error: questionIdsResult.error })
			throw errors.wrap(questionIdsResult.error, "db query for exercise questions")
		}

		const questionIds = questionIdsResult.data.map((q) => q.id)

		if (questionIds.length === 0) {
			logger.warn("no questions found for exercise, aborting migration", { exerciseId })
			return { status: "aborted", reason: "no_questions_found", count: 0 }
		}

		logger.info("found questions to migrate", { exerciseId, count: questionIds.length })

		// Step 2: Fan out migration events in batches.
		const migrationEvents = questionIds.map((questionId) => ({
			name: "nice/qti.assessment-item.migration.requested" as const,
			data: { questionId }
		}))

		for (let i = 0; i < migrationEvents.length; i += BATCH_SIZE) {
			const batch = migrationEvents.slice(i, i + BATCH_SIZE)
			await step.run(`send-migration-batch-${i / BATCH_SIZE + 1}`, async () => {
				const sendResult = await errors.try(inngest.send(batch))
				if (sendResult.error) {
					logger.error("failed to send migration event batch", {
						exerciseId,
						batchNumber: i / BATCH_SIZE + 1,
						error: sendResult.error
					})
					// This will cause the step to be retried by Inngest.
					throw errors.wrap(sendResult.error, "inngest send batch")
				}
				logger.info("successfully sent migration event batch", {
					exerciseId,
					count: batch.length,
					batchNumber: i / BATCH_SIZE + 1
				})
				return { sent: batch.length }
			})
		}

		logger.info("successfully fanned out all migration events for exercise", {
			exerciseId,
			count: questionIds.length
		})

		return { status: "success", count: questionIds.length }
	}
)
