import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"
import { ALL_HARDCODED_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateAllHardcodedOnerosterIngestion = inngest.createFunction(
	{
		id: "orchestrate-all-hardcoded-oneroster-ingestion",
		name: "Orchestrate All Hardcoded Courses OneRoster Generation and Upload"
	},
	{ event: "migration/all.hardcoded.oneroster.ingest" },
	async ({ step, logger }) => {
		logger.info("starting all hardcoded courses oneroster data generation and upload", {
			courseCount: ALL_HARDCODED_COURSE_IDS.length
		})

		// Step 1: Generate OneRoster payloads for all courses in parallel
		logger.info("fanning out oneroster payload generation jobs")
		const generationPromises = [...ALL_HARDCODED_COURSE_IDS].map((courseId) =>
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
		const uploadPromises = [...ALL_HARDCODED_COURSE_IDS].map((courseId) =>
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

		logger.info("successfully completed oneroster generation and upload for all hardcoded courses")
		return {
			status: "complete",
			courseCount: ALL_HARDCODED_COURSE_IDS.length
		}
	}
)
