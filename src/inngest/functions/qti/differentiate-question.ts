import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateQtiVariations } from "@/lib/ai/openai"

export const differentiateQuestion = inngest.createFunction(
	{
		id: "differentiate-qti-question",
		name: "Differentiate QTI Question using AI",
		concurrency: {
			// ✅ INCREASED: OpenAI o3 has much better rate limits than Gemini
			limit: 20
		}
	},
	{ event: "qti/question.differentiate" },
	async ({ event, step, logger }) => {
		const { questionId, numberOfVariations, startingIndex = 1 } = event.data
		logger.info("starting qti question differentiation", { questionId, numberOfVariations, startingIndex })

		// Step 1: Fetch the source QTI XML from the database
		const sourceQuestion = await step.run("fetch-source-question", async () => {
			const result = await errors.try(
				db.query.niceQuestions.findFirst({
					where: eq(niceQuestions.id, questionId),
					columns: {
						xml: true
					}
				})
			)
			if (result.error) {
				logger.error("failed to fetch source question from db", { error: result.error, questionId })
				throw errors.wrap(result.error, "db query for source question")
			}
			return result.data
		})

		if (!sourceQuestion?.xml) {
			logger.warn("source question not found or has no XML", { questionId })
			return { status: "aborted", reason: "source_question_not_found_or_empty" }
		}

		logger.info("successfully fetched source question", { questionId })

		// Extract xml to a const after the null check - TypeScript will understand it's non-null
		const sourceXml = sourceQuestion.xml

		// Step 2: Generate variations using the Gemini AI helper
		const generatedXmls = await step.run("generate-qti-variations", async () => {
			return generateQtiVariations(sourceXml, numberOfVariations, questionId, startingIndex)
		})

		if (generatedXmls.length === 0) {
			logger.warn("gemini returned no variations", { questionId })
			return { status: "completed_with_warning", reason: "no_variations_generated" }
		}

		logger.info("successfully generated qti variations", { questionId, count: generatedXmls.length })

		// MODIFIED: Return the generated XMLs directly instead of writing to a file.
		return {
			status: "success",
			questionId,
			generatedCount: generatedXmls.length,
			generatedXmls
		}
	}
)
