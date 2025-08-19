import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseVisualQAReview } from "@/inngest/functions/qa/orchestrate-course-visual-qa-review"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedScienceQAReview = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-qa-review",
		name: "Orchestrate QA Review For Hardcoded Science Courses"
	},
	{ event: "qa/questions.review-hardcoded-science" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded science qa review", { courseCount: HARDCODED_SCIENCE_COURSE_IDS.length })

		const reviewResult = await errors.try(
			step.invoke("review-qa-for-hardcoded-science-courses", {
				function: orchestrateCourseVisualQAReview,
				data: { courseIds: [...HARDCODED_SCIENCE_COURSE_IDS], subject: "science" }
			})
		)
		if (reviewResult.error) {
			logger.error("qa review orchestration failed", { error: reviewResult.error })
			throw errors.wrap(reviewResult.error, "qa review fan-out")
		}

		logger.info("completed hardcoded science qa review", { courseCount: HARDCODED_SCIENCE_COURSE_IDS.length })
		return { status: "complete", courseCount: HARDCODED_SCIENCE_COURSE_IDS.length }
	}
)
