import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
// ADD: Import NonRetriableError from the Inngest SDK.
// removed NonRetriableError: no special non-retriable handling needed
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { compile } from "@/lib/qti-generation/compiler"
// ADD: Import our new constant error and the generator function.
import { generateStructuredQtiItem } from "@/lib/qti-generation/structured/client"
// NEW: Import the validator function
import { validateAndSanitizeHtmlFields } from "@/lib/qti-generation/structured/validator"

// A global key to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = "openai-api-global-concurrency"

export const convertPerseusQuestionToQtiItem = inngest.createFunction(
	{
		id: "convert-perseus-question-to-qti-item",
		name: "Convert Perseus Question to QTI Item",
		concurrency: {
			limit: 400,
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

			// For all other errors, maintain the existing retryable behavior.
			throw errors.wrap(structuredItemResult.error, "structured item generation")
		}
		const assessmentItemInput = structuredItemResult.data
		logger.debug("structured item generation successful", {
			questionId,
			identifier: assessmentItemInput.identifier
		})

		// NEW Step 2.5: Validate and Sanitize all HTML content before compiling.
		// This is the "fail-fast" step.
		logger.debug("validating and sanitizing all html fields", { questionId })
		const sanitizedItemResult = errors.trySync(() => validateAndSanitizeHtmlFields(assessmentItemInput, logger))
		if (sanitizedItemResult.error) {
			logger.error("structured item content validation failed", {
				questionId,
				error: sanitizedItemResult.error
			})
			// Throw the error to fail the Inngest job, which will trigger a retry.
			throw sanitizedItemResult.error
		}
		const sanitizedAssessmentItem = sanitizedItemResult.data
		logger.debug("html content validation and sanitization successful", { questionId })

		// Step 3: Compile structured JSON to QTI XML.
		logger.debug("compiling structured item to xml", { questionId })
		// Pass the sanitized object to the compiler.
		const compileResult = errors.trySync(() => compile(sanitizedAssessmentItem))
		if (compileResult.error) {
			logger.error("qti compilation failed", {
				questionId,
				error: compileResult.error
			})
			throw errors.wrap(compileResult.error, "qti compilation")
		}
		const xml = compileResult.data
		logger.debug("compilation successful", { questionId, xmlLength: xml.length })

		// Step 4: Update database with BOTH structured JSON and compiled XML.
		logger.debug("updating database with generated structured json and xml", { questionId })
		const updateResult = await errors.try(
			db
				.update(niceQuestions)
				.set({
					xml,
					structuredJson: sanitizedAssessmentItem
				})
				.where(eq(niceQuestions.id, questionId))
		)
		if (updateResult.error) {
			logger.error("db update failed", { questionId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("conversion successful", { questionId })
		return { status: "success", questionId: question.id }
	}
)
