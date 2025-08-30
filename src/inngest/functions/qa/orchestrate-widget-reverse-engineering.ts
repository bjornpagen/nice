import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { 
  niceQuestions, 
  niceArticles,
  niceExercises, 
  niceLessonContents, 
  niceLessons, 
  niceUnits, 
  niceCourses
} from "@/db/schemas/nice"
import { inngest } from "@/inngest/client"

// Input event schema for orchestration
const OrchestrationEventSchema = z.object({
  courseIds: z.array(z.string().min(1)).optional().describe("Specific course IDs to process"),
  subjects: z.array(z.enum(["science", "math", "history"])).optional().describe("Subject areas to process"),
  limit: z.number().positive().default(100).describe("Maximum number of SVGs to process"),
  generateValidation: z.boolean().default(true).describe("Whether to validate by regenerating widgets")
})

interface ExtractedSvg {
  questionId: string
  courseId: string
  courseTitle: string
  problemType: string
  svgContent: string
  svgIndex: number
  complexity: 'simple' | 'moderate' | 'complex'
}

export const orchestrateWidgetReverseEngineering = inngest.createFunction(
  {
    id: "orchestrate-widget-reverse-engineering",
    name: "Orchestrate Widget Reverse Engineering from Database SVGs",
    concurrency: { limit: 1 } // Only one orchestration at a time
  },
  { event: "qa/widget.orchestrate-reverse-engineering" },
  async ({ event, step, logger }) => {
    const parsed = OrchestrationEventSchema.safeParse(event.data)
    if (!parsed.success) {
      logger.error("invalid orchestration event data", { error: parsed.error })
      throw errors.wrap(parsed.error, "event data validation")
    }
    
    const { courseIds, subjects, limit, generateValidation } = parsed.data
    logger.info("starting widget reverse engineering orchestration", { 
      courseIds, 
      subjects, 
      limit,
      generateValidation
    })

    // Step 1: Extract SVGs from database
    const extractedSvgs = await step.run("extract-svgs-from-database", async (): Promise<ExtractedSvg[]> => {
      logger.debug("extracting SVGs from database", { courseIds, subjects })
      
      let whereConditions = [
        isNotNull(niceQuestions.xml),
        sql`${niceQuestions.xml} LIKE '%data:image/svg+xml;base64,%'`
      ]
      
      // Add course filter if specified
      if (courseIds && courseIds.length > 0) {
        whereConditions.push(inArray(niceCourses.id, courseIds))
      }
      
      // Add subject filter if specified (this is more complex, would need subject mapping)
      // For now, keep it simple with course IDs
      
      const questionsResult = await errors.try(
        db.select({
          questionId: niceQuestions.id,
          xml: niceQuestions.xml,
          problemType: niceQuestions.problemType,
          courseId: niceCourses.id,
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
        .where(and(...whereConditions))
        .limit(limit)
        .prepare("orchestrate_widget_reverse_engineering_extract_questions")
        .execute()
      )
      
      if (questionsResult.error) {
        logger.error("failed to extract questions with SVGs", { error: questionsResult.error })
        throw errors.wrap(questionsResult.error, "questions extraction")
      }
      
      const questions = questionsResult.data
      logger.debug("found questions with potential SVGs", { count: questions.length })
      
      const extractedSvgs: ExtractedSvg[] = []
      
      for (const question of questions) {
        if (!question.xml) continue
        
        try {
          // Extract all base64 SVGs from this question's XML
          const svgRegex = /<img[^>]+src="data:image\/svg\+xml;base64,([^"]+)"[^>]*>/g
          let match
          let svgIndex = 0
          
          while ((match = svgRegex.exec(question.xml)) !== null) {
            const base64Content = match[1]
            
            if (!base64Content) {
              logger.debug("empty base64 content in SVG match", { questionId: question.questionId })
              continue
            }
            
            try {
              const svgContent = Buffer.from(base64Content, 'base64').toString('utf-8')
              
              // Analyze SVG complexity
              const elementCount = (svgContent.match(/<\w+/g) || []).length
              const textCount = (svgContent.match(/<text/g) || []).length
              
              let complexity: 'simple' | 'moderate' | 'complex'
              if (elementCount < 10 && textCount < 3) {
                complexity = 'simple'
              } else if (elementCount < 50 && textCount < 10) {
                complexity = 'moderate'
              } else {
                complexity = 'complex'
              }
              
              extractedSvgs.push({
                questionId: question.questionId,
                courseId: question.courseId,
                courseTitle: question.courseTitle,
                problemType: question.problemType,
                svgContent,
                svgIndex,
                complexity
              })
              
              svgIndex++
              
            } catch (decodeError) {
              logger.debug("failed to decode base64 SVG", {
                questionId: question.questionId,
                error: String(decodeError)
              })
            }
          }
          
        } catch (error) {
          logger.debug("failed to process question XML", {
            questionId: question.questionId,
            error: String(error)
          })
        }
      }
      
      logger.debug("SVG extraction complete", {
        totalQuestions: questions.length,
        extractedSvgs: extractedSvgs.length
      })
      
      return extractedSvgs
    })

    if (extractedSvgs.length === 0) {
      logger.info("no SVGs found to process", { courseIds, subjects })
      return {
        status: "completed",
        message: "No SVGs found matching the criteria",
        processed: 0,
        successful: 0,
        failed: 0
      }
    }

    // Step 2: Dispatch reverse engineering events
    const dispatchResults = await step.run("dispatch-reverse-engineering-events", async () => {
      logger.debug("dispatching reverse engineering events", { svgCount: extractedSvgs.length })
      
      const events = extractedSvgs.map(svg => ({
        name: "qa/widget.reverse-engineer-from-svg" as const,
        data: {
          svgContent: svg.svgContent,
          sourceId: `${svg.questionId}-${svg.svgIndex}`,
          generateValidation
        }
      }))
      
      // Send in batches to avoid payload limits
      const BATCH_SIZE = 50
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
          totalDispatched,
          totalBatches: Math.ceil(events.length / BATCH_SIZE)
        })
      }
      
      logger.debug("all reverse engineering events dispatched", { totalDispatched })
      
      return {
        totalSvgs: extractedSvgs.length,
        eventsDispatched: totalDispatched,
        distribution: {
          byCourse: extractedSvgs.reduce((acc, svg) => {
            acc[svg.courseTitle] = (acc[svg.courseTitle] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          byComplexity: extractedSvgs.reduce((acc, svg) => {
            acc[svg.complexity] = (acc[svg.complexity] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          byProblemType: Object.fromEntries(
            Object.entries(extractedSvgs.reduce((acc, svg) => {
              acc[svg.problemType] = (acc[svg.problemType] || 0) + 1
              return acc
            }, {} as Record<string, number>))
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10) // Top 10 problem types
          )
        }
      }
    })

    // Step 3: Wait briefly then return summary
    const summary = await step.run("prepare-summary", async () => {
      const results = {
        status: "completed" as const,
        message: `Successfully dispatched ${dispatchResults.eventsDispatched} reverse engineering events`,
        processed: dispatchResults.totalSvgs,
        eventsDispatched: dispatchResults.eventsDispatched,
        distribution: dispatchResults.distribution,
        metadata: {
          courseIds,
          subjects,
          limit,
          generateValidation,
          processedAt: new Date().toISOString()
        }
      }
      
      logger.info("widget reverse engineering orchestration completed", {
        processed: results.processed,
        eventsDispatched: results.eventsDispatched,
        courseCount: Object.keys(dispatchResults.distribution.byCourse).length
      })
      
      return results
    })

    return summary
  }
)
