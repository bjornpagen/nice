import * as errors from "@superbuilders/errors"
import { and, inArray, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"
import { HARDCODED_SUPPLEMENTARY_SCIENCE_EXERCISE_SLUGS } from "@/lib/constants/course-mapping"

// Use science supplementary slugs
export const HARDCODED_EXERCISE_SLUGS: string[] = HARDCODED_SUPPLEMENTARY_SCIENCE_EXERCISE_SLUGS as string[]

export const orchestrateHardcodedExerciseSlugsItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-exercise-slugs-item-migration",
		name: "Orchestrate Hardcoded Exercise Slugs Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.exercise-slugs.items.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching item migrations for hardcoded exercise slugs", {
			slugCount: HARDCODED_EXERCISE_SLUGS.length
		})

		// 1) Resolve exercise IDs from slugs
		const exercisesResult = await errors.try(
			db
				.select({ id: schema.niceExercises.id, slug: schema.niceExercises.slug })
				.from(schema.niceExercises)
				.where(inArray(schema.niceExercises.slug, HARDCODED_EXERCISE_SLUGS))
		)
		if (exercisesResult.error) {
			logger.error("db query for exercises by slug failed", { error: exercisesResult.error })
			throw errors.wrap(exercisesResult.error, "db query for exercises by slug")
		}

		const foundExerciseIds = exercisesResult.data.map((e) => e.id)
		const foundSlugs = new Set(exercisesResult.data.map((e) => e.slug))
		const missingSlugs = HARDCODED_EXERCISE_SLUGS.filter((s) => !foundSlugs.has(s))

		if (missingSlugs.length > 0) {
			logger.warn?.("some exercise slugs not found", { count: missingSlugs.length, slugs: missingSlugs })
		}

		if (foundExerciseIds.length === 0) {
			logger.info("no exercises found for provided slugs, skipping migration dispatch")
			return { status: "complete", slugCount: HARDCODED_EXERCISE_SLUGS.length, exercisesFound: 0, itemsDispatched: 0 }
		}

		// 2) Fetch questions for those exercises that still need migration
		const questionsResult = await errors.try(
			db
				.select({ id: schema.niceQuestions.id })
				.from(schema.niceQuestions)
				.where(
					and(
						inArray(schema.niceQuestions.exerciseId, foundExerciseIds),
						or(isNull(schema.niceQuestions.xml), isNull(schema.niceQuestions.structuredJson))
					)
				)
		)
		if (questionsResult.error) {
			logger.error("db query for questions by exercise ids failed", { error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "db query for questions by exercises")
		}

		const questionIds = questionsResult.data.map((q) => q.id)
		if (questionIds.length === 0) {
			logger.info("no questions need migration for provided exercises", { exerciseCount: foundExerciseIds.length })
			return {
				status: "complete",
				slugCount: HARDCODED_EXERCISE_SLUGS.length,
				exercisesFound: foundExerciseIds.length,
				itemsDispatched: 0
			}
		}

		// 3) Build and send per-question item migration events in batches
		const itemEvents: Events["qti/item.migrate"][] = questionIds.map((questionId) => ({
			name: "qti/item.migrate",
			data: {
				questionId,
				widgetCollection: "math-core" // Math-focused collection across listed grades
			}
		}))

		const BATCH_SIZE = 500
		for (let i = 0; i < itemEvents.length; i += BATCH_SIZE) {
			const batch = itemEvents.slice(i, i + BATCH_SIZE)
			const sendResult = await errors.try(inngest.send(batch))
			if (sendResult.error) {
				logger.error("failed to send item migration event batch", { error: sendResult.error })
				throw errors.wrap(sendResult.error, "inngest batch send")
			}
			logger.debug("sent item migration event batch", { batchNumber: i / BATCH_SIZE + 1, size: batch.length })
		}

		logger.info("successfully dispatched item migrations for exercise slugs", {
			itemsDispatched: itemEvents.length,
			exercisesFound: foundExerciseIds.length
		})

		return {
			status: "complete",
			slugCount: HARDCODED_EXERCISE_SLUGS.length,
			exercisesFound: foundExerciseIds.length,
			itemsDispatched: itemEvents.length
		}
	}
)


