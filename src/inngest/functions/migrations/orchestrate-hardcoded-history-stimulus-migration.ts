import { inngest } from "@/inngest/client"
import { dispatchMigrationsForCourses } from "@/inngest/functions/migrations/dispatch-course-migrations"
import { HARDCODED_HISTORY_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedHistoryStimulusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-stimulus-migration",
		name: "Orchestrate Hardcoded History Course Perseus to QTI Stimulus Migration"
	},
	{ event: "migration/hardcoded.history.stimuli.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching stimulus migrations for hardcoded history courses", {
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		})

		const result = await dispatchMigrationsForCourses(logger, [...HARDCODED_HISTORY_COURSE_IDS], {
			itemEventName: undefined,
			stimulusEventName: "qti/stimulus.migrate"
		})

		return {
			status: "complete",
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length,
			stimuliDispatched: result.stimuliDispatched
		}
	}
)
