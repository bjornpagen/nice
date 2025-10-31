import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import type { CourseBuilderRequestedEvent } from "@/inngest/events/course-builder"
import { COURSE_BUILDER_REQUESTED } from "@/inngest/events/course-builder"
import { updateJobError, updateJobProgress, updateJobResult } from "@/lib/course-builder-api/jobs"
import { fetchCourseBuilderInputs } from "@/inngest/functions/course-builder/fetch-inputs"
import { generatePlanAndBuildPayload } from "@/inngest/functions/course-builder/generate-and-build"
import { uploadCourseAndEnroll } from "@/inngest/functions/course-builder/upload-and-enroll"

export const courseBuilderWorkflow = inngest.createFunction(
  { id: "course-builder-workflow", name: "Course Builder Workflow" },
  { event: COURSE_BUILDER_REQUESTED },
  async ({ event, logger, step }) => {
    const { jobId, input } = (event as CourseBuilderRequestedEvent).data
    logger.info("course builder: received", { jobId })

    // Step 1: Fetch inputs (user + resources + qti + case) via worker
    await updateJobProgress(jobId, "fetch_user")
    const inputsResult = await errors.try(
      step.invoke("course-builder-fetch-inputs", {
        function: fetchCourseBuilderInputs,
        data: { jobId, input }
      })
    )
    if (inputsResult.error) {
      logger.error("orchestrator: fetch inputs failed", { jobId, error: inputsResult.error })
      await updateJobError(jobId, "fetch inputs failed")
      throw errors.wrap(inputsResult.error, "fetch inputs")
    }
    // Advance progress markers to reflect the legacy UI steps
    await updateJobProgress(jobId, "fetch_resources")
    await updateJobProgress(jobId, "fetch_stimuli_and_assessments")
    await updateJobProgress(jobId, "fetch_case_details")

    // Step 2+3: Generate plan and build payload in one step (retries together)
    await updateJobProgress(jobId, "generate_ai_plan")
    await updateJobProgress(jobId, "build_payload")
    const payloadResult = await errors.try(
      step.invoke("course-builder-generate-and-build", {
        function: generatePlanAndBuildPayload,
        data: {
          jobId,
          subject: input.subject,
          caseDetails: inputsResult.data.caseDetails,
          resources: inputsResult.data.resources,
          stimuli: inputsResult.data.stimuli,
          tests: inputsResult.data.tests,
          userGrades: inputsResult.data.userGrades
        }
      })
    )
    if (payloadResult.error) {
      logger.error("orchestrator: generate+build failed", { jobId, error: payloadResult.error })
      await updateJobError(jobId, "generate+build failed")
      throw errors.wrap(payloadResult.error, "generate+build")
    }

    // Step 4: Upload + enroll
    await updateJobProgress(jobId, "create_course")
    const finalizeResult = await errors.try(
      step.invoke("course-builder-upload-and-enroll", {
        function: uploadCourseAndEnroll,
        data: { jobId, studentUserId: input.student_user_id, payload: payloadResult.data }
      })
    )
    if (finalizeResult.error) {
      logger.error("orchestrator: upload & enroll failed", { jobId, error: finalizeResult.error })
      await updateJobError(jobId, "upload & enroll failed")
      throw errors.wrap(finalizeResult.error, "upload & enroll")
    }

    // Mark completed
    await updateJobProgress(jobId, "enroll_student")
    await updateJobResult(jobId, finalizeResult.data)
    logger.info("course builder: completed", { jobId, courseSourcedId: finalizeResult.data.courseSourcedId })
    return { message: "completed", ...finalizeResult.data }
  }
)


