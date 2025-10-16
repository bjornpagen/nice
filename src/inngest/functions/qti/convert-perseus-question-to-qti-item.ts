import * as errors from "@superbuilders/errors"
import { compile } from "@superbuilders/qti-assessment-item-generator/compiler"
import {
	ErrUnsupportedInteraction,
	ErrWidgetNotFound,
	generateFromEnvelope
} from "@superbuilders/qti-assessment-item-generator/structured"
import { buildPerseusEnvelope } from "@superbuilders/qti-assessment-item-generator/structured/ai-context-builder"
import { widgetCollections } from "@superbuilders/qti-assessment-item-generator/widgets/collections"
import { eq } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import OpenAI from "openai"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
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
					exerciseTitle: niceExercises.title,
					xml: niceQuestions.xml,
					structuredJson: niceQuestions.structuredJson
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

		// Idempotency guard: skip if both XML and structured JSON already exist
		const hasXml = typeof questionData.xml === "string" && questionData.xml !== ""
		const hasStructuredJson = questionData.structuredJson !== undefined && questionData.structuredJson !== null
		if (hasXml && hasStructuredJson) {
			logger.info("skipping conversion: xml and structured json already exist", { questionId })
			return { status: "skipped", reason: "already_converted" }
		}
		logger.debug("db fetch successful", { questionId, exerciseTitle: questionData.exerciseTitle })

		// Steps 2-4 combined: build envelope, generate structured item, and compile to QTI XML in a single step.
		const generationAndCompile = await step.run("generate-and-compile-qti-item", async (): Promise<{ structuredItem: unknown; compiledXml: string }> => {
			// Build Perseus envelope using the library function.
			const built = await errors.try(buildPerseusEnvelope(questionData.parsedData))
			if (built.error) {
				logger.error("failed to build perseus envelope", { error: built.error })
				throw built.error
			}

			// Filter out non-image URLs (like Wikimedia Commons attribution pages)
			const envelope = built.data
			const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]

			// Filter multimodalImageUrls to only include actual image files
			if (Array.isArray(envelope.multimodalImageUrls)) {
				const filteredRasterUrls = envelope.multimodalImageUrls.filter((url: string) => {
					// Check if URL has an image extension
					const hasImageExtension = imageExtensions.some((ext) => url.toLowerCase().includes(ext))
					// Exclude wiki pages and other non-image URLs
					const isWikiPage = url.includes("/wiki/")
					return hasImageExtension && !isWikiPage
				})

				logger.debug("filtered multimodal image urls", {
					original: envelope.multimodalImageUrls.length,
					filtered: filteredRasterUrls.length,
					removed: envelope.multimodalImageUrls.filter((url: string) => !filteredRasterUrls.includes(url))
				})

				envelope.multimodalImageUrls = filteredRasterUrls
			}

			const WIDGETS = widgetCollections[widgetCollection]
			if (!WIDGETS) {
				logger.error("invalid widget collection", { widgetCollection })
				throw new NonRetriableError("Invalid widget collection")
			}
			const genResult = await errors.try(generateFromEnvelope(openai, logger, envelope, WIDGETS))
			if (genResult.error) {
				logger.error("failed to generate structured item from envelope", { error: genResult.error, questionId })
				if (errors.is(genResult.error, ErrUnsupportedInteraction)) {
					logger.error("item contains unsupported interaction", { error: genResult.error, questionId })
					throw new NonRetriableError(genResult.error.message, { cause: genResult.error })
				}
				if (errors.is(genResult.error, ErrWidgetNotFound)) {
					logger.error("widget not found - non-retriable failure", { error: genResult.error, questionId })
					throw new NonRetriableError(genResult.error.message, { cause: genResult.error })
				}
				logger.error("structured item generation retryable error", { error: genResult.error, questionId })
				throw genResult.error
			}
			const structuredItem = genResult.data
			const compileResult = await errors.try(compile(structuredItem, WIDGETS))
			if (compileResult.error) {
				logger.error("failed to compile structured item to xml", { error: compileResult.error, questionId })
				throw compileResult.error
			}
			return { structuredItem, compiledXml: compileResult.data }
		})

		// Step 5: Update database with BOTH structured JSON and compiled XML.
		logger.debug("updating database with generated structured json and xml", { questionId })
		const updateResult = await errors.try(
			db
				.update(niceQuestions)
				.set({
					xml: generationAndCompile.compiledXml,
					structuredJson: generationAndCompile.structuredItem
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
