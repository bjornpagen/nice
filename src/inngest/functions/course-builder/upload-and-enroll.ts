import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import {
  createCourseStep,
  createComponentsStep,
  createResourcesStep,
  createComponentResourcesStep,
  createAssessmentLineItemsStep,
  copyStimuliAction,
  copyQtiTestsAction
} from "@/app/(admin)/course-builder/actions"
import { createClassForCourse, enrollStudentInClass } from "@/lib/course-builder-api/class-enrollment"
import { oneroster, qti } from "@/lib/clients"

export const uploadCourseAndEnroll = inngest.createFunction(
  { id: "course-builder-upload-and-enroll", name: "Course Builder: Upload & Enroll" },
  { event: "app/course_builder.upload_and_enroll" },
  async ({ event, logger }) => {
    const { jobId, studentUserId, payload } = event.data as {
      jobId: string
      studentUserId: string
      payload: {
        course: any
        courseComponents: any[]
        resources: any[]
        componentResources: any[]
        assessmentLineItems: any[]
        qtiCopyPlan: Array<{ sourceId: string; newId: string; title: string }>
        stimuliCopyPlan: Array<{ sourceId: string; newId: string; title: string }>
      }
    }

    logger.info("course builder: upload & enroll start", { jobId })

    // Helper: bounded concurrency mapper
    async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
      const results: R[] = []
      let index = 0
      const runners: Array<Promise<void>> = []
      const run = async () => {
        while (true) {
          const current = index
          if (current >= items.length) return
          index++
          const result = await worker(items[current]!, current)
          results[current] = result
        }
      }
      const pool = Math.min(limit, items.length)
      for (let i = 0; i < pool; i++) runners.push(run())
      await Promise.all(runners)
      return results
    }

    const POOL = 20

    // Idempotent course creation: skip if exists
    const existingCourseResult = await errors.try(oneroster.getCourse(payload.course.sourcedId))
    if (existingCourseResult.error) {
      logger.error("upload & enroll: check course existence failed", { jobId, error: existingCourseResult.error })
      throw errors.wrap(existingCourseResult.error, "course existence check")
    }
    if (!existingCourseResult.data) {
      const createCourseRes = await errors.try(createCourseStep(payload.course))
      if (createCourseRes.error) {
        logger.error("upload & enroll: create course failed", { jobId, error: createCourseRes.error })
        throw errors.wrap(createCourseRes.error, "create course step")
      }
    } else {
      logger.info("upload & enroll: course exists, skipping create", { jobId, courseSourcedId: payload.course.sourcedId })
    }

    // Create components: parents first, then children. Filter existing to avoid provider's bogus 404s.
    const parentComponents = payload.courseComponents.filter((cc: any) => !cc.parent?.sourcedId)
    const childComponents = payload.courseComponents.filter((cc: any) => !!cc.parent?.sourcedId)

    const parentExistence = await mapWithConcurrency(parentComponents, POOL, async (cc) => {
      const getRes = await errors.try(oneroster.getCourseComponent(cc.sourcedId))
      if (getRes.error) {
        logger.error("check component existence failed", { componentId: cc.sourcedId, error: getRes.error })
        throw errors.wrap(getRes.error, "component existence check")
      }
      return getRes.data ? null : cc
    })
    const parentsToCreate = parentExistence.filter((x): x is any => x !== null)
    if (parentsToCreate.length > 0) {
      const resParents = await errors.try(createComponentsStep(parentsToCreate))
      if (resParents.error) {
        logger.error("upload & enroll: create parent components failed", { jobId, error: resParents.error })
        throw errors.wrap(resParents.error, "create parent components step")
      }
    } else {
      logger.info("upload & enroll: all parent components exist", { jobId, count: parentComponents.length })
    }

    const childExistence = await mapWithConcurrency(childComponents, POOL, async (cc) => {
      const getRes = await errors.try(oneroster.getCourseComponent(cc.sourcedId))
      if (getRes.error) {
        logger.error("check component existence failed", { componentId: cc.sourcedId, error: getRes.error })
        throw errors.wrap(getRes.error, "component existence check")
      }
      return getRes.data ? null : cc
    })
    const childrenToCreate = childExistence.filter((x): x is any => x !== null)
    if (childrenToCreate.length > 0) {
      const resChildren = await errors.try(createComponentsStep(childrenToCreate))
      if (resChildren.error) {
        logger.error("upload & enroll: create child components failed", { jobId, error: resChildren.error })
        throw errors.wrap(resChildren.error, "create child components step")
      }
    } else {
      logger.info("upload & enroll: all child components exist", { jobId, count: childComponents.length })
    }

    // Create resources (idempotent)
    const resourceExistence = await mapWithConcurrency(payload.resources, POOL, async (r) => {
      const getRes = await errors.try(oneroster.getResource(r.sourcedId))
      if (getRes.error) {
        logger.error("check resource existence failed", { resourceId: r.sourcedId, error: getRes.error })
        throw errors.wrap(getRes.error, "resource existence check")
      }
      return getRes.data ? null : r
    })
    const resourcesToCreate = resourceExistence.filter((x): x is any => x !== null)
    if (resourcesToCreate.length > 0) {
      const createResourcesRes = await errors.try(createResourcesStep(resourcesToCreate, [payload.course.sourcedId]))
      if (createResourcesRes.error) {
        logger.error("upload & enroll: create resources failed", { jobId, error: createResourcesRes.error })
        throw errors.wrap(createResourcesRes.error, "create resources step")
      }
    } else {
      logger.info("upload & enroll: all resources exist", { jobId, count: payload.resources.length })
    }

    // Link component resources (idempotent)
    const compResExistence = await mapWithConcurrency(payload.componentResources, POOL, async (cr) => {
      const getRes = await errors.try(oneroster.getComponentResource(cr.sourcedId))
      if (getRes.error) {
        logger.error("check component-resource existence failed", { componentResourceId: cr.sourcedId, error: getRes.error })
        throw errors.wrap(getRes.error, "component-resource existence check")
      }
      return getRes.data ? null : cr
    })
    const componentResourcesToCreate = compResExistence.filter((x): x is any => x !== null)
    if (componentResourcesToCreate.length > 0) {
      const createLinksRes = await errors.try(createComponentResourcesStep(componentResourcesToCreate, payload.course.sourcedId))
      if (createLinksRes.error) {
        logger.error("upload & enroll: link resources failed", { jobId, error: createLinksRes.error })
        throw errors.wrap(createLinksRes.error, "create component resources step")
      }
    } else {
      logger.info("upload & enroll: all component-resources exist", { jobId, count: payload.componentResources.length })
    }

    // Create ALIs (idempotent)
    const aliExistence = await mapWithConcurrency(payload.assessmentLineItems, POOL, async (ali) => {
      const getRes = await errors.try(oneroster.getAssessmentLineItem(ali.sourcedId))
      if (getRes.error) {
        logger.error("check assessment line item existence failed", { aliId: ali.sourcedId, error: getRes.error })
        throw errors.wrap(getRes.error, "assessment line item existence check")
      }
      return getRes.data ? null : ali
    })
    const lineItemsToCreate = aliExistence.filter((x): x is any => x !== null)
    if (lineItemsToCreate.length > 0) {
      const createAliRes = await errors.try(createAssessmentLineItemsStep(lineItemsToCreate))
      if (createAliRes.error) {
        logger.error("upload & enroll: create assessment line items failed", { jobId, error: createAliRes.error })
        throw errors.wrap(createAliRes.error, "create assessment line items step")
      }
    } else {
      logger.info("upload & enroll: all assessment line items exist", { jobId, count: payload.assessmentLineItems.length })
    }

    // Copy QTI assets: skip if destination already exists
    const qtiTestsToCopy = await mapWithConcurrency(payload.qtiCopyPlan, POOL, async (entry) => {
      const exists = await errors.try(qti.getAssessmentTest(entry.newId))
      if (!exists.error && exists.data && typeof (exists.data as any)?.rawXml === "string") return null
      return entry
    })
    const testsPlanFiltered = qtiTestsToCopy.filter((x): x is { sourceId: string; newId: string; title: string } => x !== null)

    const stimuliToCopy = await mapWithConcurrency(payload.stimuliCopyPlan, POOL, async (entry) => {
      const exists = await errors.try(qti.getStimulus(entry.newId))
      if (!exists.error && exists.data && typeof (exists.data as any)?.rawXml === "string") return null
      return entry
    })
    const stimuliPlanFiltered = stimuliToCopy.filter((x): x is { sourceId: string; newId: string; title: string } => x !== null)

    const copyRes = await errors.try(Promise.all([
      copyStimuliAction(stimuliPlanFiltered),
      copyQtiTestsAction(testsPlanFiltered)
    ]))
    if (copyRes.error) {
      logger.error("upload & enroll: copy qti assets failed", { jobId, error: copyRes.error })
      throw errors.wrap(copyRes.error, "copy qti assets")
    }

    // Create class and enroll student
    const classSourcedId = await createClassForCourse({
      courseSourcedId: payload.course.sourcedId,
      courseTitle: payload.course.title
    })

    await enrollStudentInClass({
      studentUserId,
      classSourcedId
    })

    logger.info("course builder: upload & enroll complete", { jobId, courseSourcedId: payload.course.sourcedId, classSourcedId })
    return { courseSourcedId: payload.course.sourcedId, classSourcedId }
  }
)


