import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedMathStimulusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-stimulus-migration",
		name: "Orchestrate Hardcoded Math Course Perseus to QTI Stimulus Migration"
	},
	{ event: "migration/hardcoded.math.stimuli.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching stimulus migrations for hardcoded math courses", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		})

		const result = await dispatchMigrationsForCourses(logger, [...HARDCODED_MATH_COURSE_IDS], {
			// MODIFIED: Explicitly set itemEventName to undefined to prevent item migration
			itemEventName: undefined,
			stimulusEventName: "qti/stimulus.migrate"
		})

		return {
			status: "complete",
			courseCount: HARDCODED_MATH_COURSE_IDS.length,
			stimuliDispatched: result.stimuliDispatched
		}
	}
)
