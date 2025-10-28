import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { AiGenerateCourseInputSchema, type AiGenerateCourseInput, type Subject } from "@/lib/course-builder-api/schema"

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

/**
 * Context Engineering Components (from context-engineering.md Category 28):
 * 1. System Prompt - Define role and capabilities
 * 2. User Prompt - Specific task request
 * 3. State/History - Previous context
 * 4. Long-term Memory - Domain knowledge
 * 5. Retrieved Information - Resources/assessments
 * 6. Available Tools - What AI can use
 * 7. Structured Output - Zod schema
 */

// System prompt following best practices from Categories 1, 8, 11
const SYSTEM_PROMPT = `You are an expert educational curriculum designer specializing in K-12 course creation.

<role>
You are tasked with creating comprehensive, standards-aligned courses based on CASE learning objectives and existing educational resources.
</role>

<capabilities>
- Analyze CASE standards (Common Core, state standards) to ensure proper alignment
- Organize educational resources into logical learning progressions
- Create engaging unit and lesson structures
- Apply pedagogical best practices for content sequencing
- Map resources to specific learning objectives
</capabilities>

<constraints>
-- You MUST only use resource IDs from the provided <available_resources> list.
-- DO NOT invent or hallucinate any resource IDs. If an idea requires a resource that is not listed, skip it.
-- Each unit must have a unique title (case-insensitive)
-- Each lesson within a unit must have a unique title (case-insensitive)
-- Every lesson must contain at least one resource
-- Every unit must contain at least one lesson
-- Course grades must match the user's actual grade levels
-- DO NOT assign XP values - these are predetermined by the system
-- HARD CONSTRAINT: Each resource ID may appear AT MOST ONCE in the entire course. Never reuse a resource ID across different lessons or units.
-- HARD CONSTRAINT: Within a single lesson, resource titles MUST be unique per type. Do not include two resources with the same title and type in the same lesson (e.g., two Exercises titled "Apply: cell parts and functions"). When multiple similar options exist, select the single best-aligned resource.
-- HARD CONSTRAINT: Do NOT include grade level text (e.g., "Grade 7", "7th grade", "Grades 6-8") in ANY titles or descriptions (course or units). Grades are for alignment only; they are not presented in names or descriptions.
-- HARD CONSTRAINT: For every referenced resource, its <id> MUST match exactly one <id> in <available_resources>. Never output an id that is not present there.
</constraints>

<pedagogical_principles>
- Follow the optimal learning sequence: Video → Article → Exercise
- Videos introduce concepts with visual learning
- Articles provide detailed explanations and context
- Exercises reinforce learning through practice
- EVERY lesson MUST end with at least one relevant exercise
- When multiple resources map to the same objective and labels like "Understand/Apply" are absent, STILL apply sequencing. Include as many well-aligned resources as useful and order them in repeating blocks: [supporting Videos] → [supporting Articles] → [Exercise(s) that assess that objective]. Repeat for subsequent objectives if more relevant resources remain.
- If both exercise levels exist for the same objective (e.g., "Understand" and "Apply"), prefer including BOTH with "Understand" BEFORE "Apply". When only one level exists, include that single best-aligned exercise.
- Group related standards into coherent conceptual units
- Progress from foundational to advanced concepts within units
</pedagogical_principles>

<output_format>
You will generate a structured course plan in JSON format matching the provided schema.
Focus on creating a logical learning progression that builds knowledge systematically.
The XP values in resources are for reference only - use them as provided, do not modify.
Provide a concise description (<= 3 sentences) for each unit summarizing its focus.
</output_format>`

// Build user prompt with XML tags (Categories 1, 10)
function buildUserPrompt(params: {
  subject: Subject
  caseDetails: Array<{ id: string; humanCodingScheme: string; fullStatement: string }>
  resources: Array<{ sourcedId: string; title: string; metadata: any }>
  enrichedContent: {
    stimuli: Array<{ id: string; title: string; rawXml: string }>
    tests: Array<{ id: string; title: string; rawXml: string }>
  }
  userGrades: string[]
}): string {
  return `Create a comprehensive ${params.subject} course for grades ${params.userGrades.join(", ")}.

<learning_standards>
${params.caseDetails.map(c => `
  <standard id="${c.id}">
    <code>${c.humanCodingScheme}</code>
    <description>${c.fullStatement}</description>
  </standard>
`).join("")}
</learning_standards>

<available_resources count="${params.resources.length}">
${params.resources.map(r => {
  const activityType = r.metadata?.khanActivityType || "Unknown"
  const caseIds = r.metadata?.learningObjectiveSet
    ?.filter((lo: any) => lo.source === "CASE")
    ?.flatMap((lo: any) => lo.learningObjectiveIds) || []
  const xp = r.metadata?.xp || 0

  return `
  <resource>
    <id>${r.sourcedId}</id>
    <title>${r.title}</title>
    <type>${activityType}</type>
    <xp>${xp}</xp>
    <aligned_standards>${caseIds.join(", ")}</aligned_standards>
  </resource>`
}).join("")}
</available_resources>

<article_content>
${params.enrichedContent.stimuli.slice(0, 10).map(s => `
  <article resource_id="${s.id}">
    <title>${s.title}</title>
    <content>
${s.rawXml}
    </content>
  </article>
`).join("")}
</article_content>

<exercise_summaries count="${params.enrichedContent.tests.length}">
${params.enrichedContent.tests.slice(0, 40).map(t => `
  <exercise resource_id="${t.id}" title="${t.title}" />
`).join("")}
</exercise_summaries>

<instructions>
1. Analyze the learning standards to identify key concepts and skills
2. Group related standards into coherent units
3. Within each unit, create lessons following pedagogical best practices:
   - Start with a video when available (conceptual introduction)
   - Follow with articles for detailed explanation
   - Sort resources into repeating blocks by objective: all supporting Videos first, then supporting Articles, then Exercise(s) that assess that objective. Repeat blocks as needed until resources are exhausted.
   - ALWAYS end the lesson with at least one Exercise for assessment.
4. Ensure EVERY lesson has at least one exercise at the end
5. Assign resources to lessons based on their alignment with standards
6. Each resource should appear only once in the course
   - HARD CONSTRAINT: Do not duplicate resource IDs anywhere in the course. If a resource could fit multiple places, choose the single best placement and do not reuse it.
   - Within a lesson, never include two resources with the same (type, title). Pick the best one.
7. Use descriptive, engaging titles for units and lessons
8. Preserve the XP values from resources exactly as provided
9. Create exactly the number of units needed to cover all standards comprehensively
</instructions>

<thinking_process>
Think step-by-step about how to organize this course:
- What are the major conceptual themes in the standards?
- How should concepts build upon each other?
- Which videos introduce each concept best?
- Which articles provide the necessary depth?
- Which exercises assess understanding of each lesson's objectives?
- Am I ensuring every lesson ends with an exercise?
</thinking_process>`
}

/**
 * Generates a course plan using OpenAI based on CASE standards and available resources
 * This is the main entry point for AI course generation
 */
export async function generateCoursePlanFromAi(params: {
  subject: Subject
  caseDetails: Array<{
    id: string
    humanCodingScheme: string
    fullStatement: string
    abbreviatedStatement: string
  }>
  resources: Array<{
    sourcedId: string
    title: string
    metadata: {
      khanActivityType?: string
      path?: string
      learningObjectiveSet?: Array<{ source: string; learningObjectiveIds: string[] }>
      xp?: number
    }
  }>
  stimuliAndAssessments: {
    stimuli: Array<{ id: string; title: string; rawXml: string }>
    tests: Array<{ id: string; title: string; rawXml: string }>
  }
  userGrades: string[]
}): Promise<AiGenerateCourseInput> {
  logger.info("generating course plan with openai", {
    subject: params.subject,
    standardsCount: params.caseDetails.length,
    resourcesCount: params.resources.length,
    articlesCount: params.stimuliAndAssessments.stimuli.length,
    exercisesCount: params.stimuliAndAssessments.tests.length,
    grades: params.userGrades,
  })

  // Build the user prompt with rich context including raw XML for articles
  const userPrompt = buildUserPrompt({
    subject: params.subject,
    caseDetails: params.caseDetails,
    resources: params.resources,
    enrichedContent: params.stimuliAndAssessments,
    userGrades: params.userGrades,
  })

  // Log prompt size for monitoring
  const promptSize = userPrompt.length
  logger.debug("ai prompt size", {
    characters: promptSize,
    estimatedTokens: Math.ceil(promptSize / 4) // Rough estimate
  })

  try {
    // Call OpenAI with structured output (using zodResponseFormat helper)
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: zodResponseFormat(AiGenerateCourseInputSchema, "course_plan"),
    })

    // Extract the response
    if (!completion.choices[0]?.message?.content) {
      logger.error("openai returned no response content", { completion })
      throw errors.new("ai response missing content")
    }

    // Parse the JSON response
    const responseJson = JSON.parse(completion.choices[0].message.content)
    const aiResponse = responseJson

    // Override grades with user's actual grades
    const finalPlan = {
      ...aiResponse,
      grades: params.userGrades,
    }

    // Validate the final plan against our schema
    const validation = AiGenerateCourseInputSchema.safeParse(finalPlan)
    if (!validation.success) {
      logger.error("ai response validation failed", {
        errors: validation.error.flatten(),
        response: finalPlan,
      })
      throw errors.wrap(validation.error, "ai response validation failed")
    }

    // Log token usage for monitoring
    if (completion.usage) {
      logger.info("openai token usage", {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      })
    }

    // Verify pedagogical rules
    let warningsCount = 0
    for (const unit of validation.data.units) {
      for (const lesson of unit.lessons) {
        const lastResource = lesson.resources[lesson.resources.length - 1]
        if (!lastResource || lastResource.type !== "Exercise") {
          logger.warn("lesson does not end with exercise", {
            unitTitle: unit.title,
            lessonTitle: lesson.title,
            lastResourceType: lastResource?.type
          })
          warningsCount++
        }
      }
    }

    if (warningsCount > 0) {
      logger.warn("ai generated course has pedagogical warnings", { warningsCount })
    }

    logger.info("ai course generation complete", {
      title: validation.data.title,
      unitsCount: validation.data.units.length,
      totalLessons: validation.data.units.reduce((sum, unit) => sum + unit.lessons.length, 0),
      totalResources: validation.data.units.reduce((sum, unit) =>
        sum + unit.lessons.reduce((lSum, lesson) => lSum + lesson.resources.length, 0), 0
      ),
    })

    return validation.data
  } catch (error) {
    // Handle OpenAI-specific errors
    if (error instanceof OpenAI.APIError) {
      logger.error("openai api error", {
        status: error.status,
        message: error.message,
        code: error.code,
      })

      if (error.status === 429) {
        throw errors.wrap(error, "openai rate limit exceeded")
      }
      if (error.status === 401) {
        throw errors.wrap(error, "openai authentication failed")
      }
    }

    throw errors.wrap(error as Error, "failed to generate course plan with ai")
  }
}

/**
 * Best Practices Applied (from context-engineering.md):
 *
 * 1. XML Tags for Structure (Category 1, Anthropic guidelines):
 *    - Used <learning_standards>, <available_resources>, <article_content> tags
 *    - Clear separation of different context components
 *
 * 2. Be Clear and Direct (Category 8):
 *    - Explicit pedagogical principles
 *    - Step-by-step instructions
 *    - Clear output format definition
 *
 * 3. Context at the Top (Category 10):
 *    - Place long content (resources, standards, articles) before instructions
 *    - Query/task at the end for better performance
 *
 * 4. Chain-of-Thought (Category 9):
 *    - Added <thinking_process> section for step-by-step reasoning
 *    - Encourages logical progression planning
 *
 * 5. Structured Output (Category 11):
 *    - Using zodResponseFormat for guaranteed structure
 *    - Validation with comprehensive error handling
 *
 * 6. Role Assignment (Category 1):
 *    - Clear role as educational curriculum designer
 *    - Domain expertise context provided
 *
 * 7. Pedagogical Best Practices:
 *    - Video → Article → Exercise flow
 *    - Every lesson must end with exercise
 *    - XP values preserved from system (not AI-generated)
 *
 * 8. Raw Content for Articles:
 *    - Including full QTI XML for articles
 *    - AI can understand content depth and structure
 *    - Better alignment with learning objectives
 */
