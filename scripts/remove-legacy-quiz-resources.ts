#!/usr/bin/env bun
/**
 * Removes legacy “quiz” resources (launch URLs containing `/quiz/`) from a given
 * course, together with their component resource links and assessment line items.
 *
 * Usage:
 *   bun run scripts/remove-legacy-quiz-resources.ts --course-sourced-id nice_<course> [--apply]
 *
 * Without `--apply` the script runs in dry-run mode and prints what would be deleted.
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

type Resource = Awaited<ReturnType<typeof oneroster.getResourcesForCourse>>[number]
type ComponentResource = Awaited<ReturnType<typeof oneroster.getAllComponentResources>>[number]
type AssessmentLineItem = Awaited<ReturnType<typeof oneroster.getAllAssessmentLineItems>>[number]

function parseArgs(): { courseId: string; apply: boolean } {
  const args = process.argv.slice(2)
  const getFlag = (name: string) => {
    const idx = args.findIndex((arg) => arg === `--${name}`)
    return idx >= 0 ? args[idx + 1] : undefined
  }
  const hasFlag = (name: string) => args.includes(`--${name}`)

  const courseId = getFlag("course-sourced-id")
  if (!courseId) {
    process.stderr.write(
      "Usage: remove-legacy-quiz-resources --course-sourced-id nice_<slug> [--apply]\n"
    )
    process.exit(1)
  }

  return { courseId, apply: hasFlag("apply") }
}

function isLegacyQuiz(resource: Resource): boolean {
  const launchUrl = resource.metadata?.launchUrl
  if (typeof launchUrl !== "string" || launchUrl.trim() === "") {
    return false
  }

  try {
    const url = new URL(launchUrl)
    const segments = url.pathname.split("/").filter(Boolean)
    if (segments.length < 2) return false
    const penultimate = segments[segments.length - 2]
    return penultimate === "quiz"
  } catch {
    logger.warn("invalid launchUrl encountered; skipping resource", {
      resourceId: resource.sourcedId,
      launchUrl
    })
    return false
  }
}

async function fetchComponentResourcesForCourse(courseId: string): Promise<ComponentResource[]> {
  const courseComponents = await oneroster.getCourseComponents({
    filter: `course.sourcedId='${courseId}'`
  })
  if (courseComponents.length === 0) {
    return []
  }

  const componentIds = courseComponents.map((component) => component.sourcedId)
  const chunkSize = 50
  const results: ComponentResource[] = []
  for (let i = 0; i < componentIds.length; i += chunkSize) {
    const chunk = componentIds.slice(i, i + chunkSize)
    const filter = `courseComponent.sourcedId@'${chunk.join(",")}'`
    const componentResources = await oneroster.getAllComponentResources({ filter })
    results.push(...componentResources.filter((cr) => chunk.includes(cr.courseComponent?.sourcedId ?? "")))
  }
  return results
}

async function fetchAssessmentLineItemsForCourse(courseId: string): Promise<AssessmentLineItem[]> {
  return oneroster.getAllAssessmentLineItems({
    filter: `course.sourcedId='${courseId}'`
  })
}

type LegacyQuizMetadata = {
  resource: Resource
  componentResources: ComponentResource[]
  courseComponentIds: string[]
  assessmentLineItem?: AssessmentLineItem
}

function buildAssessmentLineItemMap(items: AssessmentLineItem[]): Map<string, AssessmentLineItem> {
  const map = new Map<string, AssessmentLineItem>()
  for (const item of items) {
    if (typeof item?.sourcedId === "string") {
      map.set(item.sourcedId, item)
    }
  }
  return map
}

async function collectLegacyQuizzes(courseId: string): Promise<LegacyQuizMetadata[]> {
  const [resources, componentResources, assessmentLineItems] = await Promise.all([
    oneroster.getResourcesForCourse(courseId),
    fetchComponentResourcesForCourse(courseId),
    fetchAssessmentLineItemsForCourse(courseId)
  ])

  const componentResourcesByResourceId = new Map<string, ComponentResource[]>()
  for (const cr of componentResources) {
    const resourceId = cr.resource?.sourcedId
    if (!resourceId) continue
    const list = componentResourcesByResourceId.get(resourceId)
    if (list) list.push(cr)
    else componentResourcesByResourceId.set(resourceId, [cr])
  }

  const aliById = buildAssessmentLineItemMap(assessmentLineItems)

  const resourceMap = new Map<string, Resource>()
  for (const resource of resources) {
    resourceMap.set(resource.sourcedId, resource)
  }

  const resourceIdsFromComponents = new Set<string>()
  for (const cr of componentResources) {
    const resourceId = cr.resource?.sourcedId
    if (resourceId) resourceIdsFromComponents.add(resourceId)
  }

  for (const resourceId of resourceIdsFromComponents) {
    if (resourceMap.has(resourceId)) continue
    const resourceResult = await errors.try(oneroster.getResource(resourceId))
    if (resourceResult.error) {
      logger.warn("failed to fetch resource by id", { resourceId, error: resourceResult.error })
      continue
    }
    const fetchedResource = resourceResult.data
    if (fetchedResource) {
      resourceMap.set(resourceId, fetchedResource)
    }
  }

  const legacy: LegacyQuizMetadata[] = []
  for (const resource of resourceMap.values()) {
    if (!isLegacyQuiz(resource)) continue
    const crs = componentResourcesByResourceId.get(resource.sourcedId) ?? []
    const ali = aliById.get(`${resource.sourcedId}_ali`)
    const courseComponentIds = crs
      .map((cr) => cr.courseComponent?.sourcedId)
      .filter((id): id is string => typeof id === "string" && id.trim() !== "")
    legacy.push({ resource, componentResources: crs, courseComponentIds, assessmentLineItem: ali })
  }

  return legacy
}

function printSummary(legacy: LegacyQuizMetadata[]): void {
  if (legacy.length === 0) {
    logger.info("No legacy quiz resources found; nothing to do.")
    return
  }

  logger.info("Legacy quiz resources identified:", { count: legacy.length })
  for (const entry of legacy) {
    logger.info("Legacy quiz resource", {
      resourceId: entry.resource.sourcedId,
      title: entry.resource.title,
      launchUrl: entry.resource.metadata?.launchUrl,
      componentResourceIds: entry.componentResources.map((cr) => cr.sourcedId),
      courseComponentIds: entry.courseComponentIds,
      assessmentLineItemId: entry.assessmentLineItem?.sourcedId
    })
  }
}

async function deleteLegacyQuizzes(legacy: LegacyQuizMetadata[]): Promise<void> {
  const courseComponentsToDelete = new Set<string>()
  for (const entry of legacy) {
    const { resource, componentResources, courseComponentIds, assessmentLineItem } = entry

    if (assessmentLineItem) {
      logger.info("Deleting assessment line item", { sourcedId: assessmentLineItem.sourcedId })
      const deleteAliResult = await errors.try(oneroster.deleteAssessmentLineItem(assessmentLineItem.sourcedId))
      if (deleteAliResult.error) {
        logger.error("failed to delete assessment line item", {
          sourcedId: assessmentLineItem.sourcedId,
          error: deleteAliResult.error
        })
        throw errors.wrap(deleteAliResult.error, "delete assessment line item")
      }
    }

    for (const cr of componentResources) {
      logger.info("Deleting component resource", { sourcedId: cr.sourcedId })
      const deleteCrResult = await errors.try(oneroster.deleteComponentResource(cr.sourcedId))
      if (deleteCrResult.error) {
        logger.error("failed to delete component resource", {
          sourcedId: cr.sourcedId,
          error: deleteCrResult.error
        })
        throw errors.wrap(deleteCrResult.error, "delete component resource")
      }
    }

    for (const componentId of courseComponentIds) {
      courseComponentsToDelete.add(componentId)
    }

    logger.info("Deleting resource", { sourcedId: resource.sourcedId })
    const deleteResourceResult = await errors.try(oneroster.deleteResource(resource.sourcedId))
    if (deleteResourceResult.error) {
      logger.error("failed to delete resource", {
        sourcedId: resource.sourcedId,
        error: deleteResourceResult.error
      })
      throw errors.wrap(deleteResourceResult.error, "delete resource")
    }
  }

  for (const componentId of courseComponentsToDelete) {
    logger.info("Deleting course component", { sourcedId: componentId })
    const deleteComponentResult = await errors.try(oneroster.deleteCourseComponent(componentId))
    if (deleteComponentResult.error) {
      logger.warn("failed to delete course component (continuing)", {
        sourcedId: componentId,
        error: deleteComponentResult.error
      })
    }
  }
}

async function main(): Promise<void> {
  const { courseId, apply } = parseArgs()
  logger.info("remove-legacy-quiz-resources starting", { courseId, apply })

  const legacy = await collectLegacyQuizzes(courseId)
  printSummary(legacy)

  if (legacy.length === 0) {
    logger.info("Nothing to delete.")
    return
  }

  if (!apply) {
    logger.info("Dry run complete. Re-run with --apply to perform deletions.")
    return
  }

  logger.info("Deleting legacy quizzes...")
  await deleteLegacyQuizzes(legacy)
  logger.info("Deletion complete.", { deletedResources: legacy.length })
}

const result = await errors.try(main())
if (result.error) {
  logger.error("remove-legacy-quiz-resources failed", { error: result.error })
  process.exit(1)
}
