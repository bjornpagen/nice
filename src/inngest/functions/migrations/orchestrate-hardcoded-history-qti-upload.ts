import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"
import { HARDCODED_HISTORY_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedHistoryQtiUpload = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-qti-upload",
		name: "Orchestrate Hardcoded History Course QTI Upload"
	},
	{ event: "migration/hardcoded.history.qti.upload" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded history qti data upload", { courseCount: HARDCODED_HISTORY_COURSE_IDS.length })

		const qtiUploadPromises = [...HARDCODED_HISTORY_COURSE_IDS].map((courseId) =>
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
