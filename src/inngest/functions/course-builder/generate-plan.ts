import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import type { Subject } from "@/lib/course-builder-api/schema"
import { generateCoursePlanFromAi } from "@/lib/course-builder-api/ai-course-generator"

export const generateCourseBuilderPlan = inngest.createFunction(
  { id: "course-builder-generate-plan", name: "Course Builder: Generate AI Plan" },
  { event: "app/course_builder.generate_plan" },
  async ({ event, logger }) => {
    const { jobId, subject, caseDetails, resources, stimuli, tests, userGrades } = event.data as {
      jobId: string
      subject: Subject
      caseDetails: Array<{ id: string; humanCodingScheme: string; fullStatement: string; abbreviatedStatement: string }>
      resources: Array<{ sourcedId: string; title: string; metadata: Record<string, unknown> }>
      stimuli: Array<{ id: string; title: string; rawXml: string }>
      tests: Array<{ id: string; title: string; rawXml: string }>
      userGrades: string[]
    }

    logger.info("course builder: generating ai plan", { jobId, standards: caseDetails.length, resources: resources.length })

    const aiPlanResult = await errors.try(
      generateCoursePlanFromAi({
        subject,
        caseDetails,
        resources,
        stimuliAndAssessments: { stimuli, tests },
        userGrades
      })
    )
    if (aiPlanResult.error) {
      logger.error("generate plan: ai call failed", { jobId, error: aiPlanResult.error })
      throw errors.wrap(aiPlanResult.error, "ai plan generation")
    }

    logger.info("course builder: ai plan generated", {
      jobId
    })

    return aiPlanResult.data
  }
)


