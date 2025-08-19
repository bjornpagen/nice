import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedMathItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-item-migration",
		name: "Orchestrate Hardcoded Math Course Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.math.items.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching item migrations for hardcoded math courses", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		})

		const result = await dispatchMigrationsForCourses(logger, [...HARDCODED_MATH_COURSE_IDS], {
			itemEventName: "qti/item.migrate",
			widgetCollection: "math-core",
			stimulusEventName: undefined
		})

		return {
			status: "complete",
			courseCount: HARDCODED_MATH_COURSE_IDS.length,
			itemsDispatched: result.itemsDispatched
		}
	}
)
