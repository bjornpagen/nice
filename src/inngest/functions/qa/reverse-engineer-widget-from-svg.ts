import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { allWidgetSchemas, generateWidget } from "@/lib/widgets/generators"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const OPENAI_MODEL = "gpt-4o-2024-08-06"

// Input event schema
const ReverseEngineerEventSchema = z.object({
  svgContent: z.string().describe("The SVG content to reverse engineer"),
  expectedWidgetType: z.string().optional().describe("Optional hint about expected widget type"),
  sourceId: z.string().optional().describe("Optional source identifier for tracking"),
  generateValidation: z.boolean().default(true).describe("Whether to validate by regenerating the widget")
})

// AI response schema
const WidgetAnalysisSchema = z.object({
  widgetType: z.string().describe("The identified widget type from the SVG analysis"),
  confidence: z.number().min(0).max(1).describe("Confidence level in the analysis (0-1)"),
  reasoning: z.string().describe("Explanation of why this widget type was chosen"),
  inputData: z.string().describe("JSON string of the widget input data structure"),
  visualFeatures: z.array(z.string()).describe("Key visual features that led to this identification"),
  complexity: z.enum(["simple", "moderate", "complex"]).describe("Assessed complexity of the SVG")
})

interface ValidationResult {
  success: boolean
  generatedSvg?: string
  similarity?: number
  differences?: string[]
  error?: string
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

    // Step 1: Analyze SVG with AI to determine widget type and input data
    const analysis = await step.run("analyze-svg-with-ai", async () => {
      logger.debug("analyzing svg content with openai", { sourceId, svgLength: svgContent.length })

      const systemPrompt = `You are an expert at reverse engineering data visualization widgets from SVG content.

Your task: Analyze the provided SVG and determine what widget generator created it and what input data was used.

Available widget types: ${Object.keys(allWidgetSchemas).join(', ')}

Guidelines:
- Examine SVG elements, text content, coordinates, and patterns
- Identify the type of chart/graph/diagram from visual features
- Extract the underlying data structure that would generate this visualization
- Pay attention to axes, scales, data points, labels, colors, and layout
- Return input data as a valid JSON string matching the widget schema

Common patterns:
- Line graphs: polyline/path elements with coordinate data
- Bar charts: rect elements with categorical data
- Scatter plots: circle elements with x,y coordinates  
- Coordinate planes: axes with grid lines and numeric labels
- Number lines: horizontal/vertical lines with evenly spaced markers
- Histograms: grouped rect elements with frequency data
- Dot plots: multiple circles at discrete positions

Focus on mathematical precision - extract exact coordinates, ranges, and values.`

      const userPrompt = `Analyze this SVG content and reverse engineer the widget that created it:

${svgContent}

${expectedWidgetType ? `Expected widget type: ${expectedWidgetType}` : ''}

Please identify:
1. The widget type that generated this SVG
2. The input data structure that would recreate it
3. Key visual features you used for identification
4. Your confidence in this analysis`

      try {
        const response = await openai.chat.completions.parse({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: zodResponseFormat(WidgetAnalysisSchema, "widget_analysis")
        })

        const choice = response.choices[0]
        if (!choice?.message?.parsed) {
          throw errors.new("no parsed response from openai")
        }

        const analysisResult = choice.message.parsed
        logger.debug("ai analysis completed", {
          sourceId,
          widgetType: analysisResult.widgetType,
          confidence: analysisResult.confidence,
          complexity: analysisResult.complexity
        })

        return analysisResult

      } catch (error) {
        logger.error("openai analysis failed", { error: String(error), sourceId })
        throw errors.wrap(error as Error, "openai svg analysis")
      }
    })

    // Step 2: Validate the analysis by generating the widget (if requested)
    const validation = generateValidation ? await step.run("validate-analysis", async (): Promise<ValidationResult> => {
      logger.debug("validating analysis by regenerating widget", {
        sourceId,
        widgetType: analysis.widgetType
      })

      try {
        // Parse the input data JSON
        let parsedInputData: any
        try {
          parsedInputData = JSON.parse(analysis.inputData)
        } catch (parseError) {
          return {
            success: false,
            error: `Failed to parse AI-generated input data: ${String(parseError)}`
          }
        }

        // Get the widget schema
        const widgetSchema = allWidgetSchemas[analysis.widgetType as keyof typeof allWidgetSchemas]
        if (!widgetSchema) {
          return {
            success: false,
            error: `No schema found for widget type: ${analysis.widgetType}`
          }
        }

        // Validate against schema
        const validationResult = widgetSchema.safeParse(parsedInputData)
        if (!validationResult.success) {
          return {
            success: false,
            error: `Schema validation failed: ${validationResult.error.message}`
          }
        }

        // Generate the widget
        const generatedSvg = generateWidget(validationResult.data as any)
        
        // Basic similarity check (compare SVG lengths and element counts as a proxy)
        const originalElementCount = (svgContent.match(/<\w+/g) || []).length
        const generatedElementCount = (generatedSvg.match(/<\w+/g) || []).length
        const lengthRatio = Math.min(svgContent.length, generatedSvg.length) / Math.max(svgContent.length, generatedSvg.length)
        const elementRatio = Math.min(originalElementCount, generatedElementCount) / Math.max(originalElementCount, generatedElementCount)
        const similarity = (lengthRatio + elementRatio) / 2

        // Identify major differences (simplified)
        const differences: string[] = []
        if (Math.abs(originalElementCount - generatedElementCount) > originalElementCount * 0.2) {
          differences.push(`Element count differs significantly: ${originalElementCount} vs ${generatedElementCount}`)
        }
        if (Math.abs(svgContent.length - generatedSvg.length) > svgContent.length * 0.3) {
          differences.push(`SVG length differs significantly: ${svgContent.length} vs ${generatedSvg.length}`)
        }

        logger.debug("validation completed", {
          sourceId,
          similarity,
          differences: differences.length,
          generatedLength: generatedSvg.length
        })

        return {
          success: true,
          generatedSvg,
          similarity,
          differences: differences.length > 0 ? differences : undefined
        }

      } catch (error) {
        logger.error("validation failed", { error: String(error), sourceId })
        return {
          success: false,
          error: String(error)
        }
      }
    }) : null

    // Step 3: Prepare final results
    const results = await step.run("prepare-results", async () => {
      const finalResults = {
        sourceId,
        analysis: {
          widgetType: analysis.widgetType,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          visualFeatures: analysis.visualFeatures,
          complexity: analysis.complexity,
          inputData: analysis.inputData
        },
        validation: validation ? {
          success: validation.success,
          similarity: validation.similarity,
          differences: validation.differences,
          error: validation.error,
          hasGeneratedSvg: !!validation.generatedSvg
        } : null,
        metadata: {
          originalSvgLength: svgContent.length,
          generatedAt: new Date().toISOString(),
          expectedWidgetType,
          matchesExpected: expectedWidgetType ? analysis.widgetType === expectedWidgetType : null
        }
      }

      logger.info("reverse engineering completed", {
        sourceId,
        success: !validation || validation.success,
        widgetType: analysis.widgetType,
        confidence: analysis.confidence,
        similarity: validation?.similarity,
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
