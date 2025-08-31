import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { 
  niceQuestions, 
  niceExercises, 
  niceLessonContents, 
  niceLessons, 
  niceUnits, 
  niceCourses
} from "@/db/schemas/nice"
import { inngest } from "@/inngest/client"

const ExtractEventSchema = z.object({
  courseIds: z.array(z.string().min(1)),
  limit: z.number().positive().default(100)
})

export const extractAndProcessQtiSvgs = inngest.createFunction(
  {
    id: "extract-and-process-qti-svgs",
    name: "Extract SVGs from QTI and Process with AI",
    concurrency: { limit: 1 }
  },
  { event: "qa/qti.extract-and-process-svgs" },
  async ({ event, step, logger }) => {
    const parsed = ExtractEventSchema.safeParse(event.data)
    if (!parsed.success) {
      logger.error("invalid event data", { error: parsed.error })
      throw errors.wrap(parsed.error, "event validation")
    }
    
    const { courseIds, limit } = parsed.data
    logger.info("starting qti svg extraction", { courseIds, limit })

    // Extract questions with SVGs (outside step.run per project rules)
    const questionsResult = await errors.try(
      db.select({
        questionId: niceQuestions.id,
        xml: niceQuestions.xml,
        problemType: niceQuestions.problemType,
        courseTitle: niceCourses.title
      })
      .from(niceQuestions)
      .innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
      .innerJoin(niceLessonContents, and(
        eq(niceLessonContents.contentId, niceExercises.id),
        eq(niceLessonContents.contentType, "Exercise")
      ))
      .innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
      .innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
      .innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
      .where(and(
        inArray(niceCourses.id, courseIds),
        isNotNull(niceQuestions.xml),
        sql`${niceQuestions.xml} LIKE '%data:image/svg+xml;base64,%'`
      ))
      .limit(limit)
      .prepare("extract_and_process_qti_svgs")
      .execute()
    )
    
    if (questionsResult.error) {
      logger.error("failed to extract questions with svgs", { error: questionsResult.error })
      throw errors.wrap(questionsResult.error, "questions extraction")
    }
    
    const questions = questionsResult.data
    logger.info("found questions with svg content", { count: questions.length })

    if (questions.length === 0) {
      return {
        status: "completed",
        message: "No SVGs found in specified courses",
        processed: 0,
        dispatched: 0
      }
    }

    // Step 1: Extract and dispatch SVG processing events
    const dispatchResults = await step.run("extract-and-dispatch-svgs", async () => {
      const events: Array<{
        name: "qa/svg.reverse-engineer-to-widget"
        data: {
          svgBase64: string
          sourceId: string
          expectedWidgetType?: string
        }
      }> = []
      
      for (const question of questions) {
        if (!question.xml) continue
        
        const svgRegex = /<img[^>]+src="data:image\/svg\+xml;base64,([^"]+)"[^>]*>/g
        let match
        let svgIndex = 0
        
        while ((match = svgRegex.exec(question.xml)) !== null) {
          const base64Content = match[1]
          if (base64Content) {
            events.push({
              name: "qa/svg.reverse-engineer-to-widget",
              data: {
                svgBase64: base64Content,
                sourceId: `${question.questionId}-${svgIndex}`,
                expectedWidgetType: undefined
              }
            })
            svgIndex++
          }
        }
      }
      
      logger.debug("extracted svgs from qti", { totalEvents: events.length })
      
      // Send events in batches to avoid payload limits
      const BATCH_SIZE = 20
      let totalDispatched = 0
      
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE)
        
        const sendResult = await errors.try(inngest.send(batch))
        if (sendResult.error) {
          logger.error("failed to send event batch", { 
            batchStart: i,
            batchSize: batch.length,
            error: sendResult.error 
          })
          throw errors.wrap(sendResult.error, "event batch send")
        }
        
        totalDispatched += batch.length
        logger.debug("sent event batch", { 
          batchStart: i,
          batchSize: batch.length,
          totalDispatched
        })
      }
      
      return {
        totalSvgs: events.length,
        eventsDispatched: totalDispatched,
        batchesSent: Math.ceil(events.length / BATCH_SIZE)
      }
    })

    logger.info("svg extraction and dispatch completed", {
      totalSvgs: dispatchResults.totalSvgs,
      eventsDispatched: dispatchResults.eventsDispatched,
      batchesSent: dispatchResults.batchesSent
    })

    return {
      status: "completed",
      processed: dispatchResults.totalSvgs,
      dispatched: dispatchResults.eventsDispatched,
      courseIds,
      summary: {
        questionsWithSvgs: questions.length,
        totalSvgsExtracted: dispatchResults.totalSvgs,
        batchesSent: dispatchResults.batchesSent
      }
    }
  }
)
