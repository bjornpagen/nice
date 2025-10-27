#!/usr/bin/env bun
import * as path from "node:path"
import * as fs from "node:fs/promises"
import * as crypto from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { SUBJECT_SLUGS, isSubjectSlug } from "@/lib/constants/subjects"
import { escapeXmlAttribute, replaceRootAttributes } from "@/lib/xml-utils"

logger.setDefaultLogLevel(logger.DEBUG)

// Cartridge reader APIs are provided by the published package under /cartridge/* subpaths.
import { openCartridgeTarZst } from "@superbuilders/qti-assessment-item-generator/cartridge/readers/tarzst"
import {
  iterUnits,
  iterUnitLessons,
  iterLessonResources,
  readArticleContent,
  readQuestionXml,
  readIndex,
  readUnit
} from "@superbuilders/qti-assessment-item-generator/cartridge/client"
import type {
  IndexV1,
  Unit as CartUnit,
  Lesson as CartLesson,
  Resource
} from "@superbuilders/qti-assessment-item-generator/cartridge/types"

// Constants aligned with src/lib/payloads/oneroster/course.ts
const ORG_SOURCED_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
const ACADEMIC_SESSION_SOURCED_ID = "Academic_Year_2025-2026"
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

function normalizePathSlug(p: string): string {
  const seg = getLastPathSegment(p)
  return seg.endsWith(".json") ? seg.slice(0, -5) : seg
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex")
}

function hashId(_prefix: string, parts: string[]): string {
  // Always emit IDs starting with "nice_". The prefix argument is intentionally ignored
  // for the returned value, but included in the hash key for type separation.
  const key = parts.join("|")
  const hex = sha256Hex(key)
  return `nice_${hex.slice(0, 32)}`
}

// QTI identifiers (hyphen-free):
function qtiStimulusIdFromResource(resourceId: string): string {
  // For articles, stimulus identifier MUST equal the resource sourcedId
  return resourceId
}
function qtiItemIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string, questionNumber: number): string {
  return hashId("ni_", ["item", `kind=quiz`, `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`, `q=${String(questionNumber)}`])
}
function qtiItemIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string, questionNumber: number): string {
  return hashId("ni_", ["item", `kind=unittest`, `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`, `q=${String(questionNumber)}`])
}
function qtiTestIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("nt_", ["test", `kind=quiz`, `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function qtiTestIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("nt_", ["test", `kind=unittest`, `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}

// OneRoster sourcedIds (hyphen-free):
function orCourseId(courseSlug: string, courseId: string): string {
  return hashId("or_c_", ["course", `slug=${courseSlug}`, `id=${courseId}`])
}
function orClassId(courseSlug: string, courseId: string): string {
  return hashId("or_class_", ["class", `slug=${courseSlug}`, `id=${courseId}`])
}
function orCourseComponentIdForUnit(courseSlug: string, unitId: string): string {
  return hashId("or_cc_", ["component", "kind=unit", `c=${courseSlug}`, `u=${unitId}`])
}
function orCourseComponentIdForLesson(courseSlug: string, unitId: string, lessonId: string): string {
  return hashId("or_cc_", ["component", "kind=lesson", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`])
}
function orCourseComponentIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("or_cc_", ["component", "kind=unittest", `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}
function orResourceIdForArticle(courseSlug: string, unitId: string, lessonId: string, articleId: string): string {
  return hashId("or_r_", ["resource", "kind=article", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `a=${articleId}`])
}
function orResourceIdForVideo(courseSlug: string, unitId: string, lessonId: string, videoId: string): string {
  return hashId("or_r_", ["resource", "kind=video", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `v=${videoId}`])
}
function orResourceIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("or_r_", ["resource", "kind=exercise", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function orResourceIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("or_r_", ["resource", "kind=unittest", `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}
function orComponentResourceIdForArticle(courseSlug: string, unitId: string, lessonId: string, articleId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=article", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `a=${articleId}`])
}
function orComponentResourceIdForVideo(courseSlug: string, unitId: string, lessonId: string, videoId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=video", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `v=${videoId}`])
}
function orComponentResourceIdForQuiz(courseSlug: string, unitId: string, lessonId: string, quizId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=exercise", `c=${courseSlug}`, `u=${unitId}`, `l=${lessonId}`, `x=${quizId}`])
}
function orComponentResourceIdForUnitTest(courseSlug: string, unitId: string, unitTestId: string): string {
  return hashId("or_cr_", ["component-resource", "kind=unittest", `c=${courseSlug}`, `u=${unitId}`, `t=${unitTestId}`])
}
function orAssessmentLineItemIdFromResource(resourceId: string): string {
  // MUST match global expectation: line item ID = resourceId + "_ali"
  return `${resourceId}_ali`
}

function stripNicePrefix(id: string): string {
  return id.startsWith("nice_") ? id.slice(5) : id
}

function sanitizeIdPart(part: string): string {
  // Replace non-alphanumeric with underscores, collapse repeats, trim underscores
  let v = part.replace(/[^A-Za-z0-9_]/g, "_")
  v = v.replace(/_+/g, "_")
  v = v.replace(/^_+|_+$/g, "")
  // Ensure starts with letter or underscore
  if (!/^[A-Za-z_]/.test(v)) v = `n_${v}`
  return v || "n"
}

function buildId(...parts: string[]): string {
  const safe = parts.map((p) => sanitizeIdPart(p))
  return `nice_${safe.join("__")}`
}

function generateStimulusXml(stimulusId: string, title: string, htmlContent: string): string {
  const safeTitle = escapeXmlAttribute(title)
  const safeId = escapeXmlAttribute(stimulusId)
  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-stimulus xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="${safeId}" title="${safeTitle}">
  <qti-stimulus-body>
${htmlContent}
  </qti-stimulus-body>
</qti-assessment-stimulus>`
}

function generateTestXml(testId: string, title: string, itemIds: string[]): string {
  const safeTitle = escapeXmlAttribute(title)
  const safeTestId = escapeXmlAttribute(sanitizeIdPart(testId))
  const itemRefs = itemIds.map((qid, idx) => {
    const safeItemId = escapeXmlAttribute(sanitizeIdPart(qid))
    return `      <qti-assessment-item-ref identifier="${safeItemId}" href="/assessment-items/${safeItemId}" sequence="${idx + 1}"></qti-assessment-item-ref>`
  }).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-test xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd" identifier="${safeTestId}" title="${safeTitle}">
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-test-part identifier="PART_1" navigation-mode="nonlinear" submission-mode="individual">
    <qti-assessment-section identifier="SECTION_ALL" title="${safeTitle}" visible="false">
      <qti-ordering shuffle="false"/>
${itemRefs}
    </qti-assessment-section>
  </qti-test-part>
</qti-assessment-test>`
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
  const subjectSlugArg = getFlag("subject-slug")
  const quizXpRaw = getFlag("quiz-xp")
  const unitTestXpRaw = getFlag("unit-test-xp")
  // No flags for QTI; both OneRoster and QTI are always emitted

  if (!input || !slug || !courseId || !gradesRaw || !subjectSlugArg || !quizXpRaw || !unitTestXpRaw) {
    process.stderr.write(
      "Usage: convert-cartridge-to-oneroster --input /abs/file.tar.zst --slug <course-slug> --course-id <id> --grades <n[,n,...]> --subject-slug <slug> --quiz-xp <int> --unit-test-xp <int>\n"
    )
    process.exit(1)
  }

  if (!isSubjectSlug(subjectSlugArg)) {
    logger.error("invalid subject slug", { subjectSlug: subjectSlugArg, allowed: SUBJECT_SLUGS })
    throw errors.new(`subject slug must be one of: ${SUBJECT_SLUGS.join(", ")}`)
  }
  const subjectSlug = subjectSlugArg

  const grades = gradesRaw.split(",").map((g) => Number(g.trim()))
  if (grades.some((n) => !Number.isInteger(n) || n < 0 || n > 12)) {
    logger.error("invalid grades", { gradesRaw })
    throw errors.new("grades: must be integers between 0 and 12")
  }

  const quizXp = Number(quizXpRaw)
  if (!Number.isFinite(quizXp) || !Number.isInteger(quizXp) || quizXp <= 0) {
    logger.error("invalid quiz xp", { quizXpRaw })
    throw errors.new("quiz xp: must be a positive integer")
  }

  const unitTestXp = Number(unitTestXpRaw)
  if (!Number.isFinite(unitTestXp) || !Number.isInteger(unitTestXp) || unitTestXp <= 0) {
    logger.error("invalid unit test xp", { unitTestXpRaw })
    throw errors.new("unit test xp: must be a positive integer")
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN
  if (!appDomain || typeof appDomain !== "string") {
    logger.error("CRITICAL: NEXT_PUBLIC_APP_DOMAIN missing or invalid", { NEXT_PUBLIC_APP_DOMAIN: appDomain })
    throw errors.new("configuration: NEXT_PUBLIC_APP_DOMAIN is required")
  }
  const baseDomain = appDomain.replace(/\/$/, "")

  logger.info("qti generation enabled by default")

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

  const courseSourcedId = orCourseId(slug, courseId)
  const classSourcedId = orClassId(slug, courseId)
  const subjectList = mapSubjectToOneRosterSubjects(indexJson.course.subject)

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
        khanSubjectSlug: subjectSlug,
        khanTitle: indexJson.course.title,
        khanDescription: "",
        AlphaLearn: {
          publishStatus: "active"
        }
      }
    },
    class: {
      sourcedId: classSourcedId,
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

  // QTI generation tracking (always populated)
  type QtiStimulus = { xml: string; metadata?: Record<string, unknown> }
  type QtiItem = { xml: string; metadata?: Record<string, unknown> }
  const qtiStimuli: QtiStimulus[] = []
  const qtiItems: QtiItem[] = []
  const qtiTestsXml: string[] = []
  const exerciseToItemIds = new Map<string, string[]>() // map exercise id -> question ids for test assembly

  const debugBaseDir = path.join(process.cwd(), "data", slug, "qti", "debug")
  const ensureDir = async (dir: string) => {
    const mkdirRes = await errors.try(fs.mkdir(dir, { recursive: true }))
    if (mkdirRes.error) {
      logger.error("debug dir mkdir failed", { dir, error: mkdirRes.error })
    }
  }

  for await (const unit of iterUnits(reader) as AsyncIterable<CartUnit>) {
    if (!unit.title || typeof unit.unitNumber !== "number") {
      logger.error("unit missing title or unitNumber", { unit })
      throw errors.new("unit: missing required fields")
    }
    const unitEntryFromIndex = indexJson.units.find((u) => u.id === unit.id)
    const unitSlug = getLastPathSegment(unitEntryFromIndex?.path ?? unit.id)
    const unitComponentId = orCourseComponentIdForUnit(slug, unit.id)

    payload.courseComponents.push({
      sourcedId: unitComponentId,
      status: "active",
      title: unit.title,
      course: { sourcedId: courseSourcedId, type: "course" },
      sortOrder: unit.unitNumber,
      metadata: { khanId: unit.id, khanSlug: normalizePathSlug(unitSlug), khanTitle: unit.title }
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
    let passiveResourcesForNextExercise: string[] = []
    for (const lesson of lessons) {
      if (!lesson.title || typeof lesson.lessonNumber !== "number") {
        logger.error("lesson missing title or lessonNumber", { lesson })
        throw errors.new("lesson: missing required fields")
      }
      const unitEntry = indexJson.units.find((u) => u.id === unit.id)
      const unitSlugNorm = normalizePathSlug(unitEntry?.path ?? unit.id)
      const lessonPath = lessonIdToPath.get(lesson.id)
      if (!lessonPath) {
        logger.error("lesson path not found in unit json", { unitId: unit.id, lessonId: lesson.id })
        throw errors.new("lesson path: not found")
      }
      const lessonSlug = normalizePathSlug(lessonPath)

      const lessonComponentId = orCourseComponentIdForLesson(slug, unit.id, lesson.id)
      payload.courseComponents.push({
        sourcedId: lessonComponentId,
        status: "active",
        title: lesson.title,
        course: { sourcedId: courseSourcedId, type: "course" },
        parent: { sourcedId: unitComponentId, type: "courseComponent" },
        sortOrder: lesson.lessonNumber,
        metadata: { khanId: lesson.id, khanSlug: lessonSlug, khanTitle: lesson.title }
      })

      let resourceIndex = 0
      for await (const res of iterLessonResources(reader, lesson) as AsyncIterable<Resource>) {
        resourceIndex++
        if (res.type === "article") {
          const articleTitle = res.title
          if (!articleTitle || articleTitle.trim() === "") {
            logger.error("article missing title", { resourceId: res.id, lessonId: lesson.id, unitId: unit.id })
            throw errors.new("article: missing title")
          }
          const htmlResult = await errors.try(readArticleContent(reader, res.path))
          if (htmlResult.error) {
            logger.error("failed to read article stimulus", { path: res.path, error: htmlResult.error })
            throw errors.wrap(htmlResult.error, "read article")
          }
          const xp = await computeArticleXpFromHtml(htmlResult.data)
          const articleSlug = getLastPathSegment(path.dirname(res.path))
          const launch = `${baseDomain}/${subjectSlug}/${slug}/${unitSlugNorm}/${lessonSlug}/a/${articleSlug}`
          const resourceId = orResourceIdForArticle(slug, unit.id, lesson.id, res.id)
          if (resourceSeen.has(resourceId)) {
            logger.error("duplicate resource id", { id: res.id })
            throw errors.new("resource id collision")
          }
          resourceSeen.add(resourceId)

          payload.resources.push({
            sourcedId: resourceId,
            status: "active",
            title: articleTitle,
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
              khanTitle: articleTitle,
              qtiStimulusIdentifier: undefined,
              xp
            }
          })

          if (xp > 0) {
            passiveResourcesForNextExercise.push(resourceId)
          }

          const compResId = orComponentResourceIdForArticle(slug, unit.id, lesson.id, res.id)
          payload.componentResources.push({
            sourcedId: compResId,
            status: "active",
            title: formatResourceTitleForDisplay(articleTitle, "Article"),
            courseComponent: { sourcedId: lessonComponentId, type: "courseComponent" },
            resource: { sourcedId: resourceId, type: "resource" },
            sortOrder: resourceIndex
          })

          payload.assessmentLineItems.push({
            sourcedId: orAssessmentLineItemIdFromResource(resourceId),
            status: "active",
            title: `Progress for: ${articleTitle}`,
            componentResource: { sourcedId: compResId },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "article", courseSourcedId }
          })

          // Generate QTI stimulus for article: identifier MUST equal resource sourcedId
          const stimId = qtiStimulusIdFromResource(resourceId)
          const stimulusXml = generateStimulusXml(stimId, articleTitle, htmlResult.data)
          qtiStimuli.push({
            xml: stimulusXml,
            metadata: {
              khanId: res.id,
              khanSlug: articleSlug,
              lessonId: lesson.id,
              unitId: unit.id,
              khanTitle: articleTitle
            }
          })
          logger.debug("generated qti stimulus for article", { articleId: res.id, lessonId: lesson.id })

          totalXp += xp
          totalLessons += 1
        // } else if (res.type === "video") {
        //   // Video handling temporarily disabled - readVideoMetadata not available in current package version
        //   const videoTitle = res.title
        //   if (!videoTitle || videoTitle.trim() === "") {
        //     logger.error("video missing title", { resourceId: res.id, lessonId: lesson.id, unitId: unit.id })
        //     throw errors.new("video: missing title")
        //   }
        //   logger.warn("skipping video resource - video handling not implemented", { 
        //     videoId: res.id, 
        //     lessonId: lesson.id, 
        //     unitId: unit.id 
        //   })
        } else if (res.type === "quiz") {
          const quizTitle = res.title
          if (!quizTitle || quizTitle.trim() === "") {
            logger.error("quiz missing title", { resourceId: res.id, lessonId: lesson.id, unitId: unit.id })
            throw errors.new("quiz: missing title")
          }
          const quizSlug = getLastPathSegment(res.path)
          const launch = `${baseDomain}/${subjectSlug}/${slug}/${unitSlugNorm}/${lessonSlug}/e/${quizSlug}`
          const resourceId = orResourceIdForQuiz(slug, unit.id, lesson.id, res.id)
          if (resourceSeen.has(resourceId)) {
            logger.error("duplicate resource id", { id: res.id })
            throw errors.new("resource id collision")
          }
          resourceSeen.add(resourceId)

          const nicePassiveResources = passiveResourcesForNextExercise.slice()
          payload.resources.push({
            sourcedId: resourceId,
            status: "active",
            title: quizTitle,
            vendorResourceId: `nice-academy-${res.id}`,
            vendorId: "superbuilders",
            applicationId: "nice",
            roles: ["primary"],
            importance: "primary",
            metadata: {
              type: "interactive",
              toolProvider: "Nice Academy",
              khanActivityType: "Exercise",
              launchUrl: launch,
              url: launch,
              khanId: res.id,
              khanSlug: quizSlug,
              khanTitle: quizTitle,
              xp: quizXp,
              passiveResources: null,
              nice_passiveResources: nicePassiveResources
            }
          })

          const compResIdQ = orComponentResourceIdForQuiz(slug, unit.id, lesson.id, res.id)
          payload.componentResources.push({
            sourcedId: compResIdQ,
            status: "active",
            title: formatResourceTitleForDisplay(quizTitle, "Exercise"),
            courseComponent: { sourcedId: lessonComponentId, type: "courseComponent" },
            resource: { sourcedId: resourceId, type: "resource" },
            sortOrder: resourceIndex
          })

          payload.assessmentLineItems.push({
            sourcedId: orAssessmentLineItemIdFromResource(resourceId),
            status: "active",
            title: quizTitle,
            componentResource: { sourcedId: compResIdQ },
            course: { sourcedId: courseSourcedId },
            metadata: { lessonType: "exercise", courseSourcedId }
          })

          passiveResourcesForNextExercise = []

          // Generate QTI items and test for quiz
          {
            if (!res.questions || res.questions.length === 0) {
              logger.error("quiz has no questions", { quizId: res.id, path: res.path })
              throw errors.new("quiz: no questions available")
            }
            const questionIds: string[] = []
            for (const q of res.questions) {
              // Load actual XML from cartridge if q.xml is a path
              const originalXml = q.xml?.trim() && q.xml.includes("<") ? q.xml : await readQuestionXml(reader, q.xml || "")
              if (!originalXml || originalXml === "") {
                logger.error("question xml empty after read", { quizId: res.id, questionNumber: q.number, xmlPath: q.xml })
                throw errors.new("question: xml is required")
              }
            // Debug: write and log exact original XML from cartridge
            const quizDebugDir = path.join(debugBaseDir, "quizzes", res.id)
            await ensureDir(quizDebugDir)
            const originalQuizItemPath = path.join(quizDebugDir, `question-${String(q.number).padStart(2, "0")}.original.xml`)
            const writeOrigQuizRes = await errors.try(fs.writeFile(originalQuizItemPath, originalXml, "utf-8"))
            if (writeOrigQuizRes.error) {
              logger.error("debug write failed (quiz original)", { file: originalQuizItemPath, error: writeOrigQuizRes.error })
            }
              logger.debug("quiz question xml (original)", {
                quizId: res.id,
                questionNumber: q.number,
                xml: originalXml
              })
              // Always rewrite identifier to our stable scheme: nice_<quizId>_<questionNumber>
              const newItemId = qtiItemIdForQuiz(slug, unit.id, lesson.id, res.id, q.number)
            const rewriteRes = errors.trySync(() => replaceRootAttributes(originalXml, "qti-assessment-item", newItemId, quizTitle))
            if (rewriteRes.error) {
              logger.error("identifier rewrite failed (quiz)", { quizId: res.id, questionNumber: q.number, error: rewriteRes.error })
              // keep original file already written; bail out fast
              throw rewriteRes.error
            }
            const rewrittenXml = rewriteRes.data
              // Debug: log the rewritten XML
              logger.debug("quiz question xml (rewritten)", {
                quizId: res.id,
                questionNumber: q.number,
                identifier: newItemId,
                xml: rewrittenXml
              })
            const rewrittenQuizItemPath = path.join(quizDebugDir, `question-${String(q.number).padStart(2, "0")}.rewritten.xml`)
            const writeRewQuizRes = await errors.try(fs.writeFile(rewrittenQuizItemPath, rewrittenXml, "utf-8"))
            if (writeRewQuizRes.error) {
              logger.error("debug write failed (quiz rewritten)", { file: rewrittenQuizItemPath, error: writeRewQuizRes.error })
            }
              questionIds.push(newItemId)
              qtiItems.push({
                xml: rewrittenXml,
                metadata: {
                  khanId: newItemId,
                  khanExerciseId: stripNicePrefix(resourceId),
                  khanExerciseSlug: quizSlug,
                  khanExerciseTitle: quizTitle
                }
              })
            }
            // Generate test for this quiz
            // IMPORTANT: Set test identifier equal to the resource sourcedId so providers can map directly
            const quizTestId = resourceId
            const quizTestXml = generateTestXml(quizTestId, quizTitle, questionIds)
            // Debug: log the generated test XML
            logger.debug("quiz test xml", { quizId: res.id, xml: quizTestXml })
            const quizTestPath = path.join(path.join(debugBaseDir, "quizzes", res.id), `test.xml`)
            const writeQuizTestRes = await errors.try(fs.writeFile(quizTestPath, quizTestXml, "utf-8"))
            if (writeQuizTestRes.error) {
              logger.error("debug write failed (quiz test)", { file: quizTestPath, error: writeQuizTestRes.error })
            }
            qtiTestsXml.push(quizTestXml)
            exerciseToItemIds.set(res.id, questionIds)
            logger.debug("generated qti items and test for quiz", { quizId: res.id, itemCount: questionIds.length })
          }

          totalXp += quizXp
          totalLessons += 1
        }
      }
    }

    // Unit test (optional) - process once per unit, OUTSIDE lesson loop
    if (unit.unitTest) {
      const unitTest = unit.unitTest
      const unitTestTitle = unitTest.title
      if (!unitTestTitle || unitTestTitle.trim() === "") {
        logger.error("unit test missing title", { unitTestId: unitTest.id, unitId: unit.id })
        throw errors.new("unit test: missing title")
      }
      const unitEntry = indexJson.units.find((u) => u.id === unit.id)
      const unitSlug = normalizePathSlug(unitEntry?.path ?? unit.id)
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
      const lastLessonSlug = normalizePathSlug(lastLessonPath)
      const testSlug = getLastPathSegment(unitTest.path)

      const unitTestComponentId = orCourseComponentIdForUnitTest(slug, unit.id, unitTest.id)
      payload.courseComponents.push({
        sourcedId: unitTestComponentId,
        status: "active",
        title: unitTestTitle,
        course: { sourcedId: courseSourcedId, type: "course" },
        parent: { sourcedId: unitComponentId, type: "courseComponent" },
        sortOrder: lastLesson.lessonNumber + 1,
        metadata: { khanId: unitTest.id, khanSlug: testSlug, khanTitle: unitTestTitle }
      })

      const launch = `${baseDomain}/${subjectSlug}/${slug}/${unitSlug}/${lastLessonSlug}/test/${testSlug}`
      const resourceId = orResourceIdForUnitTest(slug, unit.id, unitTest.id)
      if (resourceSeen.has(resourceId)) {
        logger.error("duplicate resource id", { id: unitTest.id })
        throw errors.new("resource id collision")
      }
      resourceSeen.add(resourceId)

      payload.resources.push({
        sourcedId: resourceId,
        status: "active",
        title: unitTestTitle,
        vendorResourceId: `nice-academy-${unitTest.id}`,
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
          khanId: unitTest.id,
          khanSlug: testSlug,
          khanTitle: unitTestTitle,
          xp: unitTestXp
        }
      })

      const compResIdUT = orComponentResourceIdForUnitTest(slug, unit.id, unitTest.id)
      payload.componentResources.push({
        sourcedId: compResIdUT,
        status: "active",
        title: unitTestTitle,
        courseComponent: { sourcedId: unitTestComponentId, type: "courseComponent" },
        resource: { sourcedId: resourceId, type: "resource" },
        sortOrder: 0
      })

      payload.assessmentLineItems.push({
        sourcedId: orAssessmentLineItemIdFromResource(resourceId),
        status: "active",
        title: unitTestTitle,
        componentResource: { sourcedId: compResIdUT },
        course: { sourcedId: courseSourcedId },
        metadata: { lessonType: "unittest", courseSourcedId }
      })

      // Generate QTI items and test for unit test
      if (!unitTest.questions || unitTest.questions.length === 0) {
        logger.error("unit test has no questions", { unitTestId: unitTest.id, unitId: unit.id })
        throw errors.new("unit test: no questions available")
      }
      const questionIds: string[] = []
      for (const q of unitTest.questions) {
        const originalXml = q.xml?.trim() && q.xml.includes("<") ? q.xml : await readQuestionXml(reader, q.xml)
        if (!originalXml || originalXml === "") {
          logger.error("unit test question xml empty after read", { unitTestId: unitTest.id, questionNumber: q.number, xmlPath: q.xml })
          throw errors.new("unit test question: xml is required")
        }
        // Debug: write and log exact original XML from cartridge for unit test
        const unitTestDebugDir = path.join(debugBaseDir, "unit-tests", unitTest.id)
        await ensureDir(unitTestDebugDir)
        const originalUnitTestItemPath = path.join(unitTestDebugDir, `question-${String(q.number).padStart(2, "0")}.original.xml`)
        const writeOrigUtRes = await errors.try(fs.writeFile(originalUnitTestItemPath, originalXml, "utf-8"))
        if (writeOrigUtRes.error) {
          logger.error("debug write failed (unit test original)", { file: originalUnitTestItemPath, error: writeOrigUtRes.error })
        }
        logger.debug("unit test question xml (original)", {
          unitTestId: unitTest.id,
          questionNumber: q.number,
          xml: originalXml
        })
        // Always rewrite identifier to our stable scheme: nice_<unitTestId>_<questionNumber>
        const newItemId = qtiItemIdForUnitTest(slug, unit.id, unitTest.id, q.number)
        const rewriteUtRes = errors.trySync(() => replaceRootAttributes(originalXml, "qti-assessment-item", newItemId, unitTestTitle))
        if (rewriteUtRes.error) {
          logger.error("identifier rewrite failed (unit test)", { unitTestId: unitTest.id, questionNumber: q.number, error: rewriteUtRes.error })
          throw rewriteUtRes.error
        }
        const rewrittenXml = rewriteUtRes.data
        // Debug: log rewritten unit test question XML
        logger.debug("unit test question xml (rewritten)", {
          unitTestId: unitTest.id,
          questionNumber: q.number,
          identifier: newItemId,
          xml: rewrittenXml
        })
        const rewrittenUnitTestItemPath = path.join(unitTestDebugDir, `question-${String(q.number).padStart(2, "0")}.rewritten.xml`)
        const writeRewUtRes = await errors.try(fs.writeFile(rewrittenUnitTestItemPath, rewrittenXml, "utf-8"))
        if (writeRewUtRes.error) {
          logger.error("debug write failed (unit test rewritten)", { file: rewrittenUnitTestItemPath, error: writeRewUtRes.error })
        }
        questionIds.push(newItemId)
        qtiItems.push({
          xml: rewrittenXml,
          metadata: {
            khanId: newItemId,
            khanExerciseId: stripNicePrefix(resourceId),
            khanExerciseSlug: testSlug,
            khanExerciseTitle: unitTestTitle
          }
        })
      }
      // Generate test for this unit test
      const utId = unitTest.id
      // IMPORTANT: Set test identifier equal to the resource sourcedId
      const unitTestAssessmentId = resourceId
      const unitTestXml = generateTestXml(unitTestAssessmentId, unitTestTitle, questionIds)
      // Debug: log the generated unit test XML
      logger.debug("unit test xml", { unitTestId: utId, xml: unitTestXml })
      const unitTestPath = path.join(path.join(debugBaseDir, "unit-tests", utId), `test.xml`)
      const writeUtTestRes = await errors.try(fs.writeFile(unitTestPath, unitTestXml, "utf-8"))
      if (writeUtTestRes.error) {
        logger.error("debug write failed (unit test test)", { file: unitTestPath, error: writeUtTestRes.error })
      }
      qtiTestsXml.push(unitTestXml)
      logger.debug("generated qti items and test for unit test", { unitTestId: utId, itemCount: questionIds.length })

      totalXp += unitTestXp
      totalLessons += 1
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

  logger.info("oneroster conversion complete", {
    slug,
    outDir: courseDir,
    counts: {
      courseComponents: payload.courseComponents.length,
      resources: payload.resources.length,
      componentResources: payload.componentResources.length,
      assessmentLineItems: payload.assessmentLineItems.length
    }
  })

  // Write QTI files (always emitted)
    logger.info("writing qti payloads", {
      stimuliCount: qtiStimuli.length,
      itemsCount: qtiItems.length,
      testsCount: qtiTestsXml.length
    })

    const qtiDir = path.join(process.cwd(), "data", slug, "qti")
    const qtiMkdirResult = await errors.try(fs.mkdir(qtiDir, { recursive: true }))
    if (qtiMkdirResult.error) {
      logger.error("failed to create qti output directory", { dir: qtiDir, error: qtiMkdirResult.error })
      throw errors.wrap(qtiMkdirResult.error, "mkdir qti output")
    }

    const qtiFiles: Array<{ name: string; data: unknown }> = [
      { name: "assessmentStimuli.json", data: qtiStimuli },
      { name: "assessmentItems.json", data: qtiItems },
      { name: "assessmentTests.json", data: qtiTestsXml }
    ]

    for (const file of qtiFiles) {
      const filePath = path.join(qtiDir, file.name)
      const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(file.data, null, 2), "utf-8"))
      if (writeResult.error) {
        logger.error("failed to write qti output file", { file: filePath, error: writeResult.error })
        throw errors.wrap(writeResult.error, "write qti output file")
      }
      logger.info("wrote qti output file", { file: filePath })
    }

  logger.info("qti conversion complete", {
    slug,
    qtiDir,
    counts: {
      stimuli: qtiStimuli.length,
      items: qtiItems.length,
      tests: qtiTestsXml.length
    }
  })
}

const result = await errors.try(main())
if (result.error) {
  logger.error("fatal", { error: result.error })
  process.exit(1)
}
process.exit(0)
