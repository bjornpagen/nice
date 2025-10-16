import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { WidgetCollectionNameSchema, type WidgetCollectionName } from "@/inngest/events/qti"
import { inngest } from "@/inngest/client"
import { convertPerseusQuestionToQtiItem } from "@/inngest/functions/qti/convert-perseus-question-to-qti-item"

type SupportedCollectionInput = "science" | "math" | "simple"
const collectionMap: Record<SupportedCollectionInput, WidgetCollectionName> = {
	science: "science",
	math: "math-core",
	simple: "simple-visual"
}

export const requestItemMigrationsForExercise = inngest.createFunction(
	{
		id: "request-item-migrations-for-exercise",
		name: "Request Item Migrations For Exercise"
	},
	{ event: "qti/exercise.items.migrate" },
	async ({ event, step, logger }) => {
		const PayloadSchema = z.object({
			exerciseId: z.string(),
			widgetCollection: z.enum(["science", "math", "simple"])
		})
		const parsed = PayloadSchema.safeParse(event.data)
		if (!parsed.success) {
			logger.error("invalid payload for exercise item migrations", { error: parsed.error })
			throw errors.new("invalid payload")
		}
		const { exerciseId, widgetCollection: widgetCollectionRaw } = parsed.data

		logger.info("starting exercise item migrations", { exerciseId, widgetCollection: widgetCollectionRaw })

		// exerciseId and widgetCollectionRaw are guaranteed by schema

		const widgetCollection = collectionMap[widgetCollectionRaw]

		// Fetch questions for the exercise (outside of step.run per rules)
		const questionsResult = await errors.try(
			db.select({ id: niceQuestions.id }).from(niceQuestions).where(eq(niceQuestions.exerciseId, exerciseId))
		)
		if (questionsResult.error) {
			logger.error("db query for exercise questions failed", { exerciseId, error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "db query for exercise questions")
		}

		const questionIds = questionsResult.data.map((q) => q.id)
		if (questionIds.length === 0) {
			logger.info("no questions found for exercise", { exerciseId })
			return { status: "skipped", reason: "no_questions", exerciseId }
		}

		logger.info("dispatching per-question migrations via step.invoke", { exerciseId, count: questionIds.length })

		const invocations = questionIds.map((questionId) =>
			step.invoke(`invoke-qti-item-migrate-${questionId}`, {
				function: convertPerseusQuestionToQtiItem,
				data: { questionId, widgetCollection }
			})
		)

		await Promise.all(invocations)

		logger.info("exercise item migrations completed", { exerciseId, migratedCount: questionIds.length })
		return { status: "completed", exerciseId, migratedCount: questionIds.length }
	}
)
