import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { paraphraseQtiStimulus } from "@/lib/ai/openai" // ✅ SWITCHED: From Gemini to OpenAI o3

export const paraphraseStimulus = inngest.createFunction(
	{
		id: "paraphrase-qti-stimulus",
		name: "Paraphrase QTI Stimulus using AI",
		concurrency: {
			limit: 20 // ✅ INCREASED: OpenAI o3 has much better rate limits than Gemini
		}
	},
	{ event: "qti/stimulus.paraphrase" },
	async ({ event, step, logger }) => {
		const { articleId } = event.data
		logger.info("starting qti stimulus paraphrasing", { articleId })

		// Step 1: Fetch the source QTI XML from the database
		const sourceArticle = await step.run("fetch-source-stimulus", async () => {
			const result = await errors.try(
				db.query.niceArticles.findFirst({
					where: eq(niceArticles.id, articleId),
					columns: {
						xml: true
					}
				})
			)
			if (result.error) {
				logger.error("failed to fetch source stimulus from db", { error: result.error, articleId })
				throw errors.wrap(result.error, "db query for source stimulus")
			}
			return result.data
		})

		if (!sourceArticle?.xml) {
			logger.warn("source stimulus not found or has no XML", { articleId })
			return { status: "aborted", reason: "source_stimulus_not_found_or_empty", paraphrasedXml: null }
		}

		logger.info("successfully fetched source stimulus", { articleId })
		const sourceXml = sourceArticle.xml

		// Step 2: Generate paraphrased version using the OpenAI o3 helper
		const paraphrasedXml = await step.run("generate-qti-paraphrase", async () => {
			return paraphraseQtiStimulus(sourceXml)
		})

		if (!paraphrasedXml) {
			logger.warn("openai returned no paraphrased content", { articleId })
			return { status: "completed_with_warning", reason: "no_content_generated", paraphrasedXml: null }
		}

		logger.info("successfully generated paraphrased qti stimulus", { articleId })

		// MODIFIED: Return the generated XML directly instead of writing to a file.
		return {
			status: "success",
			articleId,
			paraphrasedXml
		}
	}
)
