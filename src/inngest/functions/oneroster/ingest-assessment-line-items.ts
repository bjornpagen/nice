import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"

// Define the Zod schema for the line item payload
const AssessmentLineItemSchema = z.object({
	sourcedId: z.string(),
	title: z.string(),
	status: z.literal("active"),
	category: z.object({
		sourcedId: z.string(),
		type: z.literal("category")
	}),
	parentAssessmentLineItem: z
		.object({
			sourcedId: z.string(),
			type: z.literal("assessmentLineItem")
		})
		.optional(),
	componentResource: z
		.object({
			sourcedId: z.string(),
			type: z.literal("componentResource")
		})
		.optional(),
	metadata: z.record(z.string(), z.any()).optional()
})

type AssessmentLineItemPayload = z.infer<typeof AssessmentLineItemSchema>

const EventDataSchema = z.object({
	assessmentLineItems: z.array(z.unknown())
})

export const ingestAssessmentLineItems = inngest.createFunction(
	{ id: "ingest-assessment-line-items", name: "Ingest Assessment Line Items Hierarchically" },
	{ event: "oneroster/assessment-line-items.ingest" },
	async ({ event, step, logger }) => {
		// Validate event data structure
		const eventDataResult = EventDataSchema.safeParse(event.data)
		if (!eventDataResult.success) {
			logger.error("invalid event data structure", { error: eventDataResult.error })
			throw errors.new("event data must contain assessmentLineItems array")
		}

		// Validate each item in the array
		const validatedItems: AssessmentLineItemPayload[] = []
		const invalidItems: unknown[] = []

		for (const item of eventDataResult.data.assessmentLineItems) {
			const itemResult = AssessmentLineItemSchema.safeParse(item)
			if (itemResult.success) {
				validatedItems.push(itemResult.data)
			} else {
				invalidItems.push(item)
			}
		}

		logger.info("starting assessment line item ingestion", {
			totalCount: validatedItems.length,
			invalidCount: invalidItems.length
		})

		if (validatedItems.length === 0) {
			return { status: "skipped", reason: "no_line_items" }
		}

		// Group items by their hierarchical level and type
		const courseChallenges = validatedItems.filter((li) => !li.parentAssessmentLineItem && !li.componentResource)
		const unitTests = validatedItems.filter(
			(li) =>
				li.parentAssessmentLineItem &&
				courseChallenges.some((cc) => cc.sourcedId === li.parentAssessmentLineItem?.sourcedId)
		)
		const quizzes = validatedItems.filter(
			(li) =>
				li.parentAssessmentLineItem && unitTests.some((ut) => ut.sourcedId === li.parentAssessmentLineItem?.sourcedId)
		)
		const exercises = validatedItems.filter(
			(li) => li.parentAssessmentLineItem && quizzes.some((q) => q.sourcedId === li.parentAssessmentLineItem?.sourcedId)
		)
		const completionItems = validatedItems.filter((li) => !li.parentAssessmentLineItem && li.componentResource)

		const runUpsertBatch = async (items: AssessmentLineItemPayload[], stepName: string) => {
			if (items.length === 0) {
				logger.info("no items to process for step", { stepName })
				return
			}
			await step.run(stepName, async () => {
				const promises = items.map(async (item) => {
					const result = await errors.try(oneroster.putAssessmentLineItem(item.sourcedId, { assessmentLineItem: item }))
					if (result.error) {
						logger.error("failed to upsert assessment line item", { sourcedId: item.sourcedId, error: result.error })
						throw result.error
					}
					return { sourcedId: item.sourcedId, success: true }
				})
				return Promise.all(promises)
			})
			logger.info("successfully ingested batch", { step: stepName, count: items.length })
		}

		// Ingest hierarchically, ensuring parents are created before children
		await runUpsertBatch(courseChallenges, "ingest-course-challenges")
		await runUpsertBatch(unitTests, "ingest-unit-tests")
		await runUpsertBatch(quizzes, "ingest-quizzes")
		await runUpsertBatch(exercises, "ingest-exercises")

		// Ingest non-hierarchical items in parallel
		await runUpsertBatch(completionItems, "ingest-completion-items")

		logger.info("all assessment line items ingestion steps completed")
		return { status: "success", totalIngested: validatedItems.length }
	}
)
