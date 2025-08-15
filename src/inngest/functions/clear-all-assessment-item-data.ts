import * as errors from "@superbuilders/errors"
import { del as deleteBlob } from "@vercel/blob"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { env } from "@/env"
import { inngest } from "@/inngest/client"

export const clearAllAssessmentItemData = inngest.createFunction(
	{
		id: "clear-all-assessment-item-data",
		name: "Clear QTI assessment XML/JSON, analysis notes, and QA review screenshots (Vercel Blob)"
	},
	{ event: "qti/database.clear-assessment-item-data" },
	async ({ logger, step }) => {
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

		// Step 3: Delete Vercel Blob screenshots linked from question_render_reviews, then wipe the table
		logger.info("preparing to clear question_render_reviews and associated vercel blob images")

		// Fetch only required columns (no implicit select all)
		const reviewsResult = await errors.try(
			db.query.niceQuestionRenderReviews.findMany({
				columns: {
					questionId: true,
					productionScreenshotUrl: true,
					perseusScreenshotUrl: true
				}
			})
		)
		if (reviewsResult.error) {
			logger.error("failed to fetch question_render_reviews rows", { error: reviewsResult.error })
			throw errors.wrap(reviewsResult.error, "question render reviews query")
		}
		const reviews = reviewsResult.data
		const totalReviews = reviews.length

		logger.info("deleting vercel blob images for question_render_reviews", { count: totalReviews })

		// Build distinct list of non-empty URLs to delete
		const urlsToDeleteSet = new Set<string>()
		for (const r of reviews) {
			if (r.productionScreenshotUrl !== "") urlsToDeleteSet.add(r.productionScreenshotUrl)
			if (r.perseusScreenshotUrl !== "") urlsToDeleteSet.add(r.perseusScreenshotUrl)
		}
		const urlsToDelete = Array.from(urlsToDeleteSet)

		if (urlsToDelete.length > 0) {
			await step.run("delete-vercel-blobs-for-question-render-reviews", async () => {
				const deletionPromises = urlsToDelete.map(async (url) => {
					const delResult = await errors.try(deleteBlob(url, { token: env.BLOB_READ_WRITE_TOKEN }))
					if (delResult.error) {
						logger.error("failed to delete vercel blob", { url, error: delResult.error })
						throw errors.wrap(delResult.error, "vercel blob delete")
					}
				})
				await Promise.all(deletionPromises)
			})
		}

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
