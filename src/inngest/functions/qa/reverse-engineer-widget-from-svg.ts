import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { allWidgetSchemas, generateWidget } from "@/lib/widgets/generators"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"

// AI similarity analysis schema
const SimilarityAnalysisSchema = z.object({
  similarity: z.number().min(0).max(1).describe("Overall visual similarity score (0-1)"),
  reasoning: z.string().describe("Explanation of the similarity assessment"),
  differences: z.array(z.string()).describe("Key visual differences identified"),
  strengths: z.array(z.string()).describe("Visual aspects that match well"),
  verdict: z.enum(["excellent_match", "good_match", "partial_match", "poor_match"]).describe("Overall assessment")
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const OPENAI_MODEL = "gpt-4o-2024-08-06"

// Helper function to analyze similarity between original and generated SVG using AI
async function analyzeSimilarityWithAI(
  originalSvg: string, 
  generatedSvg: string, 
  widgetType: string, 
  sourceId: string | undefined
): Promise<{ similarity: number; differences: string[] }> {
  
  const systemPrompt = `You are an expert at comparing SVG visualizations for similarity.

Your task: Compare two SVG images and determine how visually similar they are.

Guidelines:
- Focus on visual similarity, not code similarity
- Consider: chart type, data patterns, layout, axes, labels, colors, overall structure
- Ignore minor differences in: exact coordinates, font sizes, stroke widths, colors
- Pay attention to: data representation accuracy, chart structure, key visual elements

Similarity scoring:
- 1.0: Visually identical or near-identical
- 0.8-0.9: Same chart type with similar data patterns
- 0.6-0.7: Same chart type but different data or layout
- 0.4-0.5: Different chart type but similar visual elements  
- 0.2-0.3: Completely different visualization
- 0.0-0.1: No similarity

Be practical - focus on whether these visualizations would convey similar information to a student.`

  const userPrompt = `Compare these two SVG visualizations and assess their similarity:

ORIGINAL SVG:
${originalSvg}

GENERATED SVG (from ${widgetType} widget):
${generatedSvg}

Please analyze:
1. Overall visual similarity (0-1 scale)
2. What matches well between them
3. Key differences you observe
4. Overall verdict on the match quality`

  try {
    const response = await openai.chat.completions.parse({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: zodResponseFormat(SimilarityAnalysisSchema, "similarity_analysis")
    })

    const choice = response.choices[0]
    if (!choice?.message?.parsed) {
      // Fallback to simple metrics if AI fails
      return {
        similarity: 0.5,
        differences: ["AI analysis failed - using fallback"]
      }
    }

    const analysis = choice.message.parsed
    return {
      similarity: analysis.similarity,
      differences: analysis.differences
    }

  } catch (error) {
    // Simple fallback similarity calculation without logger (since it's not available in this scope)
    const originalLength = originalSvg.length
    const generatedLength = generatedSvg.length
    const lengthRatio = Math.min(originalLength, generatedLength) / Math.max(originalLength, generatedLength)
    
    return {
      similarity: lengthRatio * 0.5, // Conservative estimate
      differences: [`AI analysis failed: ${String(error)}`, "Using basic length comparison fallback"]
    }
  }
}

// Input event schema
const ReverseEngineerEventSchema = z.object({
  svgContent: z.string().describe("The SVG content to reverse engineer"),
  expectedWidgetType: z.string().optional().describe("Optional hint about expected widget type"),
  sourceId: z.string().optional().describe("Optional source identifier for tracking"),
  generateValidation: z.boolean().default(true).describe("Whether to validate by regenerating the widget")
})

// AI response schema for multiple widget candidates
const WidgetCandidatesSchema = z.object({
  primaryAnalysis: z.string().describe("Overall analysis of what the SVG represents"),
  candidates: z.array(z.object({
    widgetType: z.string().describe("The widget type this could match"),
    confidence: z.number().min(0).max(1).describe("Confidence level for this match (0-1)"),
    reasoning: z.string().describe("Why this widget type might match"),
    inputData: z.string().describe("JSON string of estimated input data for this widget type"),
    visualFeatures: z.array(z.string()).describe("Visual features that suggest this widget type")
  })).max(5).describe("Top 3-5 widget candidates ranked by likelihood"),
  complexity: z.enum(["simple", "moderate", "complex"]).describe("Overall complexity of the SVG")
})

interface WidgetTestResult {
  widgetType: string
  confidence: number
  success: boolean
  generatedSvg?: string
  similarity?: number
  differences?: string[]
  error?: string
  inputDataUsed?: any
}

export const reverseEngineerWidgetFromSvg = inngest.createFunction(
  {
    id: "reverse-engineer-widget-from-svg",
    name: "Reverse Engineer Widget from SVG using AI",
    concurrency: {
      limit: 50, // Allow multiple concurrent AI analyses
      key: "openai-api-global-concurrency"
    }
  },
  { event: "qa/widget.reverse-engineer-from-svg" },
  async ({ event, step, logger }) => {
    const parsed = ReverseEngineerEventSchema.safeParse(event.data)
    if (!parsed.success) {
      logger.error("invalid event data for svg reverse engineering", { error: parsed.error })
      throw errors.wrap(parsed.error, "event data validation")
    }
    
    const { svgContent, expectedWidgetType, sourceId, generateValidation } = parsed.data
    logger.info("starting svg reverse engineering", { 
      sourceId,
      expectedWidgetType,
      svgLength: svgContent.length,
      generateValidation
    })

    // Step 1: Analyze SVG with AI to get multiple widget candidates
    const candidates = await step.run("analyze-svg-for-candidates", async () => {
      logger.debug("analyzing svg content for widget candidates", { sourceId, svgLength: svgContent.length })

      const systemPrompt = `You are an expert at matching SVG visualizations to widget generators.

Your task: Analyze the provided SVG and suggest 3-5 widget types that could potentially recreate similar visualizations.

Available widget types: ${Object.keys(allWidgetSchemas).join(', ')}

Guidelines:
- Examine SVG elements, text content, coordinates, and visual patterns
- Don't try to reverse engineer exact data - instead suggest widget types that could create similar visualizations
- Rank candidates by likelihood (most likely first)
- For each candidate, estimate reasonable input data that would create a similar visualization
- Focus on the type of chart/graph/diagram, not exact data values

Common patterns:
- Line graphs: polyline/path with data series over time/categories
- Bar charts: rect elements with categorical comparisons
- Scatter plots: circle elements showing relationships
- Coordinate planes: grid systems with plotted elements
- Number lines: linear scales with markers
- Histograms: frequency distributions with bins
- Dot plots: discrete value distributions

Be practical - suggest widgets that an educator might actually use for this type of content.`

      const userPrompt = `Analyze this SVG and suggest the most likely widget types that could create similar visualizations:

${svgContent}

${expectedWidgetType ? `Hint - expected type: ${expectedWidgetType}` : ''}

Provide 3-5 ranked candidates with estimated input data for each.`

      try {
        const response = await openai.chat.completions.parse({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: zodResponseFormat(WidgetCandidatesSchema, "widget_candidates")
        })

        const choice = response.choices[0]
        if (!choice?.message?.parsed) {
          throw errors.new("no parsed response from openai")
        }

        const candidatesResult = choice.message.parsed
        logger.debug("ai candidates analysis completed", {
          sourceId,
          candidateCount: candidatesResult.candidates.length,
          topCandidate: candidatesResult.candidates[0]?.widgetType,
          complexity: candidatesResult.complexity
        })

        // Truncate inputData to prevent step output size limits
        const truncatedCandidates = {
          ...candidatesResult,
          candidates: candidatesResult.candidates.map(candidate => ({
            ...candidate,
            inputData: candidate.inputData.length > 1000 
              ? candidate.inputData.substring(0, 1000) + '"}' // Try to keep valid JSON
              : candidate.inputData,
            reasoning: candidate.reasoning.substring(0, 200) // Limit reasoning length
          }))
        }
        
        return truncatedCandidates

      } catch (error) {
        logger.error("openai candidates analysis failed", { error: String(error), sourceId })
        throw errors.wrap(error as Error, "openai svg candidates analysis")
      }
    })

    // Step 2: Test each candidate widget by generating and comparing
    const testSummary = generateValidation ? await step.run("test-widget-candidates", async () => {
      logger.debug("testing widget candidates by generation", {
        sourceId,
        candidateCount: candidates.candidates.length
      })

      let bestMatch: { widgetType: string; similarity: number; success: boolean } | null = null
      let successCount = 0
      let failureCount = 0

      // Only test top 3 candidates to reduce output size
      const topCandidates = candidates.candidates.slice(0, 3)

      for (const candidate of topCandidates) {
        try {
          // Parse and validate input data
          const parsedInputData = JSON.parse(candidate.inputData)
          const widgetSchema = allWidgetSchemas[candidate.widgetType as keyof typeof allWidgetSchemas]
          
          if (!widgetSchema) {
            failureCount++
            continue
          }

          const validationResult = widgetSchema.safeParse(parsedInputData)
          if (!validationResult.success) {
            failureCount++
            continue
          }

          // Generate and compare
          const generatedSvg = generateWidget(validationResult.data as any)
          const similarityAnalysis = await analyzeSimilarityWithAI(svgContent, generatedSvg, candidate.widgetType, sourceId)
          
          const combinedScore = candidate.confidence * similarityAnalysis.similarity
          
          if (!bestMatch || combinedScore > (bestMatch.similarity * 0.9)) { // Rough comparison
            bestMatch = {
              widgetType: candidate.widgetType,
              similarity: similarityAnalysis.similarity,
              success: true
            }
          }
          
          successCount++

        } catch (error) {
          logger.debug("candidate test failed", { 
            widgetType: candidate.widgetType,
            error: String(error).substring(0, 50)
          })
          failureCount++
        }
      }

      return {
        bestMatch,
        successCount,
        failureCount,
        totalTested: topCandidates.length
      }
    }) : { bestMatch: null, successCount: 0, failureCount: 0, totalTested: 0 }

    // Step 3: Prepare minimal final results
    const results = await step.run("prepare-results", async () => {
      const finalResults = {
        sourceId,
        bestMatch: testSummary.bestMatch,
        summary: {
          candidateCount: candidates.candidates.length,
          successCount: testSummary.successCount,
          failureCount: testSummary.failureCount,
          complexity: candidates.complexity
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          expectedWidgetType,
          matchesExpected: expectedWidgetType && testSummary.bestMatch ? testSummary.bestMatch.widgetType === expectedWidgetType : null
        }
      }

      logger.info("widget matching completed", {
        sourceId,
        bestMatch: testSummary.bestMatch?.widgetType,
        bestSimilarity: testSummary.bestMatch?.similarity,
        successCount: testSummary.successCount,
        failureCount: testSummary.failureCount,
        matchesExpected: finalResults.metadata.matchesExpected
      })

      return finalResults
    })

    return results
  }
)

// Helper function to trigger reverse engineering for a batch of SVGs
export const reverseEngineerBatchFromDatabase = inngest.createFunction(
  {
    id: "reverse-engineer-batch-from-database", 
    name: "Reverse Engineer Batch of Widgets from Database SVGs",
    concurrency: { limit: 5 }
  },
  { event: "qa/widget.reverse-engineer-batch" },
  async ({ event, step, logger }) => {
    const { courseIds, widgetTypes, limit = 50 } = event.data
    logger.info("starting batch reverse engineering from database", { courseIds, widgetTypes, limit })

    // This function would query the database for SVGs and dispatch individual reverse engineering events
    // Implementation details would depend on how we want to query the database for SVGs
    
    const results = await step.run("dispatch-individual-reverse-engineering", async () => {
      // TODO: Implement database query for SVGs and dispatch events
      // For now, return placeholder
      return {
        dispatched: 0,
        message: "Batch reverse engineering not yet implemented - use individual events"
      }
    })

    return results
  }
)
