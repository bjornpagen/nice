import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedMathOnerosterIngestion = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-oneroster-ingestion",
		name: "Orchestrate Hardcoded Math Course OneRoster Generation and Upload"
	},
	{ event: "migration/hardcoded.math.oneroster.ingest" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded math oneroster data generation and upload", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		})

		// Step 1: Generate OneRoster payloads for all courses
		logger.info("fanning out oneroster payload generation jobs")
		const onerosterGenerationPromises = [...HARDCODED_MATH_COURSE_IDS].map((courseId) =>
			step.invoke(`generate-oneroster-payload-for-${courseId}`, {
				function: orchestrateCourseOnerosterGeneration,
				data: { courseId }
			})
		)
		const onerosterGenerationResults = await errors.try(Promise.all(onerosterGenerationPromises))
		if (onerosterGenerationResults.error) {
			logger.error("one or more oneroster payload generation steps failed", { error: onerosterGenerationResults.error })
			throw errors.wrap(onerosterGenerationResults.error, "oneroster payload generation fan-out")
		}
		logger.info("successfully completed all oneroster payload generation jobs")

		// Step 2: Upload OneRoster payloads for all courses
		logger.info("fanning out oneroster upload jobs")
		const onerosterUploadPromises = [...HARDCODED_MATH_COURSE_IDS].map((courseId) =>
			step.invoke(`upload-oneroster-payload-for-${courseId}`, {
				function: orchestrateCourseUploadToOneroster,
				data: { courseId }
			})
		)
		const onerosterUploadResults = await errors.try(Promise.all(onerosterUploadPromises))
		if (onerosterUploadResults.error) {
			logger.error("one or more oneroster upload steps failed", { error: onerosterUploadResults.error })
			throw errors.wrap(onerosterUploadResults.error, "oneroster upload fan-out")
		}
		logger.info("successfully completed all oneroster upload jobs")

		logger.info("successfully completed oneroster generation and upload for all hardcoded math courses")
		return {
			status: "complete",
			courseCount: HARDCODED_MATH_COURSE_IDS.length
		}
	}
)
