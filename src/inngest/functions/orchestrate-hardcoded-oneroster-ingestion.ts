import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"

const HARDCODED_COURSE_IDS = [
	// "xb5feb28c", // Early math review
	// "x3184e0ec", // 2nd grade math
	// "x3c950fa744f5f34c", // Get ready for 3rd grade math
	// "x41fbdd6301d5fded", // 3rd grade math
	// "xfb4fc0bf01437792", // 2nd grade reading & vocabulary
	// "xaf0c1b5d7010608e", // 3rd grade reading & vocabulary
	// "x0267d782", // 6th grade math (Common Core)
	// "x6b17ba59", // 7th grade math (Common Core)
	// "x7c7044d7" // 8th grade math (Common Core)

	// --- ANDY'S COURSES ---
	"x1baed5db7c1bb50b", // Middle school physics
	"x87d03b443efbea0a", // Middle school Earth and space science
	"xc370bc422b7f75fc", // Middle school chemistry
	"x0c5bb03129646fd6", // Middle school biology
	"x230b3ff252126bb6" // High school biology
]

export const orchestrateHardcodedOnerosterIngestion = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-oneroster-ingestion",
		name: "Orchestrate Hardcoded OneRoster Generation and Upload"
	},
	{ event: "migration/hardcoded.oneroster.ingest" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded oneroster data generation and upload", { courseCount: HARDCODED_COURSE_IDS.length })

		// Step 1: Generate OneRoster payloads for all courses
		logger.info("fanning out oneroster payload generation jobs")
		const onerosterGenerationPromises = HARDCODED_COURSE_IDS.map((courseId) =>
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
		const onerosterUploadPromises = HARDCODED_COURSE_IDS.map((courseId) =>
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

		logger.info("successfully completed oneroster generation and upload for all hardcoded courses")
		return {
			status: "complete",
			courseCount: HARDCODED_COURSE_IDS.length
		}
	}
)
