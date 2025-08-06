import * as errors from "@superbuilders/errors"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const clearAllXmlData = inngest.createFunction(
	{
		id: "clear-all-xml-data",
		name: "Clear All XML Data and Analysis Notes Database-Wide"
	},
	{ event: "qti/database.clear-all-xml" },
	async ({ logger }) => {
		logger.info("starting database-wide xml data and analysis notes clearing")

		// Track clearing results
		const results = {
			articles: { total: 0, cleared: 0 },
			questions: { total: 0, cleared: 0 },
			questionsAnalysis: { total: 0, cleared: 0 }
		}

		// Count total articles with XML
		const articlesCountResult = await errors.try(
			db.query.niceArticles.findMany({
				columns: { id: true }
			})
		)
		if (articlesCountResult.error) {
			logger.error("failed to count articles", { error: articlesCountResult.error })
			throw errors.wrap(articlesCountResult.error, "articles count query")
		}
		results.articles.total = articlesCountResult.data.length

		// Count total questions with XML
		const questionsCountResult = await errors.try(
			db.query.niceQuestions.findMany({
				columns: { id: true }
			})
		)
		if (questionsCountResult.error) {
			logger.error("failed to count questions", { error: questionsCountResult.error })
			throw errors.wrap(questionsCountResult.error, "questions count query")
		}
		results.questions.total = questionsCountResult.data.length

		// Clear all XML data from articles table
		logger.info("clearing xml from articles table", { totalArticles: results.articles.total })
		const articlesUpdateResult = await errors.try(db.update(schema.niceArticles).set({ xml: null }))
		if (articlesUpdateResult.error) {
			logger.error("failed to clear articles xml", { error: articlesUpdateResult.error })
			throw errors.wrap(articlesUpdateResult.error, "clear articles xml")
		}
		results.articles.cleared = results.articles.total
		logger.info("cleared articles xml data", { count: results.articles.cleared })

		// Clear all XML data from questions table
		logger.info("clearing xml from questions table", { totalQuestions: results.questions.total })
		const questionsUpdateResult = await errors.try(db.update(schema.niceQuestions).set({ xml: null }))
		if (questionsUpdateResult.error) {
			logger.error("failed to clear questions xml", { error: questionsUpdateResult.error })
			throw errors.wrap(questionsUpdateResult.error, "clear questions xml")
		}
		results.questions.cleared = results.questions.total
		logger.info("cleared questions xml data", { count: results.questions.cleared })

		// Count total questions_analysis with analysisNotes
		const questionsAnalysisCountResult = await errors.try(
			db.query.niceQuestionsAnalysis.findMany({
				columns: { id: true }
			})
		)
		if (questionsAnalysisCountResult.error) {
			logger.error("failed to count questions analysis", { error: questionsAnalysisCountResult.error })
			throw errors.wrap(questionsAnalysisCountResult.error, "questions analysis count query")
		}
		results.questionsAnalysis.total = questionsAnalysisCountResult.data.length

		// Clear all analysisNotes data from questions_analysis table
		logger.info("clearing analysisNotes from questions_analysis table", {
			totalQuestionsAnalysis: results.questionsAnalysis.total
		})
		const questionsAnalysisUpdateResult = await errors.try(
			db.update(schema.niceQuestionsAnalysis).set({ analysisNotes: null })
		)
		if (questionsAnalysisUpdateResult.error) {
			logger.error("failed to clear questions analysis notes", { error: questionsAnalysisUpdateResult.error })
			throw errors.wrap(questionsAnalysisUpdateResult.error, "clear questions analysis notes")
		}
		results.questionsAnalysis.cleared = results.questionsAnalysis.total
		logger.info("cleared questions analysis notes", { count: results.questionsAnalysis.cleared })

		logger.info("completed database-wide xml and analysis notes clearing", {
			articlesCleared: results.articles.cleared,
			questionsCleared: results.questions.cleared,
			questionsAnalysisCleared: results.questionsAnalysis.cleared,
			totalCleared: results.articles.cleared + results.questions.cleared + results.questionsAnalysis.cleared
		})

		return {
			status: "success",
			cleared: {
				articles: results.articles.cleared,
				questions: results.questions.cleared,
				questionsAnalysis: results.questionsAnalysis.cleared,
				total: results.articles.cleared + results.questions.cleared + results.questionsAnalysis.cleared
			}
		}
	}
)
