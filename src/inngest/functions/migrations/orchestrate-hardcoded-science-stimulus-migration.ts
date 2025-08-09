import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "./dispatch-course-migrations"

const HARDCODED_SCIENCE_COURSE_IDS = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
]

export const orchestrateHardcodedScienceStimulusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-stimulus-migration",
		name: "Orchestrate Hardcoded Science Course Perseus to QTI Stimulus Migration"
	},
	{ event: "migration/hardcoded.science.stimuli.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("dispatching stimulus migrations for hardcoded science courses", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		const result = await step.run("dispatch-science-stimulus-migrations", () =>
			dispatchMigrationsForCourses(logger, HARDCODED_SCIENCE_COURSE_IDS, {
				// MODIFIED: Explicitly set itemEventName to undefined to prevent item migration
				itemEventName: undefined,
				stimulusEventName: "qti/stimulus.migrate"
			})
		)

		return {
			status: "complete",
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length,
			stimuliDispatched: result.stimuliDispatched
		}
	}
)
