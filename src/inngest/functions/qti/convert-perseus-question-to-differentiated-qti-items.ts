import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { compile } from "@/lib/qti-generation/compiler"
import { ErrWidgetNotFound, generateStructuredQtiItem } from "@/lib/qti-generation/structured/client"
import { differentiateAssessmentItem } from "@/lib/qti-generation/structured/differentiator"

// A global key to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = "openai-api-global-concurrency"

export const convertPerseusQuestionToDifferentiatedQtiItems = inngest.createFunction(
	{
		id: "convert-perseus-question-to-differentiated-qti-items",
		name: "Convert Perseus Question to Differentiated QTI Items",
		concurrency: {
			limit: 400,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	{ event: "qti/item.differentiate" },
	async ({ event, logger }) => {
		const { questionId, n } = event.data
		logger.info("starting perseus to differentiated qti items conversion", { questionId, variations: n })

		// Step 1: Fetch Perseus data from the database.
		logger.debug("fetching perseus data from db", { questionId })
		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData
				})
				.from(niceQuestions)
				.where(eq(niceQuestions.id, questionId))
				.limit(1)
		)
		if (questionResult.error) {
			logger.error("db query for question failed", { questionId, error: questionResult.error })
			throw errors.wrap(questionResult.error, "db query for question")
		}
		const question = questionResult.data[0]
		if (!question?.parsedData) {
			logger.warn("cannot proceed: no perseus data found for question", { questionId })
			return { status: "skipped", reason: "no_perseus_data" }
		}

		// Step 2: Generate a single, base structured JSON from the Perseus data.
		logger.debug("generating base structured item", { questionId })
		const structuredItemResult = await errors.try(generateStructuredQtiItem(logger, question.parsedData))
		if (structuredItemResult.error) {
			logger.error("base structured item generation failed", {
				questionId,
				error: structuredItemResult.error
			})
			// If the error is due to a missing widget, it's not retriable.
			if (errors.is(structuredItemResult.error, ErrWidgetNotFound)) {
				throw new NonRetriableError("Widget not found, this item cannot be migrated.", {
					cause: structuredItemResult.error
				})
			}
			throw structuredItemResult.error // Re-throw other errors to allow standard Inngest retries.
		}
		const structuredItem = structuredItemResult.data

		// Step 3: Fan out to the new differentiation function to generate 'n' variations.
		logger.debug("differentiating structured item", { questionId, variations: n })
		const differentiatedItemsResult = await errors.try(differentiateAssessmentItem(logger, structuredItem, n))
		if (differentiatedItemsResult.error) {
			logger.error("item differentiation failed", { questionId, error: differentiatedItemsResult.error })
			throw errors.wrap(differentiatedItemsResult.error, "item differentiation")
		}
		const differentiatedItems = differentiatedItemsResult.data

		// Step 4: Compile each differentiated item to QTI XML.
		logger.debug("compiling differentiated items to qti xml", { questionId, count: differentiatedItems.length })
		const compiledXmlItems: string[] = []

		for (let i = 0; i < differentiatedItems.length; i++) {
			const item = differentiatedItems[i]
			if (!item) {
				throw errors.new(`missing differentiated item at index ${i}`)
			}

			logger.debug("compiling item to xml", { questionId, itemIndex: i + 1, identifier: item.identifier })

			const compileResult = errors.trySync(() => compile(item))
			if (compileResult.error) {
				logger.error("failed to compile differentiated item to xml", {
					questionId,
					itemIndex: i + 1,
					identifier: item.identifier,
					error: compileResult.error
				})
				throw errors.wrap(compileResult.error, `xml compilation for item ${i + 1}`)
			}

			compiledXmlItems.push(compileResult.data)
			logger.debug("successfully compiled item to xml", {
				questionId,
				itemIndex: i + 1,
				identifier: item.identifier,
				xmlLength: compileResult.data.length
			})
		}

		// Step 5: Return the array of compiled QTI XML strings.
		logger.info("successfully completed generation and compilation of differentiated qti items", {
			questionId,
			generatedCount: differentiatedItems.length,
			totalXmlLength: compiledXmlItems.reduce((sum, xml) => sum + xml.length, 0)
		})

		return {
			status: "success",
			questionId,
			count: compiledXmlItems.length,
			items: compiledXmlItems
		}
	}
)
