import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"

const BATCH_SIZE = 100

export const qtiMigrationBackfill = inngest.createFunction(
	{ id: "qti-migration-backfill" },
	{ event: "nice/qti.migration.backfill.requested" },
	async ({ step, logger }) => {
		logger.info("starting qti migration backfill")

		// Step 1: Count total unmigrated questions
		const countResult = await errors.try(
			db.select({ count: niceQuestions.id }).from(niceQuestions).where(eq(niceQuestions.qtiIdentifier, ""))
		)
		if (countResult.error) {
			logger.error("failed to count unmigrated questions", { error: countResult.error })
			throw errors.wrap(countResult.error, "count query")
		}

		const totalCount = countResult.data.length
		if (totalCount === 0) {
			logger.info("no unmigrated questions found, exiting")
			return { status: "completed", totalProcessed: 0 }
		}

		logger.info("found unmigrated questions", { count: totalCount })

		// Step 2: Process questions in batches
		let processedCount = 0
		let offset = 0

		while (offset < totalCount) {
			// Fetch batch of unmigrated questions
			const batchResult = await errors.try(
				db
					.select({ id: niceQuestions.id })
					.from(niceQuestions)
					.where(eq(niceQuestions.qtiIdentifier, ""))
					.limit(BATCH_SIZE)
					.offset(offset)
			)
			if (batchResult.error) {
				logger.error("failed to fetch batch of unmigrated questions", {
					error: batchResult.error,
					offset,
					batchSize: BATCH_SIZE
				})
				throw errors.wrap(batchResult.error, "batch query")
			}

			const questionIds = batchResult.data.map((q) => q.id)
			if (questionIds.length === 0) {
				break // No more questions to process
			}

			// Send events for each question in the batch
			await step.run(`send-batch-${offset}`, async () => {
				const events = questionIds.map((questionId) => ({
					name: "nice/qti.migration.requested" as const,
					data: { questionId }
				}))

				const sendResult = await errors.try(inngest.send(events))
				if (sendResult.error) {
					logger.error("failed to send batch of events to inngest", {
						error: sendResult.error,
						batchNumber: offset / BATCH_SIZE + 1,
						batchSize: questionIds.length
					})
					throw errors.wrap(sendResult.error, "send events")
				}

				logger.info("successfully sent batch of events to inngest", {
					count: questionIds.length,
					batchNumber: offset / BATCH_SIZE + 1
				})
			})

			processedCount += questionIds.length
			offset += BATCH_SIZE

			// Add a small delay between batches to avoid overwhelming the system
			await step.sleep(`batch-delay-${offset}`, "2s")
		}

		logger.info("qti migration backfill completed", { totalProcessed: processedCount })
		return { status: "completed", totalProcessed: processedCount }
	}
)
