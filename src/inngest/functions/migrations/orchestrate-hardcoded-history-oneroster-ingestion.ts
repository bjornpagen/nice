import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"

const HARDCODED_HISTORY_COURSE_IDS = [
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
]

export const orchestrateHardcodedHistoryOnerosterIngestion = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-oneroster-ingestion",
		name: "Orchestrate Hardcoded History Course OneRoster Generation and Upload"
	},
	{ event: "migration/hardcoded.history.oneroster.ingest" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded history oneroster data generation and upload", {
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		})

		// Step 1: Generate OneRoster payloads for all courses in parallel
		logger.info("fanning out oneroster payload generation jobs")
		const generationPromises = HARDCODED_HISTORY_COURSE_IDS.map((courseId) =>
			step.invoke(`generate-oneroster-payload-for-${courseId}`, {
				function: orchestrateCourseOnerosterGeneration,
				data: { courseId }
			})
		)
		const generationResults = await errors.try(Promise.all(generationPromises))
		if (generationResults.error) {
			logger.error("one or more oneroster payload generation steps failed", { error: generationResults.error })
			throw errors.wrap(generationResults.error, "oneroster payload generation fan-out")
		}
		logger.info("successfully completed all oneroster payload generation jobs")

		// Step 2: Upload OneRoster payloads for all courses in parallel
		logger.info("fanning out oneroster upload jobs")
		const uploadPromises = HARDCODED_HISTORY_COURSE_IDS.map((courseId) =>
			step.invoke(`upload-oneroster-payload-for-${courseId}`, {
				function: orchestrateCourseUploadToOneroster,
				data: { courseId }
			})
		)
		const uploadResults = await errors.try(Promise.all(uploadPromises))
		if (uploadResults.error) {
			logger.error("one or more oneroster upload steps failed", { error: uploadResults.error })
			throw errors.wrap(uploadResults.error, "oneroster upload fan-out")
		}
		logger.info("successfully completed all oneroster upload jobs")

		logger.info("successfully completed oneroster generation and upload for all hardcoded history courses")
		return {
			status: "complete",
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		}
	}
)