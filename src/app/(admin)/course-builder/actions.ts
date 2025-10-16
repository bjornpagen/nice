"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster, qti } from "@/lib/clients"
import * as crypto from "node:crypto"
import { formatResourceTitleForDisplay } from "@/lib/utils/format-resource-title"
import { getAllResources } from "@/lib/data/fetchers/oneroster"
import { extractQtiStimulusBodyContent } from "@/lib/xml-utils"

// Constants aligned with existing payload builders
const ORG_SOURCED_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
const ACADEMIC_SESSION_SOURCED_ID = "Academic_Year_2025-2026"

// Input schema from the builder panel
const LessonResourceSchema = z.object({
  id: z.string(), // existing OneRoster resource sourcedId
  title: z.string(),
  type: z.enum(["Article", "Video", "Exercise"]),
  xp: z.number(),
  caseIds: z.array(z.string()).optional().default([])
})

const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  resources: z.array(LessonResourceSchema)
})

const UnitSchema = z.object({
  id: z.string(),
  title: z.string(),
  lessons: z.array(LessonSchema)
})

const SUBJECT_OPTIONS = [
  "Math",
  "Science",
  "English Language Arts",
  "Social Studies",
  "Computing",
  "General"
] as const

const GenerateCourseInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  subject: z.enum(SUBJECT_OPTIONS),
  grades: z.array(z.string().min(1)).min(1),
  units: z.array(UnitSchema).min(1)
})

export type GenerateCourseInput = z.infer<typeof GenerateCourseInputSchema>

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function newId(): string {
  return `x${crypto.randomBytes(8).toString("hex")}`
}

function ensurePrefixNice(id: string): string {
  return id.startsWith("nice_") ? id : `nice_${id}`
}

// Build-only: generate full OneRoster-style payload without uploading
export async function buildCoursePayloadAction(input: GenerateCourseInput) {
  const validateResult = GenerateCourseInputSchema.safeParse(input)
  if (!validateResult.success) {
    logger.error("build course payload: invalid input", { error: validateResult.error })
    throw errors.wrap(validateResult.error, "build course payload input")
  }
  const data = validateResult.data

  // Derive base identifiers
  const rawCourseId = newId() // khanId (without nice_)
  const courseSourcedId = ensurePrefixNice(rawCourseId)
  const subjectSlug = toSlug(data.subject)
  const baseSlug = toSlug(data.title)
  const slugSuffix = crypto.randomBytes(2).toString("hex") // 4 hex chars
  const courseSlug = `${baseSlug}-${slugSuffix}`

  // Grades to numbers
  const grades: number[] = []
  for (const g of data.grades) {
    const match = g.match(/(\d+)/)
    if (!match) {
      logger.error("invalid grade format", { grade: g })
      throw errors.new("invalid grade format")
    }
    grades.push(Number.parseInt(match[1]!, 10))
  }

  // Construct course
  const course = {
    sourcedId: courseSourcedId,
    status: "active" as const,
    title: data.title.startsWith("Nice Academy - ") ? data.title : `Nice Academy - ${data.title}`,
    subjects: [data.subject],
    grades,
    courseCode: courseSlug,
    org: { sourcedId: ORG_SOURCED_ID, type: "district" as const },
    academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" as const },
    metadata: {
      timebackVisible: "true",
      primaryApp: "nice_academy",
      khanId: rawCourseId,
      khanSlug: courseSlug,
      khanSubjectSlug: subjectSlug,
      khanTitle: data.title,
      khanDescription: data.description ?? "",
      custom: true,
      AlphaLearn: { publishStatus: "active" }
    } as Record<string, unknown>
  }

  const courseComponents: Array<{
    sourcedId: string
    status: "active" | "tobedeleted"
    title: string
    course: { sourcedId: string; type: "course" }
    parent?: { sourcedId: string; type: "courseComponent" }
    sortOrder: number
    metadata: Record<string, unknown>
  }> = []

  const resources: Array<{
    sourcedId: string
    status: "active" | "tobedeleted"
    title: string
    vendorResourceId: string
    vendorId: string
    applicationId: string
    roles: string[]
    importance: "primary" | "secondary"
    metadata: Record<string, unknown>
  }> = []

  const componentResources: Array<{
    sourcedId: string
    status: "active" | "tobedeleted"
    title: string
    courseComponent: { sourcedId: string; type: "courseComponent" }
    resource: { sourcedId: string; type: "resource" }
    sortOrder: number
  }> = []

  const assessmentLineItems: Array<{
    sourcedId: string
    status: "active" | "tobedeleted"
    title: string
    componentResource: { sourcedId: string } | undefined
    course: { sourcedId: string }
    metadata: Record<string, unknown>
  }> = []

  const qtiCopyPlan: Array<{ sourceId: string; newId: string; title: string }> = []
  const stimuliCopyPlan: Array<{ sourceId: string; newId: string; title: string }> = []

  // Fetch all original resources to copy metadata
  const allResources = await getAllResources()
  const resourceById = new Map(allResources.map((r) => [r.sourcedId, r]))
  
  // Global dedupe: track original resource ID -> new resource ID mapping
  // Remove this - we don't need global deduplication
  // const originalToNewResourceId = new Map<string, string>()

  // Build components and resources
  for (let ui = 0; ui < data.units.length; ui++) {
    const unit = data.units[ui]!
    const unitRawId = newId()
    const unitSourcedId = ensurePrefixNice(unitRawId)
    const unitSlug = toSlug(unit.title)

    courseComponents.push({
      sourcedId: unitSourcedId,
      status: "active",
      title: unit.title,
      course: { sourcedId: courseSourcedId, type: "course" },
      sortOrder: ui,
      metadata: {
        khanId: unitRawId,
        khanSlug: unitSlug,
        khanTitle: unit.title,
        khanDescription: `Unit covering ${unit.title}`
      }
    })

    for (let li = 0; li < unit.lessons.length; li++) {
      const lesson = unit.lessons[li]!
      const lessonRawId = newId()
      const lessonSourcedId = ensurePrefixNice(lessonRawId)
      const lessonSlug = toSlug(lesson.title)
      const lessonPath = `/${subjectSlug}/${courseSlug}/${unitSlug}/${lessonSlug}`

      courseComponents.push({
        sourcedId: lessonSourcedId,
        status: "active",
        title: lesson.title,
        course: { sourcedId: courseSourcedId, type: "course" },
        parent: { sourcedId: unitSourcedId, type: "courseComponent" },
        sortOrder: li,
        metadata: {
          khanId: lessonRawId,
          khanSlug: lessonSlug,
          khanTitle: lesson.title,
          khanDescription: `Lesson covering ${lesson.title}`
        }
      })

      // Track passive resources (videos/articles) until the next exercise
      let passiveForNextExercise: string[] = []

      // Dedupe within-lesson by original resource id to avoid duplicate componentResources
      const seenOriginalResourceIds = new Set<string>()
      let actualResourceIndex = 0

      for (let ri = 0; ri < lesson.resources.length; ri++) {
        const r = lesson.resources[ri]!
        if (seenOriginalResourceIds.has(r.id)) {
          // skip duplicate occurrence of the same original resource within this lesson
          logger.warn("skipping duplicate resource in lesson", { 
            lessonId: lesson.id, 
            resourceId: r.id, 
            title: r.title 
          })
          continue
        }
        seenOriginalResourceIds.add(r.id)
        
        // Always create a new resource for each occurrence
        const rRawId = newId()
        const rSourcedId = ensurePrefixNice(rRawId)
        const rSlug = toSlug(r.title)

        // Fetch original resource to copy all metadata
        const originalResource = resourceById.get(r.id)
        if (!originalResource) {
          logger.error("original resource not found", { resourceId: r.id, title: r.title })
          throw errors.new("original resource not found")
        }
        const originalMeta = (originalResource.metadata ?? {}) as Record<string, unknown>

        // Start with copied metadata from original, then override specific fields
        let metadata: Record<string, unknown> = {
          ...originalMeta, // Copy everything from original
          khanId: rRawId, // Override with new ID
          khanSlug: rSlug, // Override with new slug
          khanTitle: r.title, // Keep title
          path: lessonPath, // New path for new course structure
          type: "interactive",
          toolProvider: "Nice Academy",
          xp: r.xp // Keep XP from builder
        }

        // Update URLs by type
        if (r.type === "Video") {
          metadata.khanActivityType = "Video"
          metadata.launchUrl = `https://www.nice.academy${lessonPath}/v/${rSlug}`
          metadata.url = `https://www.nice.academy${lessonPath}/v/${rSlug}`
        } else if (r.type === "Article") {
          metadata.khanActivityType = "Article"
          metadata.launchUrl = `https://www.nice.academy${lessonPath}/a/${rSlug}`
          metadata.url = `https://www.nice.academy${lessonPath}/a/${rSlug}`
        } else if (r.type === "Exercise") {
          metadata.khanActivityType = "Exercise"
          metadata.launchUrl = `https://www.nice.academy${lessonPath}/e/${rSlug}`
          metadata.url = `https://www.nice.academy${lessonPath}/e/${rSlug}`
          metadata.passiveResources = null
          metadata.nice_passiveResources = [...passiveForNextExercise]
          // reset collector after attaching to exercise
          passiveForNextExercise = []
        }

        // Override CASE if provided in builder (otherwise keep original)
        const hasCase = Array.isArray(r.caseIds) && r.caseIds.length > 0
        if (hasCase) {
          metadata.learningObjectiveSet = [
            {
              source: "CASE",
              learningObjectiveIds: r.caseIds!
            }
          ]
        }

        // Create the resource
        resources.push({
            sourcedId: rSourcedId,
            status: "active",
            title: r.title,
            vendorResourceId: `nice-academy-${rRawId}`,
            vendorId: "superbuilders",
            applicationId: "nice",
            roles: ["primary"],
            importance: "primary",
            metadata
          })

        // Add ALI per PRD
        if (r.type === "Video") {
          assessmentLineItems.push({
            sourcedId: `${rSourcedId}_ali`,
            status: "active",
            title: `Progress for: ${r.title}`,
            componentResource: { sourcedId: `${lessonSourcedId}_${rRawId}` },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: r.type.toLowerCase(), courseSourcedId }
          })
          // collect as passive if grants XP
          if (typeof r.xp === "number" && r.xp > 0) {
            passiveForNextExercise.push(rSourcedId)
          }
        } else if (r.type === "Article") {
          assessmentLineItems.push({
            sourcedId: `${rSourcedId}_ali`,
            status: "active",
            title: `Progress for: ${r.title}`,
            componentResource: { sourcedId: `${lessonSourcedId}_${rRawId}` },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: r.type.toLowerCase(), courseSourcedId }
          })
          // Plan QTI stimulus copy from original article id -> new id
          stimuliCopyPlan.push({ sourceId: r.id, newId: rSourcedId, title: r.title })
          // collect as passive if grants XP
          if (typeof r.xp === "number" && r.xp > 0) {
            passiveForNextExercise.push(rSourcedId)
          }
        } else if (r.type === "Exercise") {
          assessmentLineItems.push({
            sourcedId: `${rSourcedId}_ali`,
            status: "active",
            title: r.title,
            componentResource: { sourcedId: `${lessonSourcedId}_${rRawId}` },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "exercise", courseSourcedId }
          })
          // Plan QTI copy from original exercise id -> new id
          qtiCopyPlan.push({ sourceId: r.id, newId: rSourcedId, title: r.title })
        }

        // ComponentResource with suffixed title
        const titled = formatResourceTitleForDisplay(r.title, r.type)
        componentResources.push({
          sourcedId: `${lessonSourcedId}_${rRawId}`,
          status: "active",
          title: titled,
          courseComponent: { sourcedId: lessonSourcedId, type: "courseComponent" },
          resource: { sourcedId: rSourcedId, type: "resource" },
          sortOrder: actualResourceIndex
        })
        actualResourceIndex++
      }
    }
  }

  // Compute metrics
  let totalXp = 0
  let totalLessons = 0
  for (const cr of componentResources) {
    const resource = resources.find((r) => r.sourcedId === cr.resource.sourcedId)
    if (!resource || resource.status !== "active") continue
    const xp = typeof resource.metadata?.xp === "number" ? (resource.metadata.xp as number) : undefined
    if (xp === undefined) continue
    totalXp += xp
  }
  // lessons == number of exercises
  for (const r of resources) {
    const t = resourceActivity(resourceTypeFromMetadata(r.metadata))
    if (t === "Exercise") totalLessons += 1
  }

  // attach metrics
  const md = (course.metadata ?? {}) as Record<string, unknown>
  md.metrics = { totalXp, totalLessons }
  course.metadata = md

  return {
    course,
    courseComponents,
    resources,
    componentResources,
    assessmentLineItems,
    qtiCopyPlan,
    stimuliCopyPlan
  }

  function resourceTypeFromMetadata(md: Record<string, unknown>): "Article" | "Video" | "Exercise" | undefined {
    const t = typeof md["khanActivityType"] === "string" ? (md["khanActivityType"] as string) : undefined
    if (t === "Article" || t === "Video" || t === "Exercise") return t
    return undefined
  }

  function resourceActivity(t: "Article" | "Video" | "Exercise" | undefined) {
    return t
  }
}

// Execute QTI copy plan: duplicate assessment tests for new exercise IDs
export async function copyQtiTestsAction(plan: Array<{ sourceId: string; newId: string; title: string }>) {
  // Validate plan
  if (!Array.isArray(plan) || plan.length === 0) {
    logger.info("qti copy: empty plan, skipping")
    return { count: 0 }
  }

  for (const { sourceId, newId, title } of plan) {
    if (!sourceId || !newId) {
      logger.error("qti copy: invalid entry", { sourceId, newId })
      throw errors.new("qti copy: invalid entry")
    }

    // 1) Fetch existing assessment test by sourceId
    const getResult = await errors.try(qti.getAssessmentTest(sourceId))
    if (getResult.error) {
      logger.error("qti copy: get assessment test failed", { sourceId, error: getResult.error })
      throw errors.wrap(getResult.error, "qti get assessment test")
    }
    const xml = getResult.data.rawXml
    if (!xml || typeof xml !== "string" || xml.trim() === "") {
      logger.error("qti copy: empty xml", { sourceId })
      throw errors.new("qti copy: empty xml")
    }

    // 2) Rewrite identifier attribute to newId
    // Replace the identifier attribute in the root <qti-assessment-test ... identifier="...">
    const updatedXml = xml.replace(/(<qti-assessment-test[\s\S]*?identifier=")([^"]+)("[\s\S]*?>)/, `$1${newId}$3`)
    if (updatedXml === xml) {
      logger.error("qti copy: failed to rewrite identifier", { sourceId, newId })
      throw errors.new("qti copy: identifier rewrite failed")
    }

    // 3) Create new assessment test with updated XML
    const createResult = await errors.try(qti.createAssessmentTest(updatedXml))
    if (createResult.error) {
      logger.error("qti copy: create assessment test failed", { newId, error: createResult.error })
      throw errors.wrap(createResult.error, "qti create assessment test")
    }

    logger.info("qti copy: created new assessment test", { sourceId, newId, title })
  }

  return { count: plan.length }
}

// Execute stimuli copy plan: duplicate stimuli for new article IDs
export async function copyStimuliAction(plan: Array<{ sourceId: string; newId: string; title: string }>) {
  // Validate plan
  if (!Array.isArray(plan) || plan.length === 0) {
    logger.info("stimuli copy: empty plan, skipping")
    return { count: 0 }
  }

  for (const { sourceId, newId, title } of plan) {
    if (!sourceId || !newId) {
      logger.error("stimuli copy: invalid entry", { sourceId, newId })
      throw errors.new("stimuli copy: invalid entry")
    }

    // 1) Fetch existing stimulus by sourceId
    const getResult = await errors.try(qti.getStimulus(sourceId))
    if (getResult.error) {
      logger.error("stimuli copy: get stimulus failed", { sourceId, error: getResult.error })
      throw errors.wrap(getResult.error, "qti get stimulus")
    }
    const xml = getResult.data.rawXml
    if (!xml || typeof xml !== "string" || xml.trim() === "") {
      logger.error("stimuli copy: empty xml", { sourceId })
      throw errors.new("stimuli copy: empty xml")
    }

    // 2) Rewrite identifier attribute to newId
    // Replace the identifier attribute in the root <qti-assessment-stimulus ... identifier="...">
    const updatedXml = xml.replace(/(<qti-assessment-stimulus[\s\S]*?identifier=")([^"]+)("[\s\S]*?>)/, `$1${newId}$3`)
    if (updatedXml === xml) {
      logger.error("stimuli copy: failed to rewrite identifier", { sourceId, newId })
      throw errors.new("stimuli copy: identifier rewrite failed")
    }

    // 3) Create new stimulus
    // The API expects JSON with identifier, title, and content (XML body only, not the full <qti-assessment-stimulus> document)
    const bodyContent = extractQtiStimulusBodyContent(updatedXml)
    if (!bodyContent) {
      logger.error("stimuli copy: failed to extract body content", { sourceId, newId })
      throw errors.new("stimuli copy: invalid body content")
    }
    const createResult = await errors.try(
      qti.createStimulus({
        identifier: newId,
        title: title,
        content: bodyContent
      })
    )
    if (createResult.error) {
      logger.error("stimuli copy: create stimulus failed", { newId, error: createResult.error })
      throw errors.wrap(createResult.error, "qti create stimulus")
    }

    logger.info("stimuli copy: created new stimulus", { sourceId, newId, title })
  }

  return { count: plan.length }
}

// Step 1: Create course in OneRoster
export async function createCourseStep(courseData: any) {
  const courseCreate = await errors.try(oneroster.createCourse(courseData))
  if (courseCreate.error) {
    logger.error("create course failed", { error: courseCreate.error })
    throw errors.wrap(courseCreate.error, "create course")
  }
  return { success: true }
}

// Step 2: Create course components (units and lessons)
export async function createComponentsStep(components: any[]) {
  const created: string[] = []
  for (const cc of components) {
    logger.info("creating course component", { 
      sourcedId: cc.sourcedId, 
      title: cc.title,
      parent: cc.parent?.sourcedId || 'none'
    })
    const res = await errors.try(oneroster.createCourseComponent(cc))
    if (res.error) {
      logger.error("create course component failed", { 
        sourcedId: cc.sourcedId,
        title: cc.title, 
        parent: cc.parent?.sourcedId || 'none',
        error: res.error 
      })
      throw errors.wrap(res.error, "create course component")
    }
    created.push(cc.sourcedId)
    logger.info("created course component successfully", { sourcedId: cc.sourcedId, title: cc.title })
  }
  return { count: components.length, created }
}

// Step 3: Create resources
export async function createResourcesStep(resources: any[]) {
  for (const r of resources) {
    const res = await errors.try(oneroster.createResource(r))
    if (res.error) {
      logger.error("create resource failed", { title: r.title, error: res.error })
      throw errors.wrap(res.error, "create resource")
    }
  }
  return { count: resources.length }
}

// Step 4: Create component resources
export async function createComponentResourcesStep(componentResources: any[]) {
  const created: string[] = []
  for (const cr of componentResources) {
    logger.info("creating component resource", {
      sourcedId: cr.sourcedId,
      title: cr.title,
      courseComponent: cr.courseComponent?.sourcedId,
      resource: cr.resource?.sourcedId
    })
    const res = await errors.try(oneroster.createComponentResource(cr))
    if (res.error) {
      logger.error("create componentResource failed", { 
        sourcedId: cr.sourcedId,
        title: cr.title,
        courseComponent: cr.courseComponent?.sourcedId,
        resource: cr.resource?.sourcedId,
        error: res.error 
      })
      throw errors.wrap(res.error, "create componentResource")
    }
    created.push(cr.sourcedId)
  }
  logger.info("created all component resources", { count: componentResources.length })
  return { count: componentResources.length, created }
}

// Step 5: Create assessment line items
export async function createAssessmentLineItemsStep(lineItems: any[]) {
  for (const ali of lineItems) {
    const res = await errors.try(
      oneroster.putAssessmentLineItem(ali.sourcedId, {
        assessmentLineItem: {
          sourcedId: ali.sourcedId,
          status: ali.status,
          title: ali.title,
          componentResource: ali.componentResource ? { sourcedId: ali.componentResource.sourcedId } : undefined,
          course: { sourcedId: ali.course.sourcedId },
          metadata: ali.metadata
        } as any
      })
    )
    if (res.error) {
      logger.error("put assessment line item failed", { id: ali.sourcedId, error: res.error })
      throw errors.wrap(res.error, "put assessment line item")
    }
  }
  return { count: lineItems.length }
}


