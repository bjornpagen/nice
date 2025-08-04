import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateStructuredQtiItem } from "@/lib/perseus-qti/client"
import { compile } from "@/lib/qti/compiler"

// A global key to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = "openai-api-global-concurrency"

export const convertPerseusItemViaStructuredOutputs = inngest.createFunction(
	{
		id: "convert-perseus-item-via-structured-outputs",
		name: "Convert Perseus Item to QTI via Structured Outputs",
		concurrency: {
			limit: 800,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	{ event: "perseus/item.structured-convert-to-qti" },
	async ({ event, logger }) => {
		const { questionId } = event.data
		logger.info("starting perseus to qti conversion via structured outputs", { questionId })

		// Step 1: Fetch the source Perseus data from the database.
		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData,
					exerciseTitle: niceExercises.title
				})
				.from(niceQuestions)
				.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
				.where(eq(niceQuestions.id, questionId))
				.limit(1)
		)
		if (questionResult.error) {
			logger.error("failed to fetch question for conversion", { questionId, error: questionResult.error })
			throw errors.wrap(questionResult.error, "db query for question")
		}
		const question = questionResult.data[0]
		if (!question?.parsedData) {
			logger.warn("question has no parsed data, skipping conversion", { questionId })
			return { status: "skipped", reason: "no_perseus_data" }
		}

		// Step 2: Call the AI client to get a structured AssessmentItemInput object.
		// This step replaces direct XML generation with reliable JSON generation.
		const structuredItemResult = await errors.try(generateStructuredQtiItem(logger, question.parsedData))
		if (structuredItemResult.error) {
			logger.error("failed to generate structured item from perseus", {
				questionId,
				error: structuredItemResult.error
			})
			throw errors.wrap(structuredItemResult.error, "structured item generation")
		}
		const assessmentItemInput = structuredItemResult.data

		// Step 3: Pass the structured JSON object to the compiler to generate the final XML.
		// This step is deterministic and leverages our existing, robust compiler.
		const compileResult = errors.trySync(() => compile(assessmentItemInput))
		if (compileResult.error) {
			logger.error("failed to compile structured item to qti xml", {
				questionId,
				error: compileResult.error
			})
			throw errors.wrap(compileResult.error, "qti compilation")
		}
		const xml = compileResult.data

		// Step 4: Update the database with the new, validated QTI XML.
		const updateResult = await errors.try(db.update(niceQuestions).set({ xml }).where(eq(niceQuestions.id, questionId)))
		if (updateResult.error) {
			logger.error("failed to update question with new qti xml", { questionId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("successfully converted perseus item to qti via structured outputs", { questionId })
		return { status: "success", questionId: question.id }
	}
)
