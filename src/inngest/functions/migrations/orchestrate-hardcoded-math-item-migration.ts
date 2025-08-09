import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "./dispatch-course-migrations"

const HARDCODED_MATH_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

export const orchestrateHardcodedMathItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-item-migration",
		name: "Orchestrate Hardcoded Math Course Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.math.items.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("dispatching item migrations for hardcoded math courses", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		})

		const result = await step.run("dispatch-math-item-migrations", () =>
			dispatchMigrationsForCourses(logger, HARDCODED_MATH_COURSE_IDS, {
				itemEventName: "qti/item.migrate",
				// MODIFIED: Explicitly set stimulusEventName to undefined to prevent stimulus migration
				stimulusEventName: undefined
			})
		)

		return {
			status: "complete",
			courseCount: HARDCODED_MATH_COURSE_IDS.length,
			itemsDispatched: result.itemsDispatched
		}
	}
)
