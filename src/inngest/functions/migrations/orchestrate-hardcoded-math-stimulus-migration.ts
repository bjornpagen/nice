import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "./dispatch-course-migrations"

const HARDCODED_MATH_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

export const orchestrateHardcodedMathStimulusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-stimulus-migration",
		name: "Orchestrate Hardcoded Math Course Perseus to QTI Stimulus Migration"
	},
	{ event: "migration/hardcoded.math.stimuli.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("dispatching stimulus migrations for hardcoded math courses", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		})

		const result = await step.run("dispatch-math-stimulus-migrations", () =>
			dispatchMigrationsForCourses(logger, HARDCODED_MATH_COURSE_IDS, {
				itemEventName: "qti/item.migrate", // This is ignored by the return but required by the helper.
				stimulusEventName: "qti/stimulus.migrate"
			})
		)

		return {
			status: "complete",
			courseCount: HARDCODED_MATH_COURSE_IDS.length,
			stimuliDispatched: result.stimuliDispatched
		}
	}
)
