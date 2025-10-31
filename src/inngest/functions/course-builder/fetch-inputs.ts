import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import type { Subject } from "@/lib/course-builder-api/schema"
import { fetchAllResourcesForCases, fetchStimuliAndAssessments, fetchCaseDetails } from "@/lib/course-builder-api/data-fetchers"
import { oneroster } from "@/lib/clients"

type CourseBuilderInputs = {
  userGrades: string[]
  resources: Array<{ sourcedId: string; title: string; metadata: Record<string, unknown> }>
  stimuli: Array<{ id: string; title: string; rawXml: string }>
  tests: Array<{ id: string; title: string; rawXml: string }>
  caseDetails: Array<{ id: string; humanCodingScheme: string; fullStatement: string; abbreviatedStatement: string }>
}

export const fetchCourseBuilderInputs = inngest.createFunction(
  { id: "course-builder-fetch-inputs", name: "Course Builder: Fetch Inputs" },
  { event: "app/course_builder.fetch_inputs" },
  async ({ event, logger }) => {
    const { jobId, input } = event.data as { jobId: string; input: { case_ids: string[]; student_user_id: string; subject: Subject } }
    logger.info("course builder: fetch inputs", { jobId, caseCount: input.case_ids.length })

    // 1) Fetch user to derive grades
    const userResult = await errors.try(oneroster.getAllUsers({ filter: `sourcedId='${input.student_user_id}' AND status='active'` }))
    if (userResult.error) {
      logger.error("fetch inputs: fetch user failed", { jobId, userId: input.student_user_id, error: userResult.error })
      throw errors.wrap(userResult.error, "fetch user for grades")
    }
    const user = Array.isArray(userResult.data) ? userResult.data[0] : undefined
    if (!user) {
      logger.error("fetch inputs: user not found", { jobId, userId: input.student_user_id })
      throw errors.new("user not found")
    }
    const userGrades = Array.isArray(user.grades) ? user.grades.filter((g: unknown) => typeof g === "string" && (g as string).trim().length > 0) : []
    if (userGrades.length === 0) {
      logger.error("fetch inputs: user has no grades", { jobId, userId: input.student_user_id })
      throw errors.new("user has no grades defined")
    }

    // 2) Fetch resources (filtered + deduped per helper)
    const resourcesResult = await errors.try(fetchAllResourcesForCases(input.case_ids, input.subject))
    if (resourcesResult.error) {
      logger.error("fetch inputs: fetch resources failed", { jobId, error: resourcesResult.error })
      throw errors.wrap(resourcesResult.error, "fetch resources")
    }
    const resources = (resourcesResult.data.resources as Array<{ sourcedId: string; title: string; metadata: Record<string, unknown> }>) ?? []

    // 3) Fetch QTI stimuli/tests for those resources
    const stimAssessResult = await errors.try(fetchStimuliAndAssessments(resources))
    if (stimAssessResult.error) {
      logger.error("fetch inputs: fetch stimuli/tests failed", { jobId, error: stimAssessResult.error })
      throw errors.wrap(stimAssessResult.error, "fetch stimuli and assessments")
    }

    // 4) Fetch CASE details for the requested ids
    const caseDetailsResult = await errors.try(fetchCaseDetails(input.case_ids))
    if (caseDetailsResult.error) {
      logger.error("fetch inputs: fetch case details failed", { jobId, error: caseDetailsResult.error })
      throw errors.wrap(caseDetailsResult.error, "fetch case details")
    }

    const output: CourseBuilderInputs = {
      userGrades,
      resources,
      stimuli: (stimAssessResult.data as any)?.stimuli ?? [],
      tests: (stimAssessResult.data as any)?.tests ?? [],
      caseDetails: caseDetailsResult.data as CourseBuilderInputs["caseDetails"]
    }

    logger.info("course builder: fetched inputs", {
      jobId,
      resources: output.resources.length,
      stimuli: output.stimuli.length,
      tests: output.tests.length,
      caseDetails: output.caseDetails.length
    })

    return output
  }
)


