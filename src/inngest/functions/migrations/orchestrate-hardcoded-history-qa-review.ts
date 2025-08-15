import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseVisualQAReview } from "@/inngest/functions/qa/orchestrate-course-visual-qa-review"

export const HARDCODED_HISTORY_QA_COURSE_IDS = [
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
]

export const orchestrateHardcodedHistoryQAReview = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-qa-review",
		name: "Orchestrate QA Review For Hardcoded History Courses"
	},
	{ event: "qa/questions.review-hardcoded-history" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded history qa review", { courseCount: HARDCODED_HISTORY_QA_COURSE_IDS.length })

		const reviewResult = await errors.try(
			step.invoke("review-qa-for-hardcoded-history-courses", {
				function: orchestrateCourseVisualQAReview,
				data: { courseIds: HARDCODED_HISTORY_QA_COURSE_IDS, subject: "history" }
			})
		)
		if (reviewResult.error) {
			logger.error("qa review orchestration failed", { error: reviewResult.error })
			throw errors.wrap(reviewResult.error, "qa review fan-out")
		}

		logger.info("completed hardcoded history qa review", { courseCount: HARDCODED_HISTORY_QA_COURSE_IDS.length })
		return { status: "complete", courseCount: HARDCODED_HISTORY_QA_COURSE_IDS.length }
	}
)
