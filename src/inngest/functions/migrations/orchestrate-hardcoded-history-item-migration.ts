import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"
import { HARDCODED_HISTORY_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedHistoryItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-item-migration",
		name: "Orchestrate Hardcoded History Course Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.history.items.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching item migrations for hardcoded history courses", {
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		})

		const result = await dispatchMigrationsForCourses(logger, [...HARDCODED_HISTORY_COURSE_IDS], {
			itemEventName: "qti/item.migrate",
			widgetCollection: "simple-visual",
			stimulusEventName: undefined
		})

		return {
			status: "complete",
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length,
			itemsDispatched: result.itemsDispatched
		}
	}
)
