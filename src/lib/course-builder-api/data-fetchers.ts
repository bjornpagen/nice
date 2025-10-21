import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { Subject } from "@/lib/course-builder-api/schema"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { getAllResources, getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"
import { caseApi, qti } from "@/lib/clients"

export async function fetchAllResourcesForCases(caseIds: string[], subject: Subject): Promise<{
  resources: unknown[]
  matchedCaseIds: string[]
  unmatchedCaseIds: string[]
}> {
  logger.info("fetching resources for cases", { count: caseIds.length, subject })

  const allResResult = await errors.try(getAllResources())
  if (allResResult.error) {
    logger.error("fetch all resources failed", { error: allResResult.error })
    throw errors.wrap(allResResult.error, "oneroster getAllResources")
  }

  const resources = allResResult.data

  // First, build allowlist of course slugs (non-custom courses only)
  // This matches the course builder page logic exactly
  const uniqueSlugs = new Set<string>()
  for (const r of resources) {
    const md = (r.metadata ?? {}) as Record<string, unknown>
    const path = typeof md.path === "string" ? md.path : undefined
    if (!path) continue
    const parts = path.split("/").filter(Boolean)
    // path: /<subjectSlug>/<courseSlug>/...
    const slug = parts[1]
    if (slug) uniqueSlugs.add(slug)
  }

  const allowSlugs = new Set<string>()
  await Promise.all(
    Array.from(uniqueSlugs).map(async (slug) => {
      const res = await errors.try(getAllCoursesBySlug(slug))
      if (res.error) {
        logger.debug("courses by slug fetch failed", { slug, error: res.error })
        return
      }
      const course = res.data?.[0]
      if (!course) {
        // No active course for this slug (likely tobedeleted) → exclude
        return
      }
      const meta = (course.metadata ?? {}) as Record<string, unknown>
      const isCustom = meta.custom === true || meta.custom === "true"
      if (!isCustom) allowSlugs.add(slug)
    })
  )

  logger.info("built course slug allowlist", { 
    totalSlugs: uniqueSlugs.size, 
    allowedSlugs: allowSlugs.size,
    excludedCustomSlugs: uniqueSlugs.size - allowSlugs.size
  })

  // Derive subjectSlug from metadata.path when available, and filter by subject if possible
  const subjectSlug = subjectToSlug(subject)
  logger.debug("resource filter params", { subjectSlug, caseIdsSample: caseIds.slice(0, 5) })

  // Counters for debug visibility
  let cInvalidMeta = 0
  let cNonInteractive = 0
  let cWrongType = 0
  let cSubjectMismatch = 0
  let cNoCaseMap = 0
  let cNoCaseOverlap = 0
  let cExcludedCustomCourse = 0
  let cPassed = 0

  const providedCaseIds = Array.isArray(caseIds) ? Array.from(new Set(caseIds.filter((id) => typeof id === "string" && id.trim().length > 0))) : []
  const matchedCaseIdsSet = new Set<string>()

  const filtered = resources.filter((r) => {
    // First apply the SAME filtering as the course builder page
    const md = (r.metadata ?? {}) as Record<string, unknown>
    const path = typeof md.path === "string" ? md.path : undefined
    if (!path) {
      // Page keeps resources without paths - but we need to apply other filters
    } else {
      const parts = path.split("/").filter(Boolean)
      const slug = parts[1]
      if (slug && !allowSlugs.has(slug)) {
        // This resource is from a custom course, exclude it
        cExcludedCustomCourse++
        return false
      }
    }
    
    // Now apply API-specific filters for AI consumption
    // Filter to interactive Articles, Videos, Exercises only
    const metaResult = ResourceMetadataSchema.safeParse(r.metadata)
    if (!metaResult.success) {
      cInvalidMeta++
      return false
    }
    const meta = metaResult.data
    if (meta.type !== "interactive") {
      cNonInteractive++
      return false
    }
    if (meta.khanActivityType !== "Article" && meta.khanActivityType !== "Video" && meta.khanActivityType !== "Exercise") {
      cWrongType++
      return false
    }

    // Filter by subject if we can infer it from path
    const rawMd = (r.metadata ?? {}) as Record<string, unknown>
    const pathVal = typeof rawMd.path === "string" ? (rawMd.path as string) : ""
    if (subjectSlug && pathVal.startsWith(`/${subjectSlug}/`)) {
      // ok
    } else if (subjectSlug && pathVal) {
      cSubjectMismatch++
      return false
    }

    // Filter by CASE ids if present
    const los = rawMd.learningObjectiveSet as
      | Array<{ source: string; learningObjectiveIds: string[] }>
      | undefined
    const caseIdsInMd = Array.isArray(los)
      ? los
          .filter((lo) => lo && lo.source === "CASE" && Array.isArray(lo.learningObjectiveIds))
          .flatMap((lo) => lo.learningObjectiveIds)
          .filter((id) => typeof id === "string" && id.length > 0)
      : []

    if (providedCaseIds.length > 0 && caseIdsInMd.length > 0) {
      const hasOverlap = caseIdsInMd.some((id) => providedCaseIds.includes(id))
      if (!hasOverlap) {
        cNoCaseOverlap++
        return false
      }
      // Track all matched ids for coverage analysis
      for (const id of caseIdsInMd) {
        if (providedCaseIds.includes(id)) matchedCaseIdsSet.add(id)
      }
    } else if (providedCaseIds.length > 0 && caseIdsInMd.length === 0) {
      // This resource has no CASE mapping; exclude when caseIds filter provided
      cNoCaseMap++
      return false
    }
    cPassed++
    return true
  })

  // Deduplicate canonical originals before returning to AI
  const byKey = new Map<string, unknown>()
  for (const r of filtered as Array<{ sourcedId?: string; title?: string; metadata?: unknown }>) {
    const metaResult = ResourceMetadataSchema.safeParse(r.metadata)
    if (!metaResult.success) continue
    const meta = metaResult.data
    const activity = meta.khanActivityType ?? ""
    const slug = typeof (meta as any)?.khanSlug === "string" ? ((meta as any).khanSlug as string) : ""
    const titleKey = typeof r.title === "string" && r.title.trim().length > 0 ? r.title.trim().toLowerCase() : (r.sourcedId ?? "")
    const key = `${activity}|${slug || titleKey}`
    if (!byKey.has(key)) byKey.set(key, r)
  }

  const result = Array.from(byKey.values())

  // Compute unmatched CASE ids from original request
  const matchedCaseIds = Array.from(matchedCaseIdsSet)
  const unmatchedCaseIds = providedCaseIds.filter((id) => !matchedCaseIdsSet.has(id))

  logger.info("fetched and filtered resources", {
    total: resources.length,
    filtered: filtered.length,
    deduped: result.length,
    subject
  })
  logger.debug("resource filter counters", {
    invalidMeta: cInvalidMeta,
    nonInteractive: cNonInteractive,
    wrongType: cWrongType,
    subjectMismatch: cSubjectMismatch,
    noCaseMap: cNoCaseMap,
    noCaseOverlap: cNoCaseOverlap,
    excludedCustomCourse: cExcludedCustomCourse,
    passed: cPassed
  })
  return { resources: result, matchedCaseIds, unmatchedCaseIds }
}

export async function fetchStimuliAndAssessments(resources: unknown[]): Promise<unknown> {
  const count = Array.isArray(resources) ? resources.length : 0
  logger.info("fetching stimuli and assessments", { count })

  const stimuli: Array<{ id: string; title: string; rawXml: string }> = []
  const tests: Array<{ id: string; title: string; rawXml: string }> = []

  if (Array.isArray(resources)) {
    for (const r of resources as Array<{ sourcedId?: string; title?: string; metadata?: unknown }>) {
      const metaResult = ResourceMetadataSchema.safeParse(r.metadata)
      if (!metaResult.success) continue
      const meta = metaResult.data
      if (meta.type !== "interactive") continue

      // The OneRoster resource.sourcedId is used as the identifier for QTI assets by convention in our system
      const id = r.sourcedId ?? ""
      const title = r.title ?? id

      if (!id) continue

      if (meta.khanActivityType === "Article") {
        const stimResult = await errors.try(qti.getStimulus(id))
        if (stimResult.error) {
          logger.error("qti stimulus fetch failed", { id, error: stimResult.error })
          throw errors.wrap(stimResult.error, "qti get stimulus")
        }
        stimuli.push({ id, title, rawXml: stimResult.data.rawXml })
      } else if (meta.khanActivityType === "Exercise") {
        const testResult = await errors.try(qti.getAssessmentTest(id))
        if (testResult.error) {
          logger.error("qti test fetch failed", { id, error: testResult.error })
          throw errors.wrap(testResult.error, "qti get assessment test")
        }
        tests.push({ id, title, rawXml: testResult.data.rawXml })
      }
    }
  }

  return { stimuli, tests }
}

export async function fetchCaseDetails(caseIds: string[]): Promise<unknown> {
  logger.info("fetching case details", { count: caseIds.length })
  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    return []
  }

  const results = await Promise.all(
    caseIds.map(async (id) => {
      const res = await errors.try(caseApi.getCFItem(id, { fields: "humanCodingScheme,fullStatement,abbreviatedStatement" }))
      if (res.error) {
        logger.error("case item fetch failed", { id, error: res.error })
        // Bubble up with context; fail fast to avoid guessing
        throw errors.wrap(res.error, "case getCFItem")
      }
      const item = res.data
      return { 
        id: id,
        humanCodingScheme: item?.humanCodingScheme || "",
        fullStatement: item?.fullStatement || "",
        abbreviatedStatement: item?.abbreviatedStatement || ""
      }
    })
  )

  return results
}

function subjectToSlug(subject: Subject): string {
  // Map subjects to actual path slugs used in resources
  // These match the actual subject slugs in resource paths (e.g., /math/, /science/)
  const subjectSlugMapping: Record<Subject, string> = {
    "Math": "math",
    "Science": "science", 
    "English Language Arts": "ela", // ELA resources use /ela/ path
    "Social Studies": "humanities", // Social Studies maps to humanities
    "Computing": "computing",
    "General": "" // General doesn't have a specific path filter
  }
  
  return subjectSlugMapping[subject] || ""
}


