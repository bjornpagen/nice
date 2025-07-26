import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { orchestratePerseusToQtiConversion } from "@/lib/perseus-qti/orchestrator"

// A global key, including quotes, to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = '"openai-api-global-concurrency"'

export const convertPerseusArticleToQtiStimulus = inngest.createFunction(
	{
		id: "convert-perseus-article-to-qti-stimulus",
		name: "Convert Perseus Article to QTI Stimulus",
		concurrency: {
			limit: 1,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	{ event: "qti/stimulus.migrate" },
	async ({ event, logger }) => {
		const { articleId } = event.data
		logger.info("starting article to qti stimulus conversion", { articleId })

		const articleResult = await errors.try(
			db.query.niceArticles.findFirst({
				where: eq(niceArticles.id, articleId),
				columns: { id: true, title: true, perseusContent: true }
			})
		)
		if (articleResult.error) {
			logger.error("failed to fetch article", { articleId, error: articleResult.error })
			throw errors.wrap(articleResult.error, "db query for article")
		}
		const article = articleResult.data
		if (!article?.perseusContent) {
			logger.warn("article has no perseus content", { articleId })
			return { success: true, qtiXml: null }
		}

		const qtiXmlResult = await errors.try(
			orchestratePerseusToQtiConversion({
				id: article.id,
				type: "stimulus",
				title: article.title, // Pass the database-sourced title
				perseusContent: article.perseusContent,
				logger
			})
		)
		if (qtiXmlResult.error) {
			logger.error("failed to orchestrate perseus to qti conversion for article", {
				articleId,
				error: qtiXmlResult.error
			})
			throw errors.wrap(qtiXmlResult.error, "perseus to qti conversion")
		}

		const updateResult = await errors.try(
			db.update(niceArticles).set({ xml: qtiXmlResult.data }).where(eq(niceArticles.id, articleId))
		)
		if (updateResult.error) {
			logger.error("failed to update article with qti xml", { articleId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("successfully converted article and stored qti xml", { articleId })
		return { status: "success", articleId: article.id }
	}
)
