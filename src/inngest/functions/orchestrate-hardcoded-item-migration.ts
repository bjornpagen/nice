import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"

const HARDCODED_COURSE_IDS = [
	// "xb5feb28c", // Early math review
	// "x3184e0ec", // 2nd grade math
	// "x3c950fa744f5f34c", // Get ready for 3rd grade math
	// "x41fbdd6301d5fded", // 3rd grade math
	// "xfb4fc0bf01437792", // 2nd grade reading & vocabulary
	// "xaf0c1b5d7010608e", // 3rd grade reading & vocabulary
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

export const orchestrateHardcodedItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-item-migration",
		name: "Orchestrate Hardcoded Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.items.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded perseus to qti item migration", {
			courseCount: HARDCODED_COURSE_IDS.length
		})

		// Step 1: Find all unit IDs for the hardcoded courses.
		const unitsResult = await errors.try(
			db
				.select({ id: schema.niceUnits.id })
				.from(schema.niceUnits)
				.where(inArray(schema.niceUnits.courseId, HARDCODED_COURSE_IDS))
		)
		if (unitsResult.error) {
			logger.error("failed to fetch units for courses", { courseIds: HARDCODED_COURSE_IDS, error: unitsResult.error })
			throw errors.wrap(unitsResult.error, "db query for units")
		}
		const unitIds = unitsResult.data.map((u) => u.id)
		if (unitIds.length === 0) {
			logger.info("no units found for hardcoded courses, ending early", { courseIds: HARDCODED_COURSE_IDS })
			return { message: "No units found for courses." }
		}

		// Step 2: Find all questions within those units.
		// We migrate all questions regardless of whether they have XML or not to ensure they are up-to-date.
		const questionsToMigrate = await db
			.selectDistinct({ id: schema.niceQuestions.id })
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(inArray(schema.niceLessons.unitId, unitIds))

		logger.info("found assessment items (questions) to migrate", {
			count: questionsToMigrate.length
		})

		if (questionsToMigrate.length === 0) {
			logger.info("no questions found for hardcoded courses, ending.", { courseIds: HARDCODED_COURSE_IDS })
			return { message: "No questions found for the specified courses." }
		}

		// Step 3: Create event payloads for all items.
		const itemEvents: Events["qti/item.migrate"][] = questionsToMigrate.map((question) => ({
			name: "qti/item.migrate",
			data: { questionId: question.id }
		}))

		// Step 4: Send all events in batches.
		await step.run("send-item-migration-events", async () => {
			const BATCH_SIZE = 500
			for (let i = 0; i < itemEvents.length; i += BATCH_SIZE) {
				const batch = itemEvents.slice(i, i + BATCH_SIZE)
				await inngest.send(batch)
				logger.debug("sent item migration event batch", {
					batchNumber: i / BATCH_SIZE + 1,
					size: batch.length
				})
			}
		})

		logger.info("successfully dispatched all qti item migration events", {
			dispatchedCount: itemEvents.length
		})

		return {
			status: "complete",
			courseCount: HARDCODED_COURSE_IDS.length,
			itemsDispatched: itemEvents.length
		}
	}
)
