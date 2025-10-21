import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { CourseBuilderApiInput } from "@/lib/course-builder-api/schema"
import { fetchAllResourcesForCases, fetchStimuliAndAssessments, fetchCaseDetails } from "@/lib/course-builder-api/data-fetchers"
import { generateCoursePlanFromAi } from "@/lib/course-builder-api/ai-course-generator"
import { buildCoursePayloadAction, createCourseStep, createComponentsStep, createResourcesStep, createComponentResourcesStep, createAssessmentLineItemsStep, copyStimuliAction, copyQtiTestsAction } from "@/app/(admin)/course-builder/actions"
import { oneroster } from "@/lib/clients"
import { AiGenerateCourseInputSchema } from "@/lib/course-builder-api/schema"
import { createClassForCourse, enrollStudentInClass } from "@/lib/course-builder-api/class-enrollment"

export async function runCourseBuilderWorkflow(input: CourseBuilderApiInput) {
  logger.info("starting course builder workflow", { subject: input.subject, caseCount: input.case_ids.length })

  // First, fetch the user to get grades (needed for AI generation)
  const userResult = await errors.try(oneroster.getAllUsers({ filter: `sourcedId='${input.student_user_id}' AND status='active'` }))
  if (userResult.error) {
    logger.error("fetch user failed", { userId: input.student_user_id, error: userResult.error })
    throw errors.wrap(userResult.error, "fetch user for grades")
  }
  const user = userResult.data?.[0]
  if (!user) {
    logger.error("user not found", { userId: input.student_user_id })
    throw errors.new("user not found")
  }
  const userGrades = Array.isArray(user.grades)
    ? user.grades.filter((g) => typeof g === "string" && g.trim().length > 0)
    : []
  if (userGrades.length === 0) {
    logger.error("user has no grades defined", { userId: input.student_user_id })
    throw errors.new("user has no grades defined")
  }

  // Fetch resources for the specified CASE IDs
  const resourcesResult = await errors.try(fetchAllResourcesForCases(input.case_ids, input.subject))
  if (resourcesResult.error) {
    logger.error("fetch resources failed", { error: resourcesResult.error })
    throw errors.wrap(resourcesResult.error, "fetch resources")
  }
  const resourcesPayload = resourcesResult.data
  if (!resourcesPayload || !Array.isArray(resourcesPayload.resources)) {
    logger.error("invalid resources payload from fetchAllResourcesForCases")
    throw errors.new("invalid resources payload")
  }
  if (resourcesPayload.resources.length === 0) {
    logger.error("no resources found for provided case ids", {
      caseIds: input.case_ids
    })
    throw errors.new("no resources found for provided case ids")
  }
  if (Array.isArray(resourcesPayload.unmatchedCaseIds) && resourcesPayload.unmatchedCaseIds.length > 0) {
    logger.error("some case ids had no resources", {
      matched: resourcesPayload.matchedCaseIds,
      unmatched: resourcesPayload.unmatchedCaseIds
    })
    throw errors.new("some case ids had no resources")
  }

  // Fetch enriched stimuli and assessments
  const stimuliAssessResult = await errors.try(fetchStimuliAndAssessments(resourcesPayload.resources))
  if (stimuliAssessResult.error) {
    logger.error("fetch stimuli/assessments failed", { error: stimuliAssessResult.error })
    throw errors.wrap(stimuliAssessResult.error, "fetch stimuli and assessments")
  }

  // Fetch CASE standard details
  const caseDetailsResult = await errors.try(fetchCaseDetails(input.case_ids))
  if (caseDetailsResult.error) {
    logger.error("fetch case details failed", { error: caseDetailsResult.error })
    throw errors.wrap(caseDetailsResult.error, "fetch case details")
  }

  // Generate AI course plan with all context
  const aiPlanResult = await errors.try(
    generateCoursePlanFromAi({
      subject: input.subject,
      caseDetails: caseDetailsResult.data as Array<{ 
        id: string
        humanCodingScheme: string
        fullStatement: string
        abbreviatedStatement: string
      }>,
      resources: resourcesPayload.resources as Array<{
        sourcedId: string
        title: string
        metadata: {
          khanActivityType?: string
          path?: string
          learningObjectiveSet?: Array<{ source: string; learningObjectiveIds: string[] }>
        }
      }>,
      stimuliAndAssessments: stimuliAssessResult.data as {
        stimuli: Array<{ id: string; title: string; rawXml: string }>
        tests: Array<{ id: string; title: string; rawXml: string }>
      },
      userGrades: userGrades
    })
  )
  if (aiPlanResult.error) {
    logger.error("ai plan generation failed", { error: aiPlanResult.error })
    throw errors.wrap(aiPlanResult.error, "ai plan generation")
  }

  // Validate the AI plan
  const planValidation = AiGenerateCourseInputSchema.safeParse(aiPlanResult.data)
  if (!planValidation.success) {
    logger.error("ai plan validation failed", { error: planValidation.error.flatten() })
    throw errors.wrap(planValidation.error, "ai plan validation")
  }

  // Build the course payload for OneRoster
  const payloadResult = await errors.try(buildCoursePayloadAction(planValidation.data))
  if (payloadResult.error) {
    logger.error("build course payload failed", { error: payloadResult.error })
    throw errors.wrap(payloadResult.error, "build course payload")
  }
  const payload = payloadResult.data

  // Create course in OneRoster
  const createCourseRes = await errors.try(createCourseStep(payload.course))
  if (createCourseRes.error) {
    logger.error("create course step failed", { error: createCourseRes.error })
    throw errors.wrap(createCourseRes.error, "create course step")
  }

  // Create course components (units/lessons)
  const createComponentsRes = await errors.try(createComponentsStep(payload.courseComponents))
  if (createComponentsRes.error) {
    logger.error("create components step failed", { error: createComponentsRes.error })
    throw errors.wrap(createComponentsRes.error, "create components step")
  }

  // Create resources
  const createResourcesRes = await errors.try(createResourcesStep(payload.resources))
  if (createResourcesRes.error) {
    logger.error("create resources step failed", { error: createResourcesRes.error })
    throw errors.wrap(createResourcesRes.error, "create resources step")
  }

  // Link components to resources
  const createCompResLinks = await errors.try(createComponentResourcesStep(payload.componentResources, payload.course.sourcedId))
  if (createCompResLinks.error) {
    logger.error("create component resources step failed", { error: createCompResLinks.error })
    throw errors.wrap(createCompResLinks.error, "create component resources step")
  }

  // Create assessment line items
  const createAliRes = await errors.try(createAssessmentLineItemsStep(payload.assessmentLineItems))
  if (createAliRes.error) {
    logger.error("create assessment line items step failed", { error: createAliRes.error })
    throw errors.wrap(createAliRes.error, "create assessment line items step")
  }

  // Copy QTI assets
  const copyAssetsRes = await errors.try(Promise.all([
    copyStimuliAction(payload.stimuliCopyPlan),
    copyQtiTestsAction(payload.qtiCopyPlan)
  ]))
  if (copyAssetsRes.error) {
    logger.error("copy qti assets failed", { error: copyAssetsRes.error })
    throw errors.wrap(copyAssetsRes.error, "copy qti assets")
  }

  // Create a class for the course
  // Add "Nice Academy - " prefix to match course.ts pattern
  const courseTitle = planValidation.data.title.startsWith("Nice Academy - ") 
    ? planValidation.data.title 
    : `Nice Academy - ${planValidation.data.title}`
  
  const classSourcedId = await createClassForCourse({
    courseSourcedId: payload.course.sourcedId,
    courseTitle: courseTitle,
  })

  // Enroll the student in the class
  await enrollStudentInClass({
    studentUserId: input.student_user_id,
    classSourcedId: classSourcedId,
  })

  logger.info("course builder workflow completed successfully", {
    courseSourcedId: payload.course.sourcedId,
    classSourcedId,
    title: planValidation.data.title,
    unitsCount: planValidation.data.units.length,
  })

  return {
    courseSourcedId: payload.course.sourcedId,
    classSourcedId,
  }
}