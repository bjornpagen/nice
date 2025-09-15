import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateFromEnvelope, ErrUnsupportedInteraction, ErrWidgetNotFound } from "@superbuilders/qti-assessment-item-generator/structured"
import { compile } from "@superbuilders/qti-assessment-item-generator/compiler"
import { buildPerseusEnvelope } from "@superbuilders/qti-assessment-item-generator/structured/ai-context-builder";
// @ts-ignore - using 's OpenAI version for compatibility
import OpenAI from "@superbuilders/qti-assessment-item-generator/node_modules/openai"
import { env } from "@/env"
import { MigrateQtiItemEventDataSchema } from "@/inngest/events/qti"
import { isQuestionIdBlacklisted } from "@/lib/qti-item/question-blacklist"

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
	async ({ event, step, logger }) => {
		// 1. Strict event.data validation with Zod. No fallbacks.
		const validationResult = MigrateQtiItemEventDataSchema.safeParse(event.data)
		if (!validationResult.success) {
			logger.error("invalid event.data payload", { error: validationResult.error })
			throw new NonRetriableError("Invalid event payload")
		}
		
		// 2. Destructure validated data. widgetCollection is now guaranteed to exist.
		const { questionId, widgetCollection } = validationResult.data

		logger.info("starting perseus to qti conversion", { questionId, widgetCollection })

		const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
		// Use centralized OpenAI client (validated at startup)

		// 3. Enforce blacklist with NonRetriableError.
		if (isQuestionIdBlacklisted(questionId)) {
			logger.warn("question is blacklisted, job will not retry", { questionId })
			throw new NonRetriableError("Question is blacklisted")
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
		const questionData = questionResult.data[0]
		if (!questionData?.parsedData) {
			logger.warn("skipping conversion: no perseus data", { questionId })
			return { status: "skipped", reason: "no_perseus_data" }
		}
		logger.debug("db fetch successful", { questionId, exerciseTitle: questionData.exerciseTitle })

		// Step 2: Build Perseus envelope using the new library function.
		const envelopeResult = await step.run("build-perseus-envelope", async () => {
			const result = await errors.try(buildPerseusEnvelope(questionData.parsedData))
			if (result.error) {
				logger.error("failed to build perseus envelope", { error: result.error })
				throw result.error
			}
			return result.data
		})

		// Step 3: Generate the structured QTI item from the envelope.
		const structuredItemResult = await step.run("generate-structured-item-from-envelope", async () => {
			const result = await errors.try(
				generateFromEnvelope(openai, logger, envelopeResult, widgetCollection)
			)
			if (result.error) {
				logger.error("failed to generate structured item from envelope", { error: result.error })
				
				// Check for specific non-retriable errors from the library
				if (errors.is(result.error, ErrUnsupportedInteraction)) {
					logger.error("item contains unsupported interaction", { error: result.error, questionId })
					throw new NonRetriableError(result.error.message, { cause: result.error })
				}
				
				if (errors.is(result.error, ErrWidgetNotFound)) {
					logger.error("widget not found - non-retriable failure", { error: result.error, questionId })
					throw new NonRetriableError(result.error.message, { cause: result.error })
				}
				
				throw result.error
			}
			return result.data
		})

		// Step 4: Compile the structured item into QTI XML using the library.
		const compiledXmlResult = await step.run("compile-qti-xml", async () => {
			const result = await errors.try(compile(structuredItemResult))
			if (result.error) {
				logger.error("failed to compile structured item to xml", { error: result.error })
				throw result.error
			}
			return result.data
		})

		// Step 5: Update database with BOTH structured JSON and compiled XML.
		logger.debug("updating database with generated structured json and xml", { questionId })
		const updateResult = await errors.try(
			db
				.update(niceQuestions)
				.set({
					xml: compiledXmlResult,
					structuredJson: structuredItemResult
				})
				.where(eq(niceQuestions.id, questionId))
		)
		if (updateResult.error) {
			logger.error("db update failed", { questionId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("conversion successful", { questionId })
		return { status: "success", questionId: questionData.id }
	}
)
