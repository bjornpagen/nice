import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import type { Subject } from "@/lib/course-builder-api/schema"
import { AiGenerateCourseInputSchema } from "@/lib/course-builder-api/schema"
import { generateCoursePlanFromAi } from "@/lib/course-builder-api/ai-course-generator"
import { buildCoursePayloadAction } from "@/app/(admin)/course-builder/actions"

export const generatePlanAndBuildPayload = inngest.createFunction(
  { id: "course-builder-generate-and-build", name: "Course Builder: Generate Plan & Build Payload" },
  { event: "app/course_builder.generate_and_build" },
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

    logger.info("course builder: combined generate+build start", { jobId, resources: resources.length })

    // 1) Generate plan
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
      logger.error("combined: ai plan failed", { jobId, error: aiPlanResult.error })
      throw errors.wrap(aiPlanResult.error, "ai plan generation")
    }

    // 2) Validate plan schema
    const planValidation = AiGenerateCourseInputSchema.safeParse(aiPlanResult.data)
    if (!planValidation.success) {
      logger.error("combined: ai plan validation failed", { jobId, error: planValidation.error })
      throw errors.wrap(planValidation.error, "ai plan validation")
    }

    // 3) Validate resource IDs strictly against provided resources (no invented IDs)
    const allowedResourceIds = new Set(resources.map((r) => r.sourcedId))
    const missing: string[] = []
    for (const unit of planValidation.data.units) {
      for (const lesson of unit.lessons) {
        for (const res of lesson.resources) {
          if (!allowedResourceIds.has(res.id)) missing.push(res.id)
        }
      }
    }
    if (missing.length > 0) {
      logger.error("combined: plan references unknown resources", { jobId, missingCount: missing.length, sample: missing.slice(0, 10) })
      throw errors.new("ai plan references unknown resources")
    }

    // 4) Build payload
    const payloadResult = await errors.try(buildCoursePayloadAction(planValidation.data))
    if (payloadResult.error) {
      logger.error("combined: build payload failed", { jobId, error: payloadResult.error })
      throw errors.wrap(payloadResult.error, "build payload")
    }

    logger.info("course builder: combined generate+build complete", { jobId })
    return payloadResult.data
  }
)


