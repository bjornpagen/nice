import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseIngestionToQti } from "@/inngest/functions/orchestrate-course-ingestion-to-qti"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"

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

export const orchestrateHardcodedQtiIngestion = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-qti-ingestion",
		name: "Orchestrate Hardcoded QTI Generation and Upload"
	},
	{ event: "migration/hardcoded.qti.ingest" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded qti data generation and upload", { courseCount: HARDCODED_COURSE_IDS.length })

		// Step 1: Generate QTI JSON data from the database for all courses
		logger.info("fanning out qti ingestion jobs")
		const qtiIngestionPromises = HARDCODED_COURSE_IDS.map((courseId) =>
			step.invoke(`ingest-qti-for-${courseId}`, {
				function: orchestrateCourseIngestionToQti,
				data: { courseId }
			})
		)
		const qtiIngestionResults = await errors.try(Promise.all(qtiIngestionPromises))
		if (qtiIngestionResults.error) {
			logger.error("one or more qti ingestion steps failed", { error: qtiIngestionResults.error })
			throw errors.wrap(qtiIngestionResults.error, "qti ingestion fan-out")
		}
		logger.info("successfully completed all qti ingestion jobs")

		// Step 2: Upload QTI JSON data to the QTI service
		logger.info("fanning out qti upload jobs")
		const qtiUploadPromises = HARDCODED_COURSE_IDS.map((courseId) =>
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
		logger.info("successfully completed all qti upload jobs")

		logger.info("successfully completed qti generation and upload for all hardcoded courses")
		return {
			status: "complete",
			courseCount: HARDCODED_COURSE_IDS.length
		}
	}
)
