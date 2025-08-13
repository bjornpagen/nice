import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"

const HARDCODED_HISTORY_COURSE_IDS = [
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
]

export const orchestrateHardcodedHistoryQtiUpload = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-qti-upload",
		name: "Orchestrate Hardcoded History Course QTI Upload"
	},
	{ event: "migration/hardcoded.history.qti.upload" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded history qti data upload", { courseCount: HARDCODED_HISTORY_COURSE_IDS.length })

		const qtiUploadPromises = HARDCODED_HISTORY_COURSE_IDS.map((courseId) =>
			step.invoke(`upload-qti-for-${courseId}`, {
				function: orchestrateCourseUploadToQti,
				data: { courseId }
			})
		)

		const qtiUploadResults = await errors.try(Promise.all(qtiUploadPromises))
		if (qtiUploadResults.error) {
			logger.error("one or more qti upload steps failed", { error: qtiUploadResults.error })
			throw errors.wrap(qtiUploadResults.error, "qti upload fan-out")
		}

		logger.info("successfully completed all qti upload jobs for all hardcoded history courses")
		return { status: "complete", courseCount: HARDCODED_HISTORY_COURSE_IDS.length }
	}
)
