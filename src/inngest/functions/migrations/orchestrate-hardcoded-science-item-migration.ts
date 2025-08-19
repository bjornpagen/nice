import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedScienceItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-item-migration",
		name: "Orchestrate Hardcoded Science Course Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.science.items.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching item migrations for hardcoded science courses", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		const result = await dispatchMigrationsForCourses(logger, [...HARDCODED_SCIENCE_COURSE_IDS], {
			itemEventName: "qti/item.migrate", // MODIFIED: Changed to the unified event
			widgetCollection: "science", // MODIFIED: Now using the new science collection
			stimulusEventName: undefined // Explicitly set stimulusEventName to undefined to prevent stimulus migration
		})

		return {
			status: "complete",
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length,
			itemsDispatched: result.itemsDispatched
		}
	}
)
