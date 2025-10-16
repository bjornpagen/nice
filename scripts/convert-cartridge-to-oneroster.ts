#!/usr/bin/env bun
import * as path from "node:path"
import * as fs from "node:fs/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// NOTE: We do not import DB or use Inngest here. This is a pure converter.
// Cartridge reader APIs are provided by the published package under /cartridge/* subpaths.
import { openCartridgeTarZst } from "@superbuilders/qti-assessment-item-generator/cartridge/readers/tarzst"
import {
  iterUnits,
  iterUnitLessons,
  iterLessonResources,
  readArticleContent,
  readIndex,
  readUnit
} from "@superbuilders/qti-assessment-item-generator/cartridge/client"
import type { IndexV1, Unit as CartUnit, Lesson as CartLesson, Resource } from "@superbuilders/qti-assessment-item-generator/cartridge/types"

// Constants aligned with src/lib/payloads/oneroster/course.ts
const ORG_SOURCED_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
const ACADEMIC_SESSION_SOURCED_ID = "Academic_Year_2025-2026"
const QUIZ_XP = 4
const UNIT_TEST_XP = 6
const READING_WORDS_PER_MINUTE = 200

type OneRosterGUIDRef = { sourcedId: string; type: "course" | "academicSession" | "org" | "courseComponent" | "resource" | "term" | "district" }

type OneRosterCourse = {
  sourcedId: string
  status: "active"
  title: string
  subjects: string[]
  grades: number[]
  courseCode: string
  org: OneRosterGUIDRef
  academicSession: OneRosterGUIDRef
  metadata?: Record<string, unknown>
}

type OneRosterClass = {
  sourcedId: string
  status: "active"
  title: string
  classType: "scheduled"
  course: OneRosterGUIDRef
  school: OneRosterGUIDRef
  terms: OneRosterGUIDRef[]
}

type OneRosterCourseComponent = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  course: OneRosterGUIDRef
  parent?: OneRosterGUIDRef
  sortOrder: number
  metadata?: Record<string, unknown>
}

type OneRosterResource = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  vendorResourceId: string
  vendorId: string
  applicationId: string
  roles: string[]
  importance: "primary" | "secondary"
  metadata: Record<string, unknown>
}

type OneRosterCourseComponentResource = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  courseComponent: OneRosterGUIDRef
  resource: OneRosterGUIDRef
  sortOrder: number
}

type OneRosterAssessmentLineItem = {
  sourcedId: string
  status: "active" | "tobedeleted"
  title: string
  componentResource?: { sourcedId: string }
  course: { sourcedId: string }
  metadata?: Record<string, unknown>
}

type OneRosterPayload = {
  course: OneRosterCourse
  class: OneRosterClass
  courseComponents: OneRosterCourseComponent[]
  resources: OneRosterResource[]
  componentResources: OneRosterCourseComponentResource[]
  assessmentLineItems: OneRosterAssessmentLineItem[]
}

function mapSubjectToOneRosterSubjects(subject: string): string[] {
  const mapping: Record<string, string[]> = {
    "English": ["Reading", "Vocabulary"],
    "English Language Arts": ["Reading", "Vocabulary"],
    "Math": ["Math"],
    "Science": ["Science"],
    "Arts and Humanities": ["Social Studies"],
    "Economics": ["Social Studies"],
    "Computing": ["Science"],
    "Test Prep": ["Reading", "Math"],
    "College, Careers, and More": ["Social Studies"]
  }
  const mapped = mapping[subject]
  if (!mapped) {
    logger.error("subject mapping missing", { subject })
    throw errors.new("subject mapping: subject not supported")
  }
  return mapped
}

function addNiceAcademyPrefix(title: string): string {
  const prefix = "Nice Academy - "
  return title.startsWith(prefix) ? title : `${prefix}${title}`
}

function getLastPathSegment(p: string): string {
  const segs = p.split("/").filter(Boolean)
  return segs[segs.length - 1] || ""
}

function formatResourceTitleForDisplay(baseTitle: string, kind: "Article" | "Video" | "Exercise"): string {
  // Match existing UI convention: "Title [Article]"
  return `${baseTitle} [${kind}]`
}

async function computeArticleXpFromHtml(html: string): Promise<number> {
  // Minimal readable text extraction: strip tags, script/style/math blocks
  let cleaned = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<math[\s\S]*?<\/math>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  if (cleaned === "") {
    logger.error("article stimulus has no readable text")
    throw errors.new("article stimulus: no readable text")
  }
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length
  if (!Number.isFinite(wordCount) || wordCount <= 0) {
    logger.error("article word count invalid", { wordCount })
    throw errors.new("article stimulus: invalid word count")
  }
  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
}

function subjectToRouteSegment(subject: string): string {
  return subject.toLowerCase().replace(/\s+/g, "-")
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const getFlag = (name: string) => {
    const idx = args.findIndex((a) => a === `--${name}`)
    return idx >= 0 ? args[idx + 1] : undefined
  }

  const input = getFlag("input")
  const slug = getFlag("slug")
  const courseId = getFlag("course-id")
  const gradesRaw = getFlag("grades")

  if (!input || !slug || !courseId || !gradesRaw) {
    process.stderr.write(
      "Usage: convert-cartridge-to-oneroster --input /abs/file.tar.zst --slug <course-slug> --course-id <id> --grades <n[,n,...]>\n"
    )
    process.exit(1)
  }

  const grades = gradesRaw.split(",").map((g) => Number(g.trim()))
  if (grades.some((n) => !Number.isInteger(n) || n < 0 || n > 12)) {
    logger.error("invalid grades", { gradesRaw })
    throw errors.new("grades: must be integers between 0 and 12")
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN
  if (!appDomain || typeof appDomain !== "string") {
    logger.error("CRITICAL: NEXT_PUBLIC_APP_DOMAIN missing or invalid", { NEXT_PUBLIC_APP_DOMAIN: appDomain })
    throw errors.new("configuration: NEXT_PUBLIC_APP_DOMAIN is required")
  }
  const baseDomain = appDomain.replace(/\/$/, "")

  logger.info("opening cartridge", { input })
  const readerResult = await errors.try(openCartridgeTarZst(input))
  if (readerResult.error) {
    logger.error("failed to open cartridge", { input, error: readerResult.error })
    throw errors.wrap(readerResult.error, "open cartridge")
  }
  const reader = readerResult.data

  // Read index.json via client helper (package export)
  const indexResult = await errors.try(readIndex(reader))
  if (indexResult.error) {
    logger.error("failed to read index.json", { error: indexResult.error })
    throw errors.wrap(indexResult.error, "read index")
  }
  const indexJson = indexResult.data as IndexV1
  if (!indexJson) {
    logger.error("missing index.json in cartridge")
    throw errors.new("cartridge: index.json missing")
  }

  // Validate presence of required course fields
  if (!indexJson.course?.title || !indexJson.course?.subject) {
    logger.error("index.course missing required fields", { course: indexJson.course })
    throw errors.new("index.course: missing title or subject")
  }

  const courseSourcedId = `nice_${courseId}`
  const subjectList = mapSubjectToOneRosterSubjects(indexJson.course.subject)
  const subjectRoute = subjectToRouteSegment(indexJson.course.subject)

  const payload: OneRosterPayload = {
    course: {
      sourcedId: courseSourcedId,
      status: "active",
      title: addNiceAcademyPrefix(indexJson.course.title),
      subjects: subjectList,
      grades,
      courseCode: slug,
      org: { sourcedId: ORG_SOURCED_ID, type: "district" },
      academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" },
      metadata: {
        generator: indexJson.generator,
        timebackVisible: "true",
        primaryApp: "nice_academy",
        khanId: courseId,
        khanSlug: slug,
        khanSubjectSlug: subjectRoute,
        khanTitle: indexJson.course.title,
        khanDescription: "",
        AlphaLearn: {
          publishStatus: "active"
        }
      }
    },
    class: {
      sourcedId: courseSourcedId,
      status: "active",
      title: addNiceAcademyPrefix(indexJson.course.title),
      classType: "scheduled",
      course: { sourcedId: courseSourcedId, type: "course" },
      school: { sourcedId: ORG_SOURCED_ID, type: "org" },
      terms: [{ sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" }]
    },
    courseComponents: [],
    resources: [],
    componentResources: [],
    assessmentLineItems: []
  }

  const resourceSeen = new Set<string>()
  let totalXp = 0
  let totalLessons = 0

  for await (const unit of iterUnits(reader) as AsyncIterable<CartUnit>) {
    if (!unit.title || typeof unit.unitNumber !== "number") {
      logger.error("unit missing title or unitNumber", { unit })
      throw errors.new("unit: missing required fields")
    }
    const unitEntryFromIndex = indexJson.units.find((u) => u.id === unit.id)
    const unitSlug = getLastPathSegment(unitEntryFromIndex?.path ?? unit.id)

    payload.courseComponents.push({
      sourcedId: `nice_${unit.id}`,
      status: "active",
      title: unit.title,
      course: { sourcedId: courseSourcedId, type: "course" },
      sortOrder: unit.unitNumber,
      metadata: { khanId: unit.id, khanSlug: unitSlug, khanTitle: unit.title }
    })

    // Read unit.json to access canonical lesson paths
    if (!unitEntryFromIndex?.path || unitEntryFromIndex.path === "") {
      logger.error("unit path missing in index", { unitId: unit.id })
      throw errors.new("unit path: missing in index")
    }
    const unitDataResult = await errors.try(readUnit(reader, unitEntryFromIndex.path))
    if (unitDataResult.error) {
      logger.error("failed to read unit json", { unitId: unit.id, error: unitDataResult.error })
      throw errors.wrap(unitDataResult.error, "read unit json")
    }
    const unitData = unitDataResult.data
    const lessonIdToPath = new Map<string, string>()
    for (const l of unitData.lessons) {
      if (!l.path || l.path === "") {
        logger.error("lesson missing path", { lessonId: l.id, unitId: unit.id })
        throw errors.new("lesson: missing path")
      }
      lessonIdToPath.set(l.id, l.path)
    }

    const lessons: CartLesson[] = []
    for await (const lesson of iterUnitLessons(reader, unit) as AsyncIterable<CartLesson>) {
      lessons.push(lesson)
    }

    // sort lessons by lessonNumber deterministically
    lessons.sort((a, b) => a.lessonNumber - b.lessonNumber)
    for (const lesson of lessons) {
      if (!lesson.title || typeof lesson.lessonNumber !== "number") {
        logger.error("lesson missing title or lessonNumber", { lesson })
        throw errors.new("lesson: missing required fields")
      }
      const unitEntry = indexJson.units.find((u) => u.id === unit.id)
      const unitSlug2 = getLastPathSegment(unitEntry?.path ?? unit.id)
      const lessonPath = lessonIdToPath.get(lesson.id)
      if (!lessonPath) {
        logger.error("lesson path not found in unit json", { unitId: unit.id, lessonId: lesson.id })
        throw errors.new("lesson path: not found")
      }
      const lessonSlug = getLastPathSegment(lessonPath)

      payload.courseComponents.push({
        sourcedId: `nice_${lesson.id}`,
        status: "active",
        title: lesson.title,
        course: { sourcedId: courseSourcedId, type: "course" },
        parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
        sortOrder: lesson.lessonNumber,
        metadata: { khanId: lesson.id, khanSlug: lessonSlug, khanTitle: lesson.title }
      })

      let resourceIndex = 0
      for await (const res of iterLessonResources(reader, lesson) as AsyncIterable<Resource>) {
        resourceIndex++
        if (res.type === "article") {
          const htmlResult = await errors.try(readArticleContent(reader, res.path))
          if (htmlResult.error) {
            logger.error("failed to read article stimulus", { path: res.path, error: htmlResult.error })
            throw errors.wrap(htmlResult.error, "read article")
          }
          const xp = await computeArticleXpFromHtml(htmlResult.data)
          const articleSlug = getLastPathSegment(path.dirname(res.path))
          const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlug2}/${lessonSlug}/a/${articleSlug}`
          const resourceId = `nice_${res.id}`
          if (resourceSeen.has(resourceId)) {
            logger.error("duplicate resource id", { id: res.id })
            throw errors.new("resource id collision")
          }
          resourceSeen.add(resourceId)

          payload.resources.push({
            sourcedId: resourceId,
            status: "active",
            title: lesson.title,
            vendorResourceId: `nice-academy-${res.id}`,
            vendorId: "superbuilders",
            applicationId: "nice",
            roles: ["primary"],
            importance: "primary",
            metadata: {
              type: "interactive",
              toolProvider: "Nice Academy",
              khanActivityType: "Article",
              launchUrl: launch,
              url: launch,
              khanId: res.id,
              khanSlug: articleSlug,
              khanTitle: lesson.title,
              xp
            }
          })

          payload.componentResources.push({
            sourcedId: `nice_${lesson.id}_${res.id}`,
            status: "active",
            title: formatResourceTitleForDisplay(lesson.title, "Article"),
            courseComponent: { sourcedId: `nice_${lesson.id}`, type: "courseComponent" },
            resource: { sourcedId: resourceId, type: "resource" },
            sortOrder: resourceIndex
          })

          payload.assessmentLineItems.push({
            sourcedId: `${resourceId}_ali`,
            status: "active",
            title: `Progress for: ${lesson.title}`,
            componentResource: { sourcedId: `nice_${lesson.id}_${res.id}` },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "article", courseSourcedId }
          })

          totalXp += xp
          totalLessons += 1
        } else if (res.type === "quiz") {
          const quizSlug = getLastPathSegment(res.path)
          // Create intermediate component for quiz
          payload.courseComponents.push({
            sourcedId: `nice_${res.id}`,
            status: "active",
            title: lesson.title,
            course: { sourcedId: courseSourcedId, type: "course" },
            parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
            sortOrder: lesson.lessonNumber, // position alongside lesson
            metadata: { khanId: res.id, khanSlug: quizSlug, khanTitle: lesson.title }
          })

          const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlug2}/${lessonSlug}/quiz/${quizSlug}`
          const resourceId = `nice_${res.id}`
          if (resourceSeen.has(resourceId)) {
            logger.error("duplicate resource id", { id: res.id })
            throw errors.new("resource id collision")
          }
          resourceSeen.add(resourceId)

          payload.resources.push({
            sourcedId: resourceId,
            status: "active",
            title: lesson.title,
            vendorResourceId: `nice-academy-${res.id}`,
            vendorId: "superbuilders",
            applicationId: "nice",
            roles: ["primary"],
            importance: "primary",
            metadata: {
              type: "interactive",
              toolProvider: "Nice Academy",
              khanActivityType: "Quiz",
              khanLessonType: "quiz",
              launchUrl: launch,
              url: launch,
              khanId: res.id,
              khanSlug: quizSlug,
              khanTitle: lesson.title,
              xp: QUIZ_XP
            }
          })

          payload.componentResources.push({
            sourcedId: `nice_${res.id}_${res.id}`,
            status: "active",
            title: lesson.title,
            courseComponent: { sourcedId: `nice_${res.id}`, type: "courseComponent" },
            resource: { sourcedId: resourceId, type: "resource" },
            sortOrder: 0
          })

          payload.assessmentLineItems.push({
            sourcedId: `${resourceId}_ali`,
            status: "active",
            title: lesson.title,
            componentResource: { sourcedId: `nice_${res.id}_${res.id}` },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "quiz", courseSourcedId }
          })

          totalXp += QUIZ_XP
          totalLessons += 1
        }
      }

      // Unit test (optional)
      if (unit.unitTest) {
        const lastLesson = lessons[lessons.length - 1]
        if (!lastLesson) {
          logger.error("assessment launch url: no lessons in unit", { unitId: unit.id })
          throw errors.new("assessment launch url: no lessons in unit")
        }
        const lastLessonPath = lessonIdToPath.get(lastLesson.id)
        if (!lastLessonPath) {
          logger.error("last lesson path missing", { unitId: unit.id, lessonId: lastLesson.id })
          throw errors.new("lesson path: not found")
        }
        const lastLessonSlug = getLastPathSegment(lastLessonPath)
        const testSlug = getLastPathSegment(unit.unitTest.path)

        payload.courseComponents.push({
          sourcedId: `nice_${unit.unitTest.id}`,
          status: "active",
          title: unit.unitTest.id,
          course: { sourcedId: courseSourcedId, type: "course" },
          parent: { sourcedId: `nice_${unit.id}`, type: "courseComponent" },
          sortOrder: lastLesson.lessonNumber + 1,
          metadata: { khanId: unit.unitTest.id, khanSlug: testSlug, khanTitle: unit.unitTest.id }
        })

        const launch = `${baseDomain}/${subjectRoute}/${slug}/${unitSlug2}/${lastLessonSlug}/test/${testSlug}`
        const resourceId = `nice_${unit.unitTest.id}`
        if (resourceSeen.has(resourceId)) {
          logger.error("duplicate resource id", { id: unit.unitTest.id })
          throw errors.new("resource id collision")
        }
        resourceSeen.add(resourceId)

        payload.resources.push({
          sourcedId: resourceId,
          status: "active",
          title: unit.unitTest.id,
          vendorResourceId: `nice-academy-${unit.unitTest.id}`,
          vendorId: "superbuilders",
          applicationId: "nice",
          roles: ["primary"],
          importance: "primary",
          metadata: {
            type: "interactive",
            toolProvider: "Nice Academy",
            khanActivityType: "UnitTest",
            khanLessonType: "unittest",
            launchUrl: launch,
            url: launch,
            khanId: unit.unitTest.id,
            khanSlug: testSlug,
            khanTitle: unit.unitTest.id,
            xp: UNIT_TEST_XP
          }
        })

        payload.componentResources.push({
          sourcedId: `nice_${unit.unitTest.id}_${unit.unitTest.id}`,
          status: "active",
          title: unit.unitTest.id,
          courseComponent: { sourcedId: `nice_${unit.unitTest.id}`, type: "courseComponent" },
          resource: { sourcedId: resourceId, type: "resource" },
          sortOrder: 0
        })

        payload.assessmentLineItems.push({
          sourcedId: `${resourceId}_ali`,
          status: "active",
          title: unit.unitTest.id,
          componentResource: { sourcedId: `nice_${unit.unitTest.id}_${unit.unitTest.id}` },
          course: { sourcedId: courseSourcedId },
          metadata: { lessonType: "unittest", courseSourcedId }
        })

        totalXp += UNIT_TEST_XP
        totalLessons += 1
      }
    }
  }

  // Attach metrics
  const md = payload.course.metadata ?? {}
  md.metrics = { totalXp, totalLessons }
  payload.course.metadata = md

  // Write out files
  const courseDir = path.join(process.cwd(), "data", slug, "oneroster")
  const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
  if (mkdirResult.error) {
    logger.error("failed to create output directory", { dir: courseDir, error: mkdirResult.error })
    throw errors.wrap(mkdirResult.error, "mkdir output")
  }

  const files: Array<{ name: string; data: unknown }> = [
    { name: "course.json", data: payload.course },
    { name: "class.json", data: payload.class },
    { name: "courseComponents.json", data: payload.courseComponents },
    { name: "resources.json", data: payload.resources },
    { name: "componentResources.json", data: payload.componentResources },
    { name: "assessmentLineItems.json", data: payload.assessmentLineItems }
  ]

  for (const file of files) {
    const filePath = path.join(courseDir, file.name)
    const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(file.data, null, 2), "utf-8"))
    if (writeResult.error) {
      logger.error("failed to write output file", { file: filePath, error: writeResult.error })
      throw errors.wrap(writeResult.error, "write output file")
    }
    logger.info("wrote output file", { file: filePath })
  }

  logger.info("conversion complete", {
    slug,
    outDir: courseDir,
    counts: {
      courseComponents: payload.courseComponents.length,
      resources: payload.resources.length,
      componentResources: payload.componentResources.length,
      assessmentLineItems: payload.assessmentLineItems.length
    }
  })
}

const result = await errors.try(main())
if (result.error) {
  logger.error("fatal", { error: result.error })
  process.exit(1)
}
process.exit(0)


