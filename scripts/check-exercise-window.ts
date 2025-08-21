import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { oneroster } from "@/lib/clients"

type Resource = {
  sourcedId: string
  title: string
  status: string
  metadata?: Record<string, unknown>
}

type ComponentResource = {
  resource: { sourcedId: string }
  courseComponent: { sourcedId: string }
  sortOrder: number
  status: string
}

type CourseComponent = {
  sourcedId: string
  parent?: { sourcedId: string } | null
  sortOrder: number
  status: string
}

function isInteractiveExercise(resource: Resource): boolean {
  const meta = resource.metadata || {}
  const t = meta.type
  const a = meta.khanActivityType
  return t === "interactive" && a === "Exercise"
}

function isInteractivePassive(resource: Resource): boolean {
  const meta = resource.metadata || {}
  const t = meta.type
  const a = meta.khanActivityType
  return t === "interactive" && (a === "Article" || a === "Video")
}

async function main(): Promise<void> {
  const exerciseTitle = process.argv.slice(2).join(" ")
  if (!exerciseTitle) {
    logger.error("usage: bun run tsx scripts/check-exercise-window.ts <exercise title>")
    throw errors.new("missing exercise title")
  }

  // 1) find exercise resource by title
  const allResourcesResult = await errors.try(
    oneroster.getAllResources({ filter: "sourcedId>='nice' AND sourcedId<'nicf'" })
  )
  if (allResourcesResult.error) {
    logger.error("failed to fetch resources", { error: allResourcesResult.error })
    throw errors.wrap(allResourcesResult.error, "get all resources")
  }
  const resources = allResourcesResult.data as Resource[]

  const matchingExercises = resources.filter((r) => {
    if (r.status !== "active") return false
    const title = typeof r.title === "string" ? r.title.trim().toLowerCase() : ""
    return title === exerciseTitle.trim().toLowerCase() && isInteractiveExercise(r)
  })

  if (matchingExercises.length === 0) {
    logger.info("no matching exercise found", { title: exerciseTitle })
    return
  }
  if (matchingExercises.length > 1) {
    logger.warn("multiple exercises matched title; using first", {
      count: matchingExercises.length,
      ids: matchingExercises.map((r) => r.sourcedId)
    })
  }

  const exercise = matchingExercises[0]
  if (!exercise) {
    logger.error("unexpected missing exercise after non-empty filter", { title: exerciseTitle })
    throw errors.new("unexpected missing exercise")
  }
  const exerciseResourceId = exercise.sourcedId

  // 2) locate component resource for the exercise to derive lesson and sort order
  const crForExerciseResult = await errors.try(
    oneroster.getAllComponentResources({
      filter: `resource.sourcedId='${exerciseResourceId}' AND status='active'`
    })
  )
  if (crForExerciseResult.error) {
    logger.error("failed to fetch component resource for exercise", { error: crForExerciseResult.error })
    throw errors.wrap(crForExerciseResult.error, "get component resource for exercise")
  }
  const crForExercise = (crForExerciseResult.data as ComponentResource[])[0]
  if (!crForExercise) {
    logger.info("exercise has no component resource", { exerciseResourceId })
    return
  }
  const lessonId = crForExercise.courseComponent.sourcedId
  const exerciseSortOrder = crForExercise.sortOrder

  // 3) resolve parent unit from the lesson
  const lessonResult = await errors.try(
    oneroster.getCourseComponents({ filter: `sourcedId='${lessonId}' AND status='active'` })
  )
  if (lessonResult.error) {
    logger.error("failed to fetch lesson component", { error: lessonResult.error })
    throw errors.wrap(lessonResult.error, "get lesson component")
  }
  const lesson = (lessonResult.data as CourseComponent[])[0]
  const unitId = lesson?.parent?.sourcedId
  if (!unitId) {
    logger.info("could not resolve parent unit for exercise", { lessonId })
    return
  }

  // 4) list all lessons in unit and build sort map
  const unitLessonsResult = await errors.try(
    oneroster.getCourseComponents({
      filter: `parent.sourcedId='${unitId}' AND status='active'`,
      orderBy: "asc",
      sort: "sortOrder"
    })
  )
  if (unitLessonsResult.error) {
    logger.error("failed to fetch unit lessons", { error: unitLessonsResult.error })
    throw errors.wrap(unitLessonsResult.error, "get unit lessons")
  }
  const unitLessons = unitLessonsResult.data as CourseComponent[]
  const lessonSortOrderMap = new Map<string, number>()
  for (const c of unitLessons) lessonSortOrderMap.set(c.sourcedId, c.sortOrder)
  const currentLessonSort = lessonSortOrderMap.get(lessonId) ?? 0

  // 5) get all component resources under unit lessons
  const lessonIds = unitLessons.map((l) => l.sourcedId)
  const unitCrsResult = await errors.try(
    oneroster.getAllComponentResources({
      filter: `courseComponent.sourcedId@'${lessonIds.join(",")}' AND status='active'`
    })
  )
  if (unitCrsResult.error) {
    logger.error("failed to fetch unit component resources", { error: unitCrsResult.error })
    throw errors.wrap(unitCrsResult.error, "get unit component resources")
  }
  const unitCrs = unitCrsResult.data as ComponentResource[]
  const allResourceIds = unitCrs.map((cr) => cr.resource.sourcedId)

  // 6) fetch metadata for those resources
  const unitResourcesResult = await errors.try(
    oneroster.getAllResources({ filter: `sourcedId@'${allResourceIds.join(",")}' AND status='active'` })
  )
  if (unitResourcesResult.error) {
    logger.error("failed to fetch unit resources", { error: unitResourcesResult.error })
    throw errors.wrap(unitResourcesResult.error, "get unit resources")
  }
  const unitResources = unitResourcesResult.data as Resource[]
  const resourceMap = new Map(unitResources.map((r) => [r.sourcedId, r]))

  // 7) find previous exercise by tuple ordering
  let prev: { lessonSort: number; contentSort: number } | null = null
  for (const cr of unitCrs) {
    const r = resourceMap.get(cr.resource.sourcedId)
    const ls = lessonSortOrderMap.get(cr.courseComponent.sourcedId) ?? 0
    if (!r || !isInteractiveExercise(r)) continue
    if (cr.resource.sourcedId === exerciseResourceId) continue
    const isBefore = ls < currentLessonSort || (ls === currentLessonSort && cr.sortOrder < exerciseSortOrder)
    if (!isBefore) continue
    if (!prev) {
      prev = { lessonSort: ls, contentSort: cr.sortOrder }
      continue
    }
    const isAfterPrev = ls > prev.lessonSort || (ls === prev.lessonSort && cr.sortOrder > prev.contentSort)
    if (isAfterPrev) prev = { lessonSort: ls, contentSort: cr.sortOrder }
  }

  // 8) collect passive candidates strictly between prev and current
  const candidates: string[] = []
  for (const cr of unitCrs) {
    const ls = lessonSortOrderMap.get(cr.courseComponent.sourcedId) ?? 0
    const afterPrev = prev ? ls > prev.lessonSort || (ls === prev.lessonSort && cr.sortOrder > prev.contentSort) : true
    const beforeCurrent = ls < currentLessonSort || (ls === currentLessonSort && cr.sortOrder < exerciseSortOrder)
    if (!(afterPrev && beforeCurrent)) continue
    const r = resourceMap.get(cr.resource.sourcedId)
    if (r && isInteractivePassive(r)) candidates.push(r.sourcedId)
  }

  logger.info("exercise banking window computed", {
    exercise: { id: exerciseResourceId, title: exercise.title },
    unitId,
    boundaries: {
      prevLessonSort: prev?.lessonSort ?? -1,
      prevContentSort: prev?.contentSort ?? -1,
      currentLessonSort,
      currentContentSort: exerciseSortOrder
    },
    candidateCount: candidates.length,
    candidates
  })
}

const run = await errors.try(main())
if (run.error) {
  logger.error("operation failed", { error: run.error })
  process.exit(1)
}



