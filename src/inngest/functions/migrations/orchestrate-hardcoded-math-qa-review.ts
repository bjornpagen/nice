import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseVisualQAReview } from "@/inngest/functions/qa/orchestrate-course-visual-qa-review"

export const HARDCODED_MATH_QA_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

export const orchestrateHardcodedMathQAReview = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-qa-review",
		name: "Orchestrate QA Review For Hardcoded Math Courses"
	},
	{ event: "qa/questions.review-hardcoded-math" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded math qa review", { courseCount: HARDCODED_MATH_QA_COURSE_IDS.length })

		const reviewResult = await errors.try(
			step.invoke("review-qa-for-hardcoded-math-courses", {
				function: orchestrateCourseVisualQAReview,
				data: { courseIds: HARDCODED_MATH_QA_COURSE_IDS, subject: "math" }
			})
		)
		if (reviewResult.error) {
			logger.error("qa review orchestration failed", { error: reviewResult.error })
			throw errors.wrap(reviewResult.error, "qa review fan-out")
		}

		logger.info("completed hardcoded math qa review", { courseCount: HARDCODED_MATH_QA_COURSE_IDS.length })
		return { status: "complete", courseCount: HARDCODED_MATH_QA_COURSE_IDS.length }
	}
)
