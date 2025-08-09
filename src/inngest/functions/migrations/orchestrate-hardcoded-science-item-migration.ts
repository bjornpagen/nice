import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "./dispatch-course-migrations"

const HARDCODED_SCIENCE_COURSE_IDS = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
]

export const orchestrateHardcodedScienceItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-item-migration",
		name: "Orchestrate Hardcoded Science Course Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.science.items.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("dispatching item migrations for hardcoded science courses", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		const result = await step.run("dispatch-science-item-migrations", () =>
			dispatchMigrationsForCourses(logger, HARDCODED_SCIENCE_COURSE_IDS, {
				itemEventName: "qti/item.migrate.focused",
				// MODIFIED: Explicitly set stimulusEventName to undefined to prevent stimulus migration
				stimulusEventName: undefined
			})
		)

		return {
			status: "complete",
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length,
			itemsDispatched: result.itemsDispatched
		}
	}
)
