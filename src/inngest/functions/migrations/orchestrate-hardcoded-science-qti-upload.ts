import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"

const HARDCODED_SCIENCE_COURSE_IDS = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
]

export const orchestrateHardcodedScienceQtiUpload = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-qti-upload",
		name: "Orchestrate Hardcoded Science Course QTI Upload"
	},
	{ event: "migration/hardcoded.science.qti.upload" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded science qti data upload", { courseCount: HARDCODED_SCIENCE_COURSE_IDS.length })

		const qtiUploadPromises = HARDCODED_SCIENCE_COURSE_IDS.map((courseId) =>
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

		logger.info("successfully completed all qti upload jobs for all hardcoded science courses")
		return { status: "complete", courseCount: HARDCODED_SCIENCE_COURSE_IDS.length }
	}
)
