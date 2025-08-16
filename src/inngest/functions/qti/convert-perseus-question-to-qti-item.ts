import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { compile } from "@/lib/qti-generation/compiler"
import { ErrQuestionBlacklisted, isQuestionIdBlacklisted } from "@/lib/qti-generation/question-blacklist"
// MODIFIED: Import the new ErrWidgetNotFound error.
import {
	ErrUnsupportedInteraction,
	ErrWidgetNotFound,
	generateStructuredQtiItem
} from "@/lib/qti-generation/structured/client"
import { validateAndSanitizeHtmlFields } from "@/lib/qti-generation/structured/validator"

// A global key to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = "openai-api-global-concurrency"

export const convertPerseusQuestionToQtiItem = inngest.createFunction(
	{
		id: "convert-perseus-question-to-qti-item", // MODIFIED: Simplified ID
		name: "Convert Perseus Question to QTI Item" // MODIFIED: Simplified name
	},
	// MODIFIED: Updated event trigger to use the unified event and require widgetCollection.
	{
		event: "qti/item.migrate",
		concurrency: {
			limit: 400,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	async ({ event, logger }) => {
		// MODIFIED: Destructure widgetCollection as a required field.
		const { questionId, widgetCollection } = event.data
		// ✅ Enhanced logging at every step, using the provided logger.
		logger.info("starting perseus to qti conversion", { questionId, widgetCollection })

		// Blacklist check: immediately and permanently fail for blacklisted question IDs
		if (isQuestionIdBlacklisted(questionId)) {
			logger.error("question id is blacklisted for migration", { questionId })
			throw new NonRetriableError(ErrQuestionBlacklisted.message, { cause: ErrQuestionBlacklisted })
		}

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
		// MODIFIED: Pass widgetCollection directly - it's already typed from the event data
		const structuredItemResult = await errors.try(
			generateStructuredQtiItem(logger, question.parsedData, { widgetCollectionName: widgetCollection })
		)
		if (structuredItemResult.error) {
			logger.error("structured item generation failed", {
				questionId,
				error: structuredItemResult.error
			})

			// Check for the specific unsupported interaction error
			if (errors.is(structuredItemResult.error, ErrUnsupportedInteraction)) {
				// This item is fundamentally un-convertible. Fail the job permanently,
				// chaining the original error for full context in observability tools.
				logger.error("item is fundamentally un-convertible", { error: structuredItemResult.error, questionId })
				throw new NonRetriableError(structuredItemResult.error.message, {
					cause: structuredItemResult.error
				})
			}

			// ADDED: Check for the new WIDGET_NOT_FOUND bail condition.
			// This is a specific, non-retriable failure case.
			if (errors.is(structuredItemResult.error, ErrWidgetNotFound)) {
				logger.error("widget not found - non-retriable failure", { error: structuredItemResult.error, questionId })
				throw new NonRetriableError(structuredItemResult.error.message, {
					cause: structuredItemResult.error
				})
			}

			// For all other errors, maintain the existing retryable behavior.
			logger.error("structured item generation failed", { error: structuredItemResult.error, questionId })
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

			// Check if compilation failed due to unsupported interaction
			if (errors.is(compileResult.error, ErrUnsupportedInteraction)) {
				// This item contains unsupported interactions. Fail permanently.
				logger.error("compilation failed due to unsupported interaction", { error: compileResult.error, questionId })
				throw new NonRetriableError(compileResult.error.message, {
					cause: compileResult.error
				})
			}

			logger.error("qti compilation failed - general error", { error: compileResult.error, questionId })
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
