import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"

const HARDCODED_SCIENCE_COURSE_IDS = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
]

export const orchestrateHardcodedScienceOnerosterIngestion = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-oneroster-ingestion",
		name: "Orchestrate Hardcoded Science Course OneRoster Generation and Upload"
	},
	{ event: "migration/hardcoded.science.oneroster.ingest" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded science oneroster data generation and upload", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		// Step 1: Generate OneRoster payloads for all courses
		logger.info("fanning out oneroster payload generation jobs")
		const onerosterGenerationPromises = HARDCODED_SCIENCE_COURSE_IDS.map((courseId) =>
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
		const onerosterUploadPromises = HARDCODED_SCIENCE_COURSE_IDS.map((courseId) =>
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

		logger.info("successfully completed oneroster generation and upload for all hardcoded science courses")
		return {
			status: "complete",
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		}
	}
)
