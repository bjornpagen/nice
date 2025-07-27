import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseXmlGeneration } from "@/inngest/functions/orchestrate-course-qti-generation"

const HARDCODED_COURSE_IDS = [
	"xb5feb28c", // Early math review
	"x3184e0ec", // 2nd grade math
	"x3c950fa744f5f34c", // Get ready for 3rd grade math
	"x41fbdd6301d5fded", // 3rd grade math
	"xfb4fc0bf01437792", // 2nd grade reading & vocabulary
	"xaf0c1b5d7010608e", // 3rd grade reading & vocabulary
	"x3931b57772b927b3", // 6th grade math (TX TEKS)
	"xa876d090ec748f45", // 7th grade math (TX TEKS)
	"x42e41b058fcf4059" // 8th grade math (TX TEKS)
]

export const orchestrateHardcodedPerseusMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-perseus-migration",
		name: "Orchestrate Hardcoded Perseus to QTI Migration"
	},
	{ event: "migration/hardcoded.perseus-to-qti" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded perseus to qti migration", { courseCount: HARDCODED_COURSE_IDS.length })

		// Fan out QTI XML generation jobs for all courses concurrently
		const qtiGenerationPromises = HARDCODED_COURSE_IDS.map((courseId) =>
			step.invoke(`generate-qti-xml-for-${courseId}`, {
				function: orchestrateCourseXmlGeneration,
				data: { courseId }
			})
		)

		const qtiGenerationResults = await errors.try(Promise.all(qtiGenerationPromises))
		if (qtiGenerationResults.error) {
			logger.error("one or more qti xml generation steps failed", { error: qtiGenerationResults.error })
			throw errors.wrap(qtiGenerationResults.error, "qti xml generation fan-out")
		}

		logger.info("successfully completed all perseus to qti xml generation jobs")

		return {
			status: "complete",
			courseCount: HARDCODED_COURSE_IDS.length
		}
	}
)
