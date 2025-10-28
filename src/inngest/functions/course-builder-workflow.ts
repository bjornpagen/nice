import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import type { CourseBuilderRequestedEvent } from "@/inngest/events/course-builder"
import { COURSE_BUILDER_REQUESTED } from "@/inngest/events/course-builder"
import { updateJobError, updateJobProgress, updateJobResult } from "@/lib/course-builder-api/jobs"
import { fetchAllResourcesForCases, fetchStimuliAndAssessments, fetchCaseDetails } from "@/lib/course-builder-api/data-fetchers"
import { generateCoursePlanFromAi } from "@/lib/course-builder-api/ai-course-generator"
import { AiGenerateCourseInputSchema, type CourseBuilderApiInput } from "@/lib/course-builder-api/schema"
import {
  buildCoursePayloadAction,
  createCourseStep,
  createComponentsStep,
  createResourcesStep,
  createComponentResourcesStep,
  createAssessmentLineItemsStep,
  copyStimuliAction,
  copyQtiTestsAction
} from "@/app/(admin)/course-builder/actions"
import { createClassForCourse, enrollStudentInClass } from "@/lib/course-builder-api/class-enrollment"
import { oneroster } from "@/lib/clients"

async function runCourseBuilderWorkflowInngest(
  jobId: string,
  input: CourseBuilderApiInput,
  logger: { info: (msg: string, attrs?: Record<string, unknown>) => void; error: (msg: string, attrs?: Record<string, unknown>) => void }
): Promise<{ courseSourcedId: string; classSourcedId: string }> {
  logger.info("workflow: starting", { jobId, caseCount: input.case_ids.length, subject: input.subject })

  await updateJobProgress(jobId, "fetch_user")
  const userResult = await errors.try(oneroster.getAllUsers({ filter: `sourcedId='${input.student_user_id}' AND status='active'` }))
  if (userResult.error) {
    logger.error("workflow: fetch user failed", { jobId, userId: input.student_user_id, error: userResult.error })
    await updateJobError(jobId, "fetch user failed")
    throw errors.wrap(userResult.error, "fetch user for grades")
  }
  const user = Array.isArray(userResult.data) ? userResult.data[0] : undefined
  if (!user) {
    logger.error("workflow: user not found", { jobId, userId: input.student_user_id })
    await updateJobError(jobId, "user not found")
    throw errors.new("user not found")
  }
  const userGrades = Array.isArray(user.grades) ? user.grades.filter((g: unknown) => typeof g === "string" && (g as string).trim().length > 0) : []
  if (userGrades.length === 0) {
    logger.error("workflow: user has no grades", { jobId, userId: input.student_user_id })
    await updateJobError(jobId, "user has no grades defined")
    throw errors.new("user has no grades defined")
  }

  await updateJobProgress(jobId, "fetch_resources")
  const resourcesResult = await errors.try(fetchAllResourcesForCases(input.case_ids, input.subject))
  if (resourcesResult.error) {
    logger.error("workflow: fetch resources failed", { jobId, error: resourcesResult.error })
    await updateJobError(jobId, "fetch resources failed")
    throw errors.wrap(resourcesResult.error, "fetch resources")
  }
  const resourcesPayload = resourcesResult.data as { resources: Array<any> }

  await updateJobProgress(jobId, "fetch_stimuli_and_assessments")
  const stimAssessResult = await errors.try(fetchStimuliAndAssessments(resourcesPayload.resources))
  if (stimAssessResult.error) {
    logger.error("workflow: fetch stimuli/assessments failed", { jobId, error: stimAssessResult.error })
    await updateJobError(jobId, "fetch stimuli and assessments failed")
    throw errors.wrap(stimAssessResult.error, "fetch stimuli and assessments")
  }

  await updateJobProgress(jobId, "fetch_case_details")
  const caseDetailsResult = await errors.try(fetchCaseDetails(input.case_ids))
  if (caseDetailsResult.error) {
    logger.error("workflow: fetch case details failed", { jobId, error: caseDetailsResult.error })
    await updateJobError(jobId, "fetch case details failed")
    throw errors.wrap(caseDetailsResult.error, "fetch case details")
  }

  await updateJobProgress(jobId, "generate_ai_plan")
  const aiPlanResult = await errors.try(
    generateCoursePlanFromAi({
      subject: input.subject,
      caseDetails: caseDetailsResult.data as Array<{ id: string; humanCodingScheme: string; fullStatement: string; abbreviatedStatement: string }>,
      resources: resourcesPayload.resources as Array<{ sourcedId: string; title: string; metadata: any }>,
      stimuliAndAssessments: stimAssessResult.data as { stimuli: Array<{ id: string; title: string; rawXml: string }>; tests: Array<{ id: string; title: string; rawXml: string }> },
      userGrades: userGrades
    })
  )
  if (aiPlanResult.error) {
    logger.error("workflow: ai plan generation failed", { jobId, error: aiPlanResult.error })
    await updateJobError(jobId, "ai plan generation failed")
    throw errors.wrap(aiPlanResult.error, "ai plan generation")
  }

  const planValidation = AiGenerateCourseInputSchema.safeParse(aiPlanResult.data)
  if (!planValidation.success) {
    logger.error("workflow: ai plan validation failed", { jobId, error: planValidation.error })
    await updateJobError(jobId, "ai plan validation failed")
    throw errors.wrap(planValidation.error, "ai plan validation")
  }

  // Enforce that all resource IDs used by the AI plan exist in the fetched resources set
  const allowedResourceIds = new Set(
    Array.isArray(resourcesPayload.resources)
      ? (resourcesPayload.resources as Array<{ sourcedId?: string }>).map((r) => r.sourcedId).filter(Boolean)
      : []
  )
  const missing: string[] = []
  for (const unit of planValidation.data.units) {
    for (const lesson of unit.lessons) {
      for (const res of lesson.resources) {
        if (!allowedResourceIds.has(res.id)) {
          missing.push(res.id)
        }
      }
    }
  }
  if (missing.length > 0) {
    const sample = missing.slice(0, 10)
    logger.error("workflow: ai plan references unknown resources", { jobId, missingCount: missing.length, sample })
    await updateJobError(jobId, "ai plan references unknown resources")
    throw errors.new("ai plan references unknown resources")
  }

  await updateJobProgress(jobId, "build_payload")
  const payloadResult = await errors.try(buildCoursePayloadAction(planValidation.data))
  if (payloadResult.error) {
    logger.error("workflow: build payload failed", { jobId, error: payloadResult.error })
    await updateJobError(jobId, "build payload failed")
    throw errors.wrap(payloadResult.error, "build payload")
  }
  const payload = payloadResult.data

  await updateJobProgress(jobId, "create_course")
  const createCourseRes = await errors.try(createCourseStep(payload.course))
  if (createCourseRes.error) {
    logger.error("workflow: create course failed", { jobId, error: createCourseRes.error })
    await updateJobError(jobId, "create course failed")
    throw errors.wrap(createCourseRes.error, "create course step")
  }

  await updateJobProgress(jobId, "create_components")
  const createComponentsRes = await errors.try(createComponentsStep(payload.courseComponents))
  if (createComponentsRes.error) {
    logger.error("workflow: create components failed", { jobId, error: createComponentsRes.error })
    await updateJobError(jobId, "create components failed")
    throw errors.wrap(createComponentsRes.error, "create components step")
  }

  await updateJobProgress(jobId, "create_resources")
  const createResourcesRes = await errors.try(createResourcesStep(payload.resources, [payload.course.sourcedId]))
  if (createResourcesRes.error) {
    logger.error("workflow: create resources failed", { jobId, error: createResourcesRes.error })
    await updateJobError(jobId, "create resources failed")
    throw errors.wrap(createResourcesRes.error, "create resources step")
  }

  await updateJobProgress(jobId, "link_resources")
  const createLinksRes = await errors.try(createComponentResourcesStep(payload.componentResources, payload.course.sourcedId))
  if (createLinksRes.error) {
    logger.error("workflow: link resources failed", { jobId, error: createLinksRes.error })
    await updateJobError(jobId, "link resources failed")
    throw errors.wrap(createLinksRes.error, "create component resources step")
  }

  await updateJobProgress(jobId, "create_alis")
  const createAliRes = await errors.try(createAssessmentLineItemsStep(payload.assessmentLineItems))
  if (createAliRes.error) {
    logger.error("workflow: create assessment line items failed", { jobId, error: createAliRes.error })
    await updateJobError(jobId, "create assessment line items failed")
    throw errors.wrap(createAliRes.error, "create assessment line items step")
  }

  await updateJobProgress(jobId, "copy_qti")
  const copyRes = await errors.try(Promise.all([
    copyStimuliAction(payload.stimuliCopyPlan),
    copyQtiTestsAction(payload.qtiCopyPlan)
  ]))
  if (copyRes.error) {
    logger.error("workflow: copy qti assets failed", { jobId, error: copyRes.error })
    await updateJobError(jobId, "copy qti assets failed")
    throw errors.wrap(copyRes.error, "copy qti assets")
  }

  await updateJobProgress(jobId, "create_class")
  const classSourcedId = await createClassForCourse({
    courseSourcedId: payload.course.sourcedId,
    courseTitle: payload.course.title
  })

  await updateJobProgress(jobId, "enroll_student")
  await enrollStudentInClass({
    studentUserId: input.student_user_id,
    classSourcedId
  })

  return { courseSourcedId: payload.course.sourcedId, classSourcedId }
}

export const courseBuilderWorkflow = inngest.createFunction(
  { id: "course-builder-workflow", name: "Course Builder Workflow" },
  { event: COURSE_BUILDER_REQUESTED },
  async ({ event, logger }) => {
    const { jobId, input } = (event as CourseBuilderRequestedEvent).data
    logger.info("course builder: received", { jobId })

    const result = await errors.try(runCourseBuilderWorkflowInngest(jobId, input, logger))
    if (result.error) {
      logger.error("course builder: failed", { jobId, error: result.error })
      const message = String(result.error?.message || (result.error as any)?.cause?.message || "internal error")
      await updateJobError(jobId, message)
      throw errors.wrap(result.error, "course builder workflow execution")
    }

    await updateJobResult(jobId, result.data)
    logger.info("course builder: completed", { jobId, courseSourcedId: result.data.courseSourcedId })
    return { message: "completed", ...result.data }
  }
)


