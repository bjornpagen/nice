import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
// removed NonRetriableError: no special non-retriable handling needed
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { compile } from "@/lib/qti-generation/compiler"
import type { AssessmentItemInput } from "@/lib/qti-generation/schemas"
// No longer generating from Perseus in this pipeline
import { differentiateAssessmentItem } from "@/lib/qti-generation/structured/differentiator"
import { validateAndSanitizeHtmlFields } from "@/lib/qti-generation/structured/validator"

// validation pipeline removed from this function per PRD

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function isAssessmentItemInput(value: unknown): value is AssessmentItemInput {
	if (!isRecord(value)) return false
	if (typeof value.identifier !== "string") return false
	if (typeof value.title !== "string") return false
	if (!Array.isArray(value.responseDeclarations)) return false
	if (!isRecord(value.feedback)) return false
	if (!Array.isArray(value.feedback.correct)) return false
	if (!Array.isArray(value.feedback.incorrect)) return false
	// body and widgets can be null, interactions can be null or a record – not strictly required for basic shape check
	return true
}

// ✅ ADD: New exportable helper function containing the original file's core logic.
export async function generateDifferentiatedItems(
	questionId: string,
	n: number,
	logger: {
		info: (message: string, attributes?: Record<string, unknown>) => void
		debug: (message: string, attributes?: Record<string, unknown>) => void
		warn: (message: string, attributes?: Record<string, unknown>) => void
		error: (message: string, attributes?: Record<string, unknown>) => void
	}
): Promise<
	Array<{
		xml: string
		metadata: {
			khanId: string
			khanExerciseId: string
			khanExerciseSlug: string
			khanExerciseTitle: string
		}
	}>
> {
	// This is the exact logic from the original Inngest function, now extracted.
	logger.info("starting perseus to differentiated qti items conversion", { questionId, variations: n })

	// Step 1: Fetch Perseus data and exercise metadata from the database.
	logger.debug("fetching pre-generated structured json and exercise metadata from db", { questionId })
	const questionResult = await errors.try(
		db
			.select({
				exerciseId: niceQuestions.exerciseId,
				structuredJson: niceQuestions.structuredJson,
				exerciseTitle: niceExercises.title,
				exerciseSlug: niceExercises.slug
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.where(eq(niceQuestions.id, questionId))
			.limit(1)
	)
	if (questionResult.error) {
		logger.error("db query for question and exercise failed", { questionId, error: questionResult.error })
		throw errors.wrap(questionResult.error, "db query for question and exercise")
	}
	const question = questionResult.data[0]
	if (!question?.structuredJson) {
		logger.error("cannot proceed: no pre-generated structured json found for question", { questionId })
		throw errors.new(`pre-requisite failed: structuredJson is missing for questionId ${questionId}`)
	}

	if (!isAssessmentItemInput(question.structuredJson)) {
		logger.error("invalid structured json shape in database for question", { questionId })
		throw errors.new("invalid structured json shape")
	}

	// Step 2: Use the pre-generated structured JSON from the database.
	const structuredItem = question.structuredJson

	// Step 3: Fan out to the new differentiation function to generate 'n' variations.
	logger.debug("differentiating structured item", { questionId, variations: n })
	const differentiatedItemsResult = await errors.try(differentiateAssessmentItem(logger, structuredItem, n))
	if (differentiatedItemsResult.error) {
		logger.error("item differentiation failed", { questionId, error: differentiatedItemsResult.error })
		throw errors.wrap(differentiatedItemsResult.error, "item differentiation")
	}
	const differentiatedItems = differentiatedItemsResult.data

	// Step 4: Compile each differentiated item to QTI XML with proper identifiers and metadata.
	logger.debug("compiling differentiated items to qti xml", { questionId, count: differentiatedItems.length })
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
			throw errors.new(`missing differentiated item at index ${i}`)
		}

		// Generate a proper QTI identifier: nice_{khanId}_{5-digit-random}
		const randomSuffix = Math.floor(10000 + Math.random() * 90000) // 5-digit random number
		const qtiIdentifier = `nice_${questionId}_${randomSuffix}`

		// Update the item identifier before compilation
		const itemWithNewIdentifier = {
			...item,
			identifier: qtiIdentifier
		}

		// Step 4.1: JSON-level validation and sanitization
		logger.debug("sanitizing differentiated json", { questionId, itemIndex: i + 1, identifier: qtiIdentifier })
		const sanitizedItemResult = errors.trySync(() => validateAndSanitizeHtmlFields(itemWithNewIdentifier, logger))
		if (sanitizedItemResult.error) {
			logger.warn("failed to sanitize/validate differentiated item json, skipping this variation", {
				questionId,
				itemIndex: i + 1,
				identifier: qtiIdentifier,
				error: sanitizedItemResult.error
			})
			continue
		}
		const sanitizedItem = sanitizedItemResult.data

		logger.debug("compiling item to xml", {
			questionId,
			itemIndex: i + 1,
			originalIdentifier: item.identifier,
			newIdentifier: qtiIdentifier
		})

		const compileResult = errors.trySync(() => compile(sanitizedItem))
		if (compileResult.error) {
			// Make resilient: log and continue to next variation instead of throwing
			logger.error("failed to compile a single differentiated item to xml, skipping this variation", {
				questionId,
				itemIndex: i + 1,
				identifier: qtiIdentifier,
				error: compileResult.error
			})
			continue
		}
		const compiledXml = compileResult.data

		// Create the output item in the same format as assessmentItems.json, using compiled XML directly
		const outputItem = {
			xml: compiledXml,
			metadata: {
				khanId: questionId,
				khanExerciseId: question.exerciseId,
				khanExerciseSlug: question.exerciseSlug,
				khanExerciseTitle: question.exerciseTitle
			}
		}

		compiledItems.push(outputItem)

		logger.debug("successfully compiled item to xml", {
			questionId,
			itemIndex: i + 1,
			identifier: qtiIdentifier,
			xmlLength: compiledXml.length
		})
	}

	// Step 5: Return just the array of compiled items (no wrapper object).
	logger.info("successfully completed generation and compilation of differentiated qti items", {
		questionId,
		attemptedCount: differentiatedItems.length,
		generatedCount: compiledItems.length,
		totalXmlLength: compiledItems.reduce((sum, item) => sum + item.xml.length, 0)
	})

	return compiledItems
}

// ✅ MODIFIED: The Inngest function is now a thin wrapper around the new helper.
export const convertPerseusQuestionToDifferentiatedQtiItems = inngest.createFunction(
	{
		id: "convert-perseus-question-to-differentiated-qti-items",
		name: "Convert Perseus Question to Differentiated QTI Items"
	},
	{ event: "qti/item.differentiate" },
	async ({ event, logger }) => {
		return generateDifferentiatedItems(event.data.questionId, event.data.n, logger)
	}
)
