import { z } from "zod"
import { allExamples } from "@/lib/qti-generation/examples"
import { AssessmentItemSchema } from "@/lib/qti-generation/schemas"
import type { typedSchemas } from "@/lib/widgets/generators"
import type { ImageContext } from "./perseus-image-resolver"

// Helper to convert a full AssessmentItemInput into a shell for prompt examples
function createShellFromExample(item: (typeof allExamples)[0]) {
	const shell = {
		...item,
		widgets: item.widgets ? Object.keys(item.widgets) : [],
		interactions: item.interactions ? Object.keys(item.interactions) : []
	}
	// Validate against the shell schema before returning
	return AssessmentItemSchema.extend({
		widgets: z.array(z.string()),
		interactions: z.array(z.string())
	}).parse(shell)
}

// Define a union type that includes both valid widget types and the bailout option
type WidgetTypeOrNotFound = keyof typeof typedSchemas | "WIDGET_NOT_FOUND"

const widgetTypeKeys: [WidgetTypeOrNotFound, ...WidgetTypeOrNotFound[]] = [
	"absoluteValueNumberLine",
	"barChart",
	"boxPlot",
	"compositeShapeDiagram",
	"coordinatePlane",
	"dataTable",
	"discreteObjectRatioDiagram",
	"dotPlot",
	"doubleNumberLine",
	"geometricSolidDiagram",
	"hangerDiagram",
	"histogram",
	"inequalityNumberLine",
	"numberLine",
	"numberLineForOpposites",
	"numberLineWithAction",
	"numberLineWithFractionGroups",
	"numberSetDiagram",
	"parallelLinesTransversal",
	"partitionedShape",
	"pictograph",
	"polyhedronDiagram",
	"polyhedronNetDiagram",
	"pythagoreanProofDiagram",
	"scatterPlot",
	"stackedItemsDiagram",
	"tapeDiagram",
	"unitBlockDiagram",
	"vennDiagram",
	"verticalArithmeticSetup",
	// ADD: New bailout option for when no widget is suitable.
	"WIDGET_NOT_FOUND"
]

function createWidgetMappingSchema(slotNames: string[]) {
	const mappingShape: Record<string, z.ZodEnum<[WidgetTypeOrNotFound, ...WidgetTypeOrNotFound[]]>> = {}
	for (const slotName of slotNames) {
		mappingShape[slotName] = z.enum(widgetTypeKeys)
	}
	return z.object({
		widget_mapping: z
			.object(mappingShape)
			.describe("A JSON object mapping each widget slot name to its corresponding widget type.")
	})
}

/**
 * SHOT 1: Creates the prompt for generating the Assessment Shell.
 */
export function createAssessmentShellPrompt(
	perseusJson: string,
	imageContext: ImageContext
): {
	systemInstruction: string
	userContent: string
} {
	const systemInstruction = `You are an expert in educational content conversion with vision capabilities. Your task is to analyze a Perseus JSON object and accompanying image data to create a structured assessment shell.

**Vision Capability**: You may be provided with raster images (PNG, JPG) as multimodal input. Use your vision to analyze these images. For SVG images, their raw XML content will be provided directly in the text prompt. This visual information is critical context for understanding the Perseus JSON.

The shell should:
1. Convert Perseus content into a single 'body' string with <slot name="..."/> placeholders.
2. List all widget and interaction identifiers as arrays of strings in the 'widgets' and 'interactions' properties.
3. Faithfully translate all mathematical content from LaTeX to MathML.
4. Preserve the logical flow and structure of the original content.
5. NEVER create HTML tables directly - ALL tables must be converted to widget slots.

Your output MUST be a valid JSON object.`

	const exampleShells = allExamples.map(createShellFromExample)

	const userContent = `Convert the following Perseus JSON into an assessment shell. Use the provided image context to understand the content fully.

## Image Context (for your analysis only)

### Raw SVG Content
If any images are SVGs, their content is provided here for you to analyze.
\`\`\`json
${imageContext.svgContentMap.size === 0 ? "{}" : JSON.stringify(Object.fromEntries(imageContext.svgContentMap), null, 2)}
\`\`\`

## Target Shell Examples
Below are examples of the exact 'shell' structure you must generate. Study them to understand the desired output format, especially how MathML is used and how widget/interaction slots are defined.

\`\`\`json
${JSON.stringify(exampleShells, null, 2)}
\`\`\`

## Perseus JSON to Convert
\`\`\`json
${perseusJson}
\`\`\`

## CRITICAL Instructions:
- **Analyze Images**: Use the raster images provided to your vision and the raw SVG content above to understand the visual components of the question.
- **\`body\` Field**: Create a 'body' field containing the main content as an HTML string.
- **Placeholders**:
  - For ALL Perseus widgets (including 'image' widgets), create a \`<slot name="..." />\` placeholder in the 'body' and add its identifier to the 'widgets' string array.
  - For each Perseus interaction (e.g., 'radio', 'text-input'), create a placeholder like \`<slot name="interaction_1" />\` and add its identifier (e.g., "interaction_1") to the 'interactions' string array.
- **DO NOT EMBED IMAGES**: You MUST NOT generate \`<img>\` tags or data URIs in the 'body' string. All images must be handled as widgets referenced by slots.
- **MathML Conversion (MANDATORY)**:
  - You MUST convert ALL LaTeX expressions (text enclosed in \`$...\`) to standard MathML (\`<math>...</math>\`).
  - PRESERVE all mathematical structures: fractions (\`<mfrac>\`), exponents (\`<msup>\`), roots (\`<mroot>\`), operators (\`<mo>\`), and inequalities (\`&lt;\`, \`&gt;\`).
  - Do NOT simplify or alter the mathematical content. It must be a faithful translation.
- **Table Rule (MANDATORY)**:
  - Tables must NEVER be created as HTML \`<table>\` elements in the body.
  - ALWAYS create a widget slot for every table (e.g., \`<slot name="table_widget_1" />\`) and add "table_widget_1" to the 'widgets' array.
- **Response Declarations**:
  - The 'question.answers' from Perseus must be used to create the \`responseDeclarations\`.
  - **Numeric Answers Rule**: For text entry interactions, if the correct answer is a decimal that can be represented as a simple fraction (e.g., 0.5, 0.25), the 'correct' value in the response declaration should be a string representing that fraction (e.g., "1/2", "1/4"). This is to avoid forcing students to type decimals.
- **Metadata**: Include all required assessment metadata: 'identifier', 'title', 'responseDeclarations', and 'feedback'.
- **Widget Generation**: When you generate the final widget objects in a later step, ensure all image references are properly resolved.

Return ONLY the JSON object for the assessment shell.`

	return { systemInstruction, userContent }
}

/**
 * SHOT 2: Creates the prompt for mapping widget slots to widget types.
 */
export function createWidgetMappingPrompt(perseusJson: string, assessmentBody: string, slotNames: string[]) {
	const systemInstruction = `You are an expert in educational content and QTI standards. Your task is to analyze an assessment item's body content and the original Perseus JSON to map widget slots to the most appropriate widget type from a given list.

**CRITICAL RULE**: If you analyze the Perseus JSON for a given slot and determine that NONE of the available widget types are a suitable match, you MUST use the type "WIDGET_NOT_FOUND". This is a bailout signal that the content cannot be migrated. Use this option only when you are certain no other widget type fits.

Widget Type Options:
${widgetTypeKeys.join("\n")}`

	const userContent = `Based on the Perseus JSON and assessment body below, create a JSON object that maps each widget slot name to the most appropriate widget type.

Perseus JSON:
\`\`\`json
${perseusJson}
\`\`\`

Assessment Item Body:
\`\`\`html
${assessmentBody}
\`\`\`

Your response must be a JSON object with a single key "widget_mapping", mapping every slot name from the list below to its type.

Slot Names to Map:
${slotNames.join("\n")}`

	const WidgetMappingSchema = createWidgetMappingSchema(slotNames)

	return { systemInstruction, userContent, WidgetMappingSchema }
}

/**
 * SHOT 3: Creates the prompt for generating only interaction content.
 */
export function createInteractionContentPrompt(
	perseusJson: string,
	assessmentShell: unknown,
	imageContext: ImageContext
): {
	systemInstruction: string
	userContent: string
} {
	const systemInstruction = `You are an expert in educational content conversion with vision capabilities, focused on generating QTI interaction objects. Your task is to generate ONLY the interaction content objects based on the original Perseus JSON, a contextual assessment shell, and accompanying visual context.

**Vision Capability**: You may be provided with raster images (PNG, JPG) as multimodal input. Use your vision to analyze these images. For SVG images, their raw XML content will be provided directly in the text prompt.

You must generate a JSON object where:
- Each key is an interaction slot name from the shell.
- Each value is a fully-formed QTI interaction object.
- All interaction properties must conform to the QTI interaction schemas.
- All MathML must be perfectly preserved.`

	const userContent = `Generate interaction content based on the following inputs. Use the provided image context to understand the visual components.

## Image Context (for your analysis only)

### Raw SVG Content
If any images are SVGs, their content is provided here for you to analyze.
\`\`\`json
${imageContext.svgContentMap.size === 0 ? "{}" : JSON.stringify(Object.fromEntries(imageContext.svgContentMap), null, 2)}
\`\`\`

## Original Perseus JSON:
\`\`\`json
${perseusJson}
\`\`\`

## Assessment Shell (for context):
\`\`\`json
${JSON.stringify(assessmentShell, null, 2)}
\`\`\`

## Instructions:
- **Analyze Images**: Use the raster images provided to your vision and the raw SVG content above to understand the visual context of interactions.
- For each interaction slot name in the shell's 'interactions' array, generate a complete QTI interaction object.
- Extract all relevant data from the Perseus JSON to populate the interaction properties (prompt, choices, etc.).
- Ensure all required properties for each interaction type are included.
- **CRITICAL**: Preserve all MathML content exactly as it appears in the assessment shell body.
- Return ONLY a JSON object with interaction slot names as keys and interaction objects as values.

Example output structure:
{
  "interaction_1": { /* full QTI choiceInteraction object */ },
  "interaction_2": { /* full QTI textEntryInteraction object */ }
}`

	return { systemInstruction, userContent }
}

/**
 * SHOT 4: Creates a prompt for generating only widget content.
 */
export function createWidgetContentPrompt(
	perseusJson: string,
	assessmentShell: unknown,
	widgetMapping: Record<string, keyof typeof typedSchemas>,
	imageContext: ImageContext
): {
	systemInstruction: string
	userContent: string
} {
	const systemInstruction = `You are an expert in educational content conversion with vision capabilities, focused on generating widget content for QTI assessments. Your task is to generate ONLY the widget content objects based on the original Perseus JSON, an assessment shell, a mapping that specifies the exact widget type for each slot, and accompanying visual context.

**Vision Capability**: You may be provided with raster images (PNG, JPG) as multimodal input. Use your vision to analyze these images. For SVG images, their raw XML content will be provided directly in the text prompt.

You must generate a JSON object where:
- Each key is a widget slot name from the mapping.
- Each value is a fully-formed widget object of the specified type.
- All widget properties must conform to their respective schemas.`

	const userContent = `Generate widget content based on the following inputs. Use the provided image context to understand the visual components.

## Image Context (for your analysis only)

### Raw SVG Content
If any images are SVGs, their content is provided here for you to analyze.
\`\`\`json
${imageContext.svgContentMap.size === 0 ? "{}" : JSON.stringify(Object.fromEntries(imageContext.svgContentMap), null, 2)}
\`\`\`

## Original Perseus JSON:
\`\`\`json
${perseusJson}
\`\`\`

## Assessment Shell (for context):
\`\`\`json
${JSON.stringify(assessmentShell, null, 2)}
\`\`\`

## Widget Mapping:
\`\`\`json
${JSON.stringify(widgetMapping, null, 2)}
\`\`\`

## Instructions:
- **Analyze Images**: Use the raster images provided to your vision and the raw SVG content above to understand the visual components of widgets.
- For each entry in the widget mapping, generate a fully-formed widget object of the specified type.
- Extract all relevant data from the Perseus JSON to populate the widget properties.
- Ensure all required properties for each widget type are included.
- Use the assessment shell's body to understand the context of where each widget appears.
- Return ONLY a JSON object with widget slot names as keys and widget objects as values.

Example output structure:
{
  "widget_1": { "type": "doubleNumberLine", "width": 400, ... },
  "table_1": { "type": "dataTable", "columns": [...], ... }
}`

	return { systemInstruction, userContent }
}
