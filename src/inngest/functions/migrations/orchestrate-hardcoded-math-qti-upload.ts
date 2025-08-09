import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseUploadToQti } from "@/inngest/functions/orchestrate-course-upload-to-qti"

const HARDCODED_MATH_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

export const orchestrateHardcodedMathQtiUpload = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-qti-upload",
		name: "Orchestrate Hardcoded Math Course QTI Upload"
	},
	{ event: "migration/hardcoded.math.qti.upload" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded math qti data upload", { courseCount: HARDCODED_MATH_COURSE_IDS.length })

		const qtiUploadPromises = HARDCODED_MATH_COURSE_IDS.map((courseId) =>
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

		logger.info("successfully completed all qti upload jobs for all hardcoded math courses")
		return { status: "complete", courseCount: HARDCODED_MATH_COURSE_IDS.length }
	}
)
