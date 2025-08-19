import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedScienceStimulusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-stimulus-migration",
		name: "Orchestrate Hardcoded Science Course Perseus to QTI Stimulus Migration"
	},
	{ event: "migration/hardcoded.science.stimuli.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching stimulus migrations for hardcoded science courses", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		const result = await dispatchMigrationsForCourses(logger, [...HARDCODED_SCIENCE_COURSE_IDS], {
			// MODIFIED: Explicitly set itemEventName to undefined to prevent item migration
			itemEventName: undefined,
			stimulusEventName: "qti/stimulus.migrate"
		})

		return {
			status: "complete",
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length,
			stimuliDispatched: result.stimuliDispatched
		}
	}
)
