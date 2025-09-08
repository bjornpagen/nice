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
const MAX_RETRIES = 3

// AI response schema for widget identification and input generation
const WidgetIdentificationSchema = z.object({
  widgetType: z.string().describe("The identified widget type from available generators"),
  confidence: z.number().min(0).max(1).describe("Confidence in identification (0-1)"),
  reasoning: z.string().describe("Explanation of identification decision"),
  inputData: z.string().describe("JSON string of widget input data matching the widget schema")
})

// Input event schema
const ReverseEngineerEventSchema = z.object({
  svgBase64: z.string().min(1),
  sourceId: z.string(),
  expectedWidgetType: z.string().optional()
})

export const reverseEngineerSvgToWidget = inngest.createFunction(
  {
    id: "reverse-engineer-svg-to-widget",
    name: "Reverse Engineer SVG to Widget Input Data",
    concurrency: {
      limit: 20,
      key: "openai-api-global-concurrency"
    }
  },
  { event: "qa/svg.reverse-engineer-to-widget" },
  async ({ event, step, logger }) => {
    const parsed = ReverseEngineerEventSchema.safeParse(event.data)
    if (!parsed.success) {
      logger.error("invalid event data", { error: parsed.error })
      throw errors.wrap(parsed.error, "event validation")
    }
    
    const { svgBase64, sourceId, expectedWidgetType } = parsed.data
    logger.info("starting svg reverse engineering", { sourceId, expectedWidgetType })

    // Decode SVG content (outside step.run per project rules)
    const svgDecodeResult = errors.trySync(() => 
      Buffer.from(svgBase64, 'base64').toString('utf-8')
    )
    if (svgDecodeResult.error) {
      logger.error("failed to decode base64 svg", { sourceId, error: svgDecodeResult.error })
      throw errors.wrap(svgDecodeResult.error, "svg decode")
    }
    const svgContent = svgDecodeResult.data

    // Step 1: AI analysis to identify widget type and generate input data with retry
    const widgetData = await step.run("identify-widget-and-generate-input", async () => {
      const availableWidgets = Object.keys(allWidgetSchemas).join(', ')
      
      const systemPrompt = `You are an expert at reverse engineering educational widget visualizations.

Available widget types: ${availableWidgets}

Analyze the SVG and determine:
1. Which widget type would generate similar visualization
2. Generate input data matching that widget's exact schema requirements

Focus on educational content patterns:
- Line graphs: time series, data trends
- Bar charts: categorical comparisons  
- Scatter plots: relationship data
- Coordinate planes: mathematical plotting
- Number lines: numerical concepts
- Histograms: frequency distributions

Return valid JSON that exactly matches the widget schema.`

      const userPrompt = `Analyze this SVG and generate widget input data:

${svgContent}

${expectedWidgetType ? `Expected type: ${expectedWidgetType}` : ''}

Identify the widget type and generate complete input data that matches the schema exactly.`

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await openai.chat.completions.parse({
            model: OPENAI_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: zodResponseFormat(WidgetIdentificationSchema, "widget_identification")
          })

          const choice = response.choices[0]
          if (!choice?.message?.parsed) {
            throw errors.new("no parsed response from openai")
          }

          const result = choice.message.parsed
          
          // Validate input data against widget schema
          const widgetSchema = allWidgetSchemas[result.widgetType as keyof typeof allWidgetSchemas]
          if (!widgetSchema) {
            throw errors.new(`no schema found for widget type: ${result.widgetType}`)
          }
          
          const inputDataResult = errors.trySync(() => JSON.parse(result.inputData))
          if (inputDataResult.error) {
            if (attempt < MAX_RETRIES) {
              logger.warn("invalid json from ai, retrying", { attempt, error: inputDataResult.error })
              continue
            }
            throw errors.wrap(inputDataResult.error, "json parse")
          }
          
          const validation = widgetSchema.safeParse(inputDataResult.data)
          if (!validation.success) {
            if (attempt < MAX_RETRIES) {
              logger.warn("schema validation failed, retrying", { 
                attempt, 
                widgetType: result.widgetType,
                validationError: validation.error.message 
              })
              continue
            }
            throw errors.new(`schema validation failed after ${MAX_RETRIES} attempts: ${validation.error.message}`)
          }

          // Test that the widget actually generates without errors
          const testGenerateResult = await errors.try(generateWidget(validation.data as any))
          if (testGenerateResult.error) {
            if (attempt < MAX_RETRIES) {
              logger.warn("widget generation test failed, retrying", { 
                attempt, 
                widgetType: result.widgetType,
                error: testGenerateResult.error 
              })
              continue
            }
            throw errors.wrap(testGenerateResult.error, "widget generation test")
          }

          // Success - return the validated data
          logger.debug("widget reverse engineering successful", {
            sourceId,
            widgetType: result.widgetType,
            confidence: result.confidence,
            attempt
          })

          return {
            widgetType: result.widgetType,
            confidence: result.confidence,
            reasoning: result.reasoning.substring(0, 200), // Limit for step output
            inputData: result.inputData,
            validatedInputData: validation.data,
            generatedSvgLength: testGenerateResult.data.length
          }

        } catch (error) {
          if (attempt === MAX_RETRIES) {
            logger.error("ai widget identification failed after retries", { 
              sourceId, 
              attempts: MAX_RETRIES,
              error: String(error) 
            })
            throw errors.wrap(error as Error, "ai widget identification")
          }
          logger.warn("ai attempt failed, retrying", { attempt, error: String(error) })
        }
      }
      
      // This should never be reached due to throw in loop
      throw errors.new("unexpected end of retry loop")
    })

    logger.info("svg reverse engineering completed successfully", {
      sourceId,
      widgetType: widgetData.widgetType,
      confidence: widgetData.confidence
    })

    return {
      sourceId,
      widgetType: widgetData.widgetType,
      confidence: widgetData.confidence,
      success: true,
      inputData: widgetData.validatedInputData,
      reasoning: widgetData.reasoning
    }
  }
)
