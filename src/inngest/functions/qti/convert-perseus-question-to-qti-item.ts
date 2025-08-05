import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
// ADD: Import NonRetriableError from the Inngest SDK.
import { NonRetriableError } from "inngest"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { compile } from "@/lib/qti-generation/compiler"
// ADD: Import our new constant error and the generator function.
import { ErrWidgetNotFound, generateStructuredQtiItem } from "@/lib/qti-generation/structured/client"

// A global key to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = "openai-api-global-concurrency"

export const convertPerseusQuestionToQtiItem = inngest.createFunction(
	{
		id: "convert-perseus-question-to-qti-item",
		name: "Convert Perseus Question to QTI Item",
		concurrency: {
			limit: 800,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	{ event: "qti/item.migrate" },
	async ({ event, logger }) => {
		const { questionId } = event.data
		// ✅ Enhanced logging at every step, using the provided logger.
		logger.info("starting perseus to qti conversion", { questionId })

		// Step 1: Fetch Perseus data.
		logger.debug("fetching perseus data from db", { questionId })
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
			logger.error("db query for question failed", { questionId, error: questionResult.error })
			throw errors.wrap(questionResult.error, "db query for question")
		}
		const question = questionResult.data[0]
		if (!question?.parsedData) {
			logger.warn("skipping conversion: no perseus data", { questionId })
			return { status: "skipped", reason: "no_perseus_data" }
		}
		logger.debug("db fetch successful", { questionId, exerciseTitle: question.exerciseTitle })

		// Step 2: Generate structured JSON from Perseus data.
		logger.debug("invoking structured item generation pipeline", { questionId })
		const structuredItemResult = await errors.try(generateStructuredQtiItem(logger, question.parsedData))
		if (structuredItemResult.error) {
			logger.error("structured item generation failed", {
				questionId,
				error: structuredItemResult.error
			})

			// ADD: New error handling logic for non-retriable failures.
			// Check if the caught error is an instance of our specific error.
			if (errors.is(structuredItemResult.error, ErrWidgetNotFound)) {
				// If it matches, wrap the original error in a NonRetriableError.
				// This instructs Inngest to halt retries for this event.
				throw new NonRetriableError(structuredItemResult.error.message, {
					cause: structuredItemResult.error
				})
			}

			// For all other errors, maintain the existing retryable behavior.
			throw errors.wrap(structuredItemResult.error, "structured item generation")
		}
		const assessmentItemInput = structuredItemResult.data
		logger.debug("structured item generation successful", {
			questionId,
			identifier: assessmentItemInput.identifier
		})

		// Step 3: Compile structured JSON to QTI XML.
		logger.debug("compiling structured item to xml", { questionId })
		const compileResult = errors.trySync(() => compile(assessmentItemInput))
		if (compileResult.error) {
			logger.error("qti compilation failed", {
				questionId,
				error: compileResult.error
			})
			throw errors.wrap(compileResult.error, "qti compilation")
		}
		const xml = compileResult.data
		logger.debug("compilation successful", { questionId, xmlLength: xml.length })

		// Step 4: Update database.
		logger.debug("updating database with generated xml", { questionId })
		const updateResult = await errors.try(db.update(niceQuestions).set({ xml }).where(eq(niceQuestions.id, questionId)))
		if (updateResult.error) {
			logger.error("db update failed", { questionId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("conversion successful", { questionId })
		return { status: "success", questionId: question.id }
	}
)
