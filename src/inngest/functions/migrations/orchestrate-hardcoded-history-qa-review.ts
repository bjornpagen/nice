import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseVisualQAReview } from "@/inngest/functions/qa/orchestrate-course-visual-qa-review"
import { HARDCODED_HISTORY_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedHistoryQAReview = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-qa-review",
		name: "Orchestrate QA Review For Hardcoded History Courses"
	},
	{ event: "qa/questions.review-hardcoded-history" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded history qa review", { courseCount: HARDCODED_HISTORY_COURSE_IDS.length })

		const reviewResult = await errors.try(
			step.invoke("review-qa-for-hardcoded-history-courses", {
				function: orchestrateCourseVisualQAReview,
				data: { courseIds: [...HARDCODED_HISTORY_COURSE_IDS], subject: "history" }
			})
		)
		if (reviewResult.error) {
			logger.error("qa review orchestration failed", { error: reviewResult.error })
			throw errors.wrap(reviewResult.error, "qa review fan-out")
		}

		logger.info("completed hardcoded history qa review", { courseCount: HARDCODED_HISTORY_COURSE_IDS.length })
		return { status: "complete", courseCount: HARDCODED_HISTORY_COURSE_IDS.length }
	}
)
