import * as errors from "@superbuilders/errors"
import { compile } from "@superbuilders/qti-assessment-item-generator/compiler"
import type { AssessmentItemInput } from "@superbuilders/qti-assessment-item-generator/core/item"
import { differentiateAssessmentItem } from "@superbuilders/qti-assessment-item-generator/structured/differentiator"
import { widgetCollections } from "@superbuilders/qti-assessment-item-generator/widgets/collections"
import { eq } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import OpenAI from "openai"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import { DifferentiateQtiItemEventDataSchema } from "@/inngest/events/qti"
import { isQuestionIdBlacklisted } from "@/lib/qti-item/question-blacklist"

export const convertPerseusQuestionToDifferentiatedQtiItems = inngest.createFunction(
	{
		id: "convert-perseus-question-to-differentiated-qti-items",
		name: "Convert Perseus Question to Differentiated QTI Items"
	},
	{ event: "qti/item.differentiate" },
	async ({ event, step, logger }) => {
		// 1. Strict event.data validation with Zod. No fallbacks.
		const validationResult = DifferentiateQtiItemEventDataSchema.safeParse(event.data)
		if (!validationResult.success) {
			logger.error("invalid event.data payload", { error: validationResult.error })
			throw new NonRetriableError("Invalid event payload")
		}

    const { questionId, n, widgetCollection } = validationResult.data

		logger.info("starting differentiation flow", { questionId, variations: n })

		// Create OpenAI client using library's version for compatibility
		if (!env.OPENAI_API_KEY) {
			logger.error("missing required environment variable", { key: "OPENAI_API_KEY" })
			throw new NonRetriableError("Missing OpenAI API Key")
		}
		const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

		// 2. Enforce blacklist with NonRetriableError.
		if (isQuestionIdBlacklisted(questionId)) {
			logger.warn("question is blacklisted, job will not retry", { questionId })
			throw new NonRetriableError("Question is blacklisted")
		}

		// Step 1: Fetch base structured item and exercise metadata from database.
		logger.debug("fetching exercise metadata from db", { questionId })
		const exerciseResult = await errors.try(
			db
				.select({
					exerciseId: niceQuestions.exerciseId,
					exerciseTitle: niceExercises.title,
					exerciseSlug: niceExercises.slug,
					structuredJson: niceQuestions.structuredJson
				})
				.from(niceQuestions)
				.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
				.where(eq(niceQuestions.id, questionId))
				.limit(1)
		)
		if (exerciseResult.error) {
			logger.error("db query for exercise metadata failed", { questionId, error: exerciseResult.error })
			throw errors.wrap(exerciseResult.error, "db query for exercise metadata")
		}
		const exerciseData = exerciseResult.data[0]
		if (!exerciseData) {
			logger.error("exercise metadata not found", { questionId })
			throw errors.new("exercise metadata not found")
		}
		if (!exerciseData.structuredJson) {
			logger.error("missing structured json for question", { questionId })
			throw new NonRetriableError("Missing structured item for differentiation")
		}

		// Step 2: Load the base structured item directly from DB.
		const baseItem = exerciseData.structuredJson as AssessmentItemInput<readonly string[]>

		// Step 3: Differentiate the base item using the library's differentiator.
        const differentiatedItems = await step.run("differentiate-items", async () => {
            const WIDGETS = widgetCollections[widgetCollection]
            if (!WIDGETS) {
                logger.error("invalid widget collection", { widgetCollection })
                throw new NonRetriableError("Invalid widget collection")
            }
            const result = await errors.try(differentiateAssessmentItem(openai, logger, baseItem, n, WIDGETS))
			if (result.error) {
				logger.error("failed to differentiate items", { error: result.error })
				throw result.error
			}
			// NO FALLBACK: If differentiation returns no items, it is a critical failure.
			if (result.data.length === 0) {
				logger.error("differentiation returned zero items", { n })
				throw errors.new("differentiation returned zero items")
			}
			return result.data
		})

		// Step 4: Compile each differentiated item to QTI XML with proper identifiers.
		const compiledItems: Array<{
			xml: string
			metadata: {
				khanId: string
				khanExerciseId: string
				khanExerciseSlug: string
				khanExerciseTitle: string
			}
		}> = []

		for (let i = 0; i < differentiatedItems.length; i++) {
			const item = differentiatedItems[i]
			if (!item) {
				logger.error("missing differentiated item at index", { index: i, questionId })
				throw errors.new(`missing differentiated item at index ${i}`)
			}

			// Generate a proper QTI identifier: nice_{khanId}_{5-digit-random}
			const randomSuffix = Math.floor(10000 + Math.random() * 90000)
			const qtiIdentifier = `nice_${questionId}_${randomSuffix}`

			// Update the item identifier before compilation
			const itemWithNewIdentifier: AssessmentItemInput<readonly string[]> = {
				...item,
				identifier: qtiIdentifier
			}

            const WIDGETS = widgetCollections[widgetCollection]
            const compileResult = await errors.try(compile(itemWithNewIdentifier, WIDGETS))
			if (compileResult.error) {
				logger.error("failed to compile differentiated item to xml, skipping", {
					questionId,
					itemIndex: i + 1,
					identifier: qtiIdentifier,
					error: compileResult.error
				})
				continue
			}

			compiledItems.push({
				xml: compileResult.data,
				metadata: {
					khanId: questionId,
					khanExerciseId: exerciseData.exerciseId,
					khanExerciseSlug: exerciseData.exerciseSlug,
					khanExerciseTitle: exerciseData.exerciseTitle
				}
			})
		}

		logger.info("differentiation completed", { questionId, generatedCount: compiledItems.length })
		return compiledItems
	}
)
