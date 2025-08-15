import * as errors from "@superbuilders/errors"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const clearAllAssessmentItemData = inngest.createFunction(
	{
		id: "clear-all-assessment-item-data",
		name: "Clear QTI assessment XML/JSON, analysis notes, and QA review table"
	},
	{ event: "qti/database.clear-assessment-item-data" },
	async ({ logger }) => {
		logger.info("starting database-wide clearing of assessment item data")

		// Count questions beforehand for logging/return consistency
		const questionsCountResult = await errors.try(
			db.query.niceQuestions.findMany({
				columns: { id: true }
			})
		)
		if (questionsCountResult.error) {
			logger.error("failed to count questions", { error: questionsCountResult.error })
			throw errors.wrap(questionsCountResult.error, "questions count query")
		}
		const totalQuestions = questionsCountResult.data.length

		// Step 1: Clear all XML and structuredJson data from the questions table.
		logger.info("clearing xml and structuredJson from questions table")
		const questionsUpdateResult = await errors.try(
			db.update(schema.niceQuestions).set({ xml: null, structuredJson: null })
		)
		if (questionsUpdateResult.error) {
			logger.error("failed to clear questions xml/json", { error: questionsUpdateResult.error })
			throw errors.wrap(questionsUpdateResult.error, "clear questions xml/json")
		}
		const questionsClearedCount = totalQuestions
		logger.info("cleared questions xml and structuredJson data", { count: questionsClearedCount })

		// Count questions_analysis beforehand
		const analysisCountResult = await errors.try(
			db.query.niceQuestionsAnalysis.findMany({
				columns: { id: true }
			})
		)
		if (analysisCountResult.error) {
			logger.error("failed to count questions_analysis", { error: analysisCountResult.error })
			throw errors.wrap(analysisCountResult.error, "questions analysis count query")
		}
		const totalAnalysis = analysisCountResult.data.length

		// Step 2: Wipe the entire questions_analysis table.
		logger.info("deleting all records from questions_analysis table")
		const analysisDeleteResult = await errors.try(db.delete(schema.niceQuestionsAnalysis))
		if (analysisDeleteResult.error) {
			logger.error("failed to delete from questions_analysis table", { error: analysisDeleteResult.error })
			throw errors.wrap(analysisDeleteResult.error, "delete questions_analysis")
		}
		const analysisClearedCount = totalAnalysis
		logger.info("successfully deleted all records from questions_analysis", { count: analysisClearedCount })

		// Step 3: Wipe the entire question_render_reviews table (skip blob deletion)
		logger.info("preparing to clear question_render_reviews table")

		// Count rows for logging/return
		const reviewsResult = await errors.try(
			db.query.niceQuestionRenderReviews.findMany({
				columns: { questionId: true }
			})
		)
		if (reviewsResult.error) {
			logger.error("failed to count question_render_reviews", { error: reviewsResult.error })
			throw errors.wrap(reviewsResult.error, "question render reviews count query")
		}
		const totalReviews = reviewsResult.data.length

		logger.info("deleting all records from question_render_reviews table")
		const reviewsDeleteResult = await errors.try(db.delete(schema.niceQuestionRenderReviews))
		if (reviewsDeleteResult.error) {
			logger.error("failed to delete from question_render_reviews table", { error: reviewsDeleteResult.error })
			throw errors.wrap(reviewsDeleteResult.error, "delete question_render_reviews")
		}
		logger.info("successfully deleted all records from question_render_reviews", { count: totalReviews })

		logger.info("completed database-wide clearing of assessment item data", {
			questionsCleared: questionsClearedCount,
			questionsAnalysisCleared: analysisClearedCount,
			questionRenderReviewsCleared: totalReviews
		})

		return {
			status: "success",
			cleared: {
				questions: questionsClearedCount,
				questionsAnalysis: analysisClearedCount,
				questionRenderReviews: totalReviews,
				total: questionsClearedCount + analysisClearedCount + totalReviews
			}
		}
	}
)
