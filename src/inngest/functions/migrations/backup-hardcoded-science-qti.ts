import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { inngest } from "@/inngest/client"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"
import { qti } from "@/lib/clients"

export const backupHardcodedScienceQti = inngest.createFunction(
  { id: "backup-hardcoded-science-qti", name: "Backup QTI (Authoritative)" },
  { event: "migration/hardcoded.science.qti.backup" },
  async ({ logger }) => {
    // 1. Enumerate per-course identifiers
    logger.info("Starting authoritative QTI backup for hardcoded science courses.")
    const coursesResult = await errors.try(
      db.query.niceCourses.findMany({
        where: inArray(schema.niceCourses.id, [...HARDCODED_SCIENCE_COURSE_IDS]),
        columns: { id: true, slug: true }
      })
    )
    if (coursesResult.error) {
      logger.error("Failed to fetch science courses from DB.", { error: coursesResult.error })
      throw errors.wrap(coursesResult.error, "db fetch: courses")
    }
    const courses = coursesResult.data
    logger.info("Found courses to back up.", { count: courses.length })

    for (const course of courses) {
      logger.info("Processing course.", { courseSlug: course.slug, courseId: course.id })
      
      const unitIds = (await db.select({id: schema.niceUnits.id}).from(schema.niceUnits).where(eq(schema.niceUnits.courseId, course.id))).map(u => u.id)
      const lessonIds = (await db.select({id: schema.niceLessons.id}).from(schema.niceLessons).where(inArray(schema.niceLessons.unitId, unitIds))).map(l => l.id)
      const contentIds = (await db.select({contentId: schema.niceLessonContents.contentId}).from(schema.niceLessonContents).where(inArray(schema.niceLessonContents.lessonId, lessonIds))).map(c => c.contentId)

      const questionIds = (await db.select({id: schema.niceQuestions.id}).from(schema.niceQuestions).where(inArray(schema.niceQuestions.exerciseId, contentIds))).map(q => q.id)
      const articleIds = (await db.select({id: schema.niceArticles.id}).from(schema.niceArticles).where(inArray(schema.niceArticles.id, contentIds))).map(a => a.id)
      const assessmentIds = (await db.select({id: schema.niceAssessments.id}).from(schema.niceAssessments).where(inArray(schema.niceAssessments.parentId, unitIds))).map(a => a.id)
      
      logger.info("Enumerated identifiers for course.", { courseSlug: course.slug, questions: questionIds.length, articles: articleIds.length, assessments: assessmentIds.length })

      // 2. Fetch authoritative QTI content from the backend
      // Fetch Items (metadata required; hard fail if missing)
      const items: Array<{ xml: string; metadata: Record<string, unknown> }> = []
      for (const qid of questionIds) {
        const identifier = `nice_${qid}`
        const r = await errors.try(qti.getAssessmentItem(identifier))
        if (r.error) {
          logger.error("Failed to fetch assessment item from QTI backend.", { questionId: qid, identifier, error: r.error })
          throw errors.wrap(r.error, `qti.getAssessmentItem failed for ${identifier}`)
        }
        if (r.data.metadata === undefined) {
          logger.error("missing metadata for assessment item from qti backend", { questionId: qid, identifier })
          throw errors.new("qti backup: item metadata missing")
        }
        items.push({ xml: r.data.rawXml, metadata: r.data.metadata })
      }

      // Fetch Stimuli (metadata required; hard fail if missing)
      const stimuli: Array<{ xml: string; metadata: Record<string, unknown> }> = []
      for (const aid of articleIds) {
        const identifier = `nice_${aid}`
        const r = await errors.try(qti.getStimulus(identifier))
        if (r.error) {
          logger.error("Failed to fetch stimulus from QTI backend.", { articleId: aid, identifier, error: r.error })
          throw errors.wrap(r.error, `qti.getStimulus failed for ${identifier}`)
        }
        if (r.data.metadata === undefined) {
          logger.error("missing metadata for stimulus from qti backend", { articleId: aid, identifier })
          throw errors.new("qti backup: stimulus metadata missing")
        }
        stimuli.push({ xml: r.data.rawXml, metadata: r.data.metadata })
      }

      // Fetch Tests
      const tests: string[] = []
      for (const asmtId of assessmentIds) {
        const identifier = `nice_${asmtId}`
        const r = await errors.try(qti.getAssessmentTest(identifier))
        if (r.error) {
          logger.error("Failed to fetch assessment test from QTI backend.", { assessmentId: asmtId, identifier, error: r.error })
          throw errors.wrap(r.error, `qti.getAssessmentTest failed for ${identifier}`)
        }
        tests.push(r.data.rawXml)
      }
      
      logger.info("Successfully fetched all QTI entities from backend.", { courseSlug: course.slug })

      // 3. Persist payloads to disk
      const dir = path.join(process.cwd(), "data", course.slug, "qti")
      const mkdirResult = await errors.try(fs.mkdir(dir, { recursive: true }))
      if (mkdirResult.error) {
        logger.error("Failed to create backup directory.", { file: dir, error: mkdirResult.error })
        throw errors.wrap(mkdirResult.error, `mkdir ${dir}`)
      }
      
      const writeResult = await errors.try(
        Promise.all([
          fs.writeFile(path.join(dir, "assessmentItems.json"), JSON.stringify(items, null, 2)),
          fs.writeFile(path.join(dir, "assessmentStimuli.json"), JSON.stringify(stimuli, null, 2)),
          fs.writeFile(path.join(dir, "assessmentTests.json"), JSON.stringify(tests, null, 2))
        ])
      )
      if (writeResult.error) {
        logger.error("Failed to write backup files to disk.", { error: writeResult.error, dir })
        throw errors.wrap(writeResult.error, `file write in ${dir}`)
      }
      logger.info("Successfully wrote backup files.", { dir })
    }
    
    return { status: "complete", courseCount: courses.length }
  }
)
