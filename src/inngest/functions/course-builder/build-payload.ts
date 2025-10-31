import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { buildCoursePayloadAction } from "@/app/(admin)/course-builder/actions"
import { AiGenerateCourseInputSchema } from "@/lib/course-builder-api/schema"

export const buildCourseBuilderPayload = inngest.createFunction(
  { id: "course-builder-build-payload", name: "Course Builder: Build Payload" },
  { event: "app/course_builder.build_payload" },
  async ({ event, logger }) => {
    const { jobId, plan } = event.data as { jobId: string; plan: unknown }

    const validation = AiGenerateCourseInputSchema.safeParse(plan)
    if (!validation.success) {
      logger.error("build payload: plan validation failed", { jobId, error: validation.error })
      throw errors.wrap(validation.error, "ai plan validation")
    }

    logger.info("course builder: building payload", { jobId })
    const payloadResult = await errors.try(buildCoursePayloadAction(validation.data))
    if (payloadResult.error) {
      logger.error("build payload: failed", { jobId, error: payloadResult.error })
      throw errors.wrap(payloadResult.error, "build payload")
    }

    return payloadResult.data
  }
)


