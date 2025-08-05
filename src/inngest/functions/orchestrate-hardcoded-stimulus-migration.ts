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

export const orchestrateHardcodedStimulusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-stimulus-migration",
		name: "Orchestrate Hardcoded Perseus to QTI Stimulus Migration"
	},
	{ event: "migration/hardcoded.stimuli.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded perseus to qti stimulus migration", {
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

		// Step 2: Find all articles within those units.
		// We migrate all articles regardless of whether they have XML or not to ensure they are up-to-date.
		const articlesToMigrate = await db
			.selectDistinct({ id: schema.niceArticles.id })
			.from(schema.niceArticles)
			.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(inArray(schema.niceLessons.unitId, unitIds))

		logger.info("found assessment stimuli (articles) to migrate", {
			count: articlesToMigrate.length
		})

		if (articlesToMigrate.length === 0) {
			logger.info("no articles found for hardcoded courses, ending.", { courseIds: HARDCODED_COURSE_IDS })
			return { message: "No articles found for the specified courses." }
		}

		// Step 3: Create event payloads for all stimuli.
		const stimulusEvents: Events["qti/stimulus.migrate"][] = articlesToMigrate.map((article) => ({
			name: "qti/stimulus.migrate",
			data: { articleId: article.id }
		}))

		// Step 4: Send all events in batches.
		await step.run("send-stimulus-migration-events", async () => {
			const BATCH_SIZE = 500
			for (let i = 0; i < stimulusEvents.length; i += BATCH_SIZE) {
				const batch = stimulusEvents.slice(i, i + BATCH_SIZE)
				await inngest.send(batch)
				logger.debug("sent stimulus migration event batch", {
					batchNumber: i / BATCH_SIZE + 1,
					size: batch.length
				})
			}
		})

		logger.info("successfully dispatched all qti stimulus migration events", {
			dispatchedCount: stimulusEvents.length
		})

		return {
			status: "complete",
			courseCount: HARDCODED_COURSE_IDS.length,
			stimuliDispatched: stimulusEvents.length
		}
	}
)
