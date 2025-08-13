import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"

const HARDCODED_HISTORY_COURSE_IDS = [
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
]

export const orchestrateHardcodedHistoryItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-item-migration",
		name: "Orchestrate Hardcoded History Course Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.history.items.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("dispatching item migrations for hardcoded history courses", {
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		})

		const result = await step.run("dispatch-history-item-migrations", () =>
			dispatchMigrationsForCourses(logger, HARDCODED_HISTORY_COURSE_IDS, {
				itemEventName: "qti/item.migrate",
				widgetCollection: "simple-visual",
				stimulusEventName: undefined
			})
		)

		return {
			status: "complete",
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length,
			itemsDispatched: result.itemsDispatched
		}
	}
)
