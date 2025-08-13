import * as errors from "@superbuilders/errors"
import { isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const orchestrateVisualQAReview = inngest.createFunction(
	{
		id: "orchestrate-visual-qa-review",
		name: "Orchestrate Visual QA Review for All Questions"
	},
	{
		event: "qa/questions.review-all-rendering"
	},
	async ({ step, logger }) => {
		logger.info("starting visual qa orchestration")

		// Fetch all questions with XML (outside step.run as per project rules)
		logger.debug("fetching all questions with xml")
		const questionsResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					problemType: niceQuestions.problemType
				})
				.from(niceQuestions)
				.where(isNotNull(niceQuestions.xml))
		)

		if (questionsResult.error) {
			logger.error("failed to fetch questions with xml", { error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "questions fetch")
		}

		const questions = questionsResult.data
		logger.info("questions with xml fetched", {
			totalCount: questions.length,
			problemTypes: [...new Set(questions.map((q) => q.problemType))].sort()
		})

		const questionIds = questions.map((q) => q.id)

		// Step 1: Prepare question IDs for fan-out
		const preparedData = await step.run("prepare-question-ids", async () => {
			return { questionIds, totalCount: questions.length }
		})

		// Step 2: Fan out to individual review workers
		const reviewResults = await step.run("fan-out-reviews", async () => {
			logger.info("fanning out visual qa reviews", {
				questionCount: preparedData.questionIds.length,
				concurrencyLimit: 100
			})

			// Send events for each question to be reviewed
			const events = preparedData.questionIds.map((questionId) => ({
				name: "qa/question.review-rendering" as const,
				data: { questionId }
			}))

			// Send events in batches to avoid overwhelming the system
			const batchSize = 100
			let sentCount = 0

			for (let i = 0; i < events.length; i += batchSize) {
				const batch = events.slice(i, i + batchSize)

				const sendResult = await errors.try(inngest.send(batch))

				if (sendResult.error) {
					logger.error("failed to send batch of review events", {
						error: sendResult.error,
						batchStart: i,
						batchSize: batch.length
					})
					throw errors.wrap(sendResult.error, "batch event send")
				}

				sentCount += batch.length
				logger.debug("sent batch of review events", {
					batchStart: i,
					batchSize: batch.length,
					totalSent: sentCount,
					totalQuestions: preparedData.questionIds.length
				})

				// Small delay between batches to avoid rate limiting
				if (i + batchSize < events.length) {
					await new Promise((resolve) => setTimeout(resolve, 100))
				}
			}

			logger.info("all review events sent", {
				totalQuestions: preparedData.questionIds.length,
				totalEvents: sentCount
			})

			return {
				totalQuestions: preparedData.questionIds.length,
				eventsSent: sentCount
			}
		})

		logger.info("visual qa orchestration completed", {
			totalQuestions: reviewResults.totalQuestions,
			eventsSent: reviewResults.eventsSent
		})

		return {
			totalQuestions: reviewResults.totalQuestions,
			eventsSent: reviewResults.eventsSent,
			status: "orchestration_complete"
		}
	}
)
