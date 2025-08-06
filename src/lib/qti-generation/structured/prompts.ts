import { z } from "zod"
import { allExamples } from "@/lib/qti-generation/examples"
import { type AnyInteraction, AssessmentItemSchema } from "@/lib/qti-generation/schemas"
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
	"3dIntersectionDiagram",
	"absoluteValueNumberLine",
	"angleDiagram",
	"barChart",
	"boxGrid",
	"boxPlot",
	"circleDiagram",
	"compositeShapeDiagram",
	"coordinatePlane",
	"dataTable",
	"discreteObjectRatioDiagram",
	"dotPlot",
	"doubleNumberLine",
	"emojiImage",
	"figureComparisonDiagram",
	"fractionNumberLine",
	"geometricSolidDiagram",
	"hangerDiagram",
	"histogram",
	"inequalityNumberLine",
	"numberLine",
	"numberLineForOpposites",
	"numberLineWithAction",
	"numberLineWithFractionGroups",
	"numberSetDiagram",
	"partitionedShape",
	"pentagonIntersectionDiagram",
	"pictograph",
	"polyhedronDiagram",
	"polyhedronNetDiagram",
	"probabilitySpinner",
	"pythagoreanProofDiagram",
	"ratioBoxDiagram",
	"scatterPlot",
	"stackedItemsDiagram",
	"tapeDiagram",
	"transformationDiagram",
	"treeDiagram",
	"triangleDiagram",
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
	const systemInstruction = `You are an expert in educational content conversion. Your task is to analyze a Perseus JSON object and create a structured assessment shell.

The shell should:
1. Convert Perseus content into a single 'body' string with <slot name="..."/> placeholders.
2. List all widget and interaction identifiers as arrays of strings in the 'widgets' and 'interactions' properties.
3. Faithfully translate all mathematical content from LaTeX to MathML.
4. NEVER generate <img> or <svg> tags in the body - all visual elements must be widget slots.

ABSOLUTE REQUIREMENT: SLOT CONSISTENCY.
This is the most critical rule. Any \`<slot name="..."/>\` tag you include in the 'body' string MUST have its name listed in either the 'widgets' array or the 'interactions' array. Conversely, every name in the 'widgets' and 'interactions' arrays MUST correspond to a \`<slot>\` tag in the 'body'. There must be a perfect, one-to-one mapping.

CRITICAL: Never embed images or SVGs directly. The body must contain ONLY text, MathML, and slot placeholders.

⚠️ ABSOLUTELY BANNED CONTENT - ZERO TOLERANCE ⚠️
The following are CATEGORICALLY FORBIDDEN in the output. ANY violation will result in IMMEDIATE REJECTION:

1. **LATEX COMMANDS ARE BANNED** - Under NO circumstances may ANY LaTeX command appear in the output:
   - NO backslash commands: \sqrt, \dfrac, \frac, \sum, \int, etc.
   - NO LaTeX delimiters: \(, \), \[, \], \\begin, \\end
   - NO color commands: \blueD, \maroonD, \redE, \greenC, etc.
   - NO text commands: \text, \textbf, \textit, etc.
   - If you see ANY backslash followed by letters, you have FAILED.

2. **LATEX DOLLAR SIGN DELIMITERS ARE BANNED** - The $ character when used for LaTeX is FORBIDDEN:
   - NO inline math delimiters: $x + y$ (convert to \`<math>...</math>\`)
   - NO display math delimiters: $$x + y$$ (convert to \`<math display="block">...</math>\`)
   - Dollar signs for currency are ALLOWED when properly tagged: \`<span class="currency">$</span>\`
   - Remove $ when it's used as a LaTeX delimiter, but preserve it when it's properly marked as currency.

3. **DEPRECATED MATHML IS BANNED** - The following MathML elements are OBSOLETE and FORBIDDEN:
   - NO <mfenced> elements - use <mrow> with explicit <mo> delimiters instead
   - NO deprecated attributes or elements

ALL mathematical content MUST be converted to valid, modern MathML. NO EXCEPTIONS.

Any discrepancy will cause your output to be rejected. Review your work carefully to ensure the body's slots and the declaration arrays are perfectly synchronized.`

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
- **NEVER EMBED IMAGES OR SVGs**: You MUST NOT generate \`<img>\` tags, \`<svg>\` tags, or data URIs in the 'body' string. This is a critical requirement. ALL images and visual elements must be handled as widgets referenced by slots. If you see an image in Perseus, create a widget slot for it, never embed it directly.
- **MathML Conversion (MANDATORY)**:
  - You MUST convert ALL LaTeX expressions to standard MathML (\`<math>...</math>\`).
  - PRESERVE all mathematical structures: fractions (\`<mfrac>\`), exponents (\`<msup>\`), roots (\`<mroot>\` or \`<msqrt>\`), operators (\`<mo>\`), and inequalities (\`&lt;\`, \`&gt;\`).
  - Do NOT simplify or alter the mathematical content. It must be a faithful translation.
  - **CRITICAL BANS**:
    * NO LaTeX commands in output: If input has \`\\sqrt{x}\`, output must be \`<msqrt><mi>x</mi></msqrt>\`, NEVER leave the backslash command
    * NO LaTeX dollar sign delimiters: Remove \`$\` when used for LaTeX math (e.g., \`$x+y$\` should be \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`)
    * NO \`<mfenced>\` elements: Use \`<mrow><mo>(</mo>...<mo>)</mo></mrow>\` instead of \`<mfenced open="(" close=")">\`
    * NO LaTeX color commands: Strip \`\\blueD{x}\` to just the content \`x\`
    * NO LaTeX delimiters: Convert \`\\(...\\)\` to proper MathML, never leave the backslashes
  - **CURRENCY HANDLING**:
    * Currency symbols are allowed when properly tagged: \`<span class="currency">$</span>\`
    * Do NOT use \`<mo>$</mo>\` in MathML for currency (use it only for mathematical operators if needed)
    * Acceptable patterns: \`<span class="currency">$</span><math><mn>5</mn></math>\` or text like "5 dollars"
- **Table Rule (MANDATORY)**:
  - Tables must NEVER be created as HTML \`<table>\` elements in the body.
  - ALWAYS create a widget slot for every table (e.g., \`<slot name="table_widget_1" />\`) and add "table_widget_1" to the 'widgets' array.
- **Response Declarations**:
  - The 'question.answers' from Perseus must be used to create the \`responseDeclarations\`.
  - **Numeric Answers Rule**: For text entry interactions, if the correct answer is a decimal that can be represented as a simple fraction (e.g., 0.5, 0.25), the 'correct' value in the response declaration should be a string representing that fraction (e.g., "1/2", "1/4"). This is to avoid forcing students to type decimals.
- **Metadata**: Include all required assessment metadata: 'identifier', 'title', 'responseDeclarations', and 'feedback'.
- **Widget Generation**: When you generate the final widget objects in a later step, ensure all image references are properly resolved.

Return ONLY the JSON object for the assessment shell.

## NEGATIVE EXAMPLES FROM REAL ERRORS (AUTOMATIC REJECTION)

**1. LaTeX Commands - ALL BANNED:**
WRONG: \`<mi>\\\\sqrt{a}</mi>\` --> CORRECT: \`<msqrt><mi>a</mi></msqrt>\`
WRONG: \`\\\\(\\\\dfrac{3}{10}\\\\)\` --> CORRECT: \`<math><mfrac><mn>3</mn><mn>10</mn></mfrac></math>\`
WRONG: \`\\\\(n = \\\\dfrac{96}{5}\\\\)\` --> CORRECT: \`<math><mi>n</mi><mo>=</mo><mfrac><mn>96</mn><mn>5</mn></mfrac></math>\`
WRONG: \`\\\\blueD{x=2} and \\\\maroonD{y=4}\` --> CORRECT: \`<mi>x</mi><mo>=</mo><mn>2</mn> and <mi>y</mi><mo>=</mo><mn>4</mn>\`
WRONG: \`\\\\(\\\\tfrac{4}{3}\\\\)\` --> CORRECT: \`<math><mfrac><mn>4</mn><mn>3</mn></mfrac></math>\`
WRONG: \`$\\\\green{\\\\text{Step }1}$\` --> CORRECT: \`Step 1\`
WRONG: \`$3^4 \\\\;\\\\rightarrow\\\\; 3\\\\times3\\\\times3\\\\times3$\` --> CORRECT: \`<math><msup><mn>3</mn><mn>4</mn></msup><mo>→</mo><mn>3</mn><mo>×</mo><mn>3</mn><mo>×</mo><mn>3</mn><mo>×</mo><mn>3</mn></math>\`
WRONG: \`\\\\(\\\\sqrt{121}=11\\\\)\` --> CORRECT: \`<math><msqrt><mn>121</mn></msqrt><mo>=</mo><mn>11</mn></math>\`
WRONG: \`$\\\\begin{align}2\\\\times11&\\\\stackrel{?}=211\\\\\\\\22&\\\\neq21...\` --> CORRECT: Convert to proper MathML table structure
WRONG: \`\\\\dfrac{Change in x}{Change in y}\` --> CORRECT: \`<mfrac><mtext>Change in x</mtext><mtext>Change in y</mtext></mfrac>\`
WRONG: \`\\\\(\\\\dfrac{19}{27}=0.\\\\overline{703}\\\\)\` --> CORRECT: \`<math><mfrac><mn>19</mn><mn>27</mn></mfrac><mo>=</mo><mn>0.</mn><mover><mn>703</mn><mo>‾</mo></mover></math>\`
WRONG: \`$\\\\dfrac{7^{36}}{9^{24}}$\` --> CORRECT: \`<math><mfrac><msup><mn>7</mn><mn>36</mn></msup><msup><mn>9</mn><mn>24</mn></msup></mfrac></math>\`

**2. LaTeX Dollar Sign Delimiters - BANNED:**
WRONG: \`$3(9p-12)$\` --> CORRECT: \`<math><mn>3</mn><mo>(</mo><mn>9</mn><mi>p</mi><mo>-</mo><mn>12</mn><mo>)</mo></math>\`
WRONG: \`$5, \\\\sqrt8, 33$\` --> CORRECT: \`<math><mn>5</mn></math>, <math><msqrt><mn>8</mn></msqrt></math>, <math><mn>33</mn></math>\`
WRONG: \`paid $<math>\` (bare dollar) --> CORRECT: \`paid <span class="currency">$</span><math>\` (properly tagged currency)
WRONG: \`<mo>$</mo><mn>12</mn>\` --> CORRECT: For currency use \`<span class="currency">$</span><math><mn>12</mn></math>\`
ACCEPTABLE: \`<span class="currency">$</span><math xmlns="..."><mn>2.00</mn></math>\` (properly tagged currency symbol)

**3. Deprecated <mfenced> - ALL BANNED:**
WRONG: \`<mfenced open="|" close="|"><mrow><mo>-</mo><mn>6</mn></mrow></mfenced>\`
CORRECT: \`<mrow><mo>|</mo><mrow><mo>-</mo><mn>6</mn></mrow><mo>|</mo></mrow>\`

WRONG: \`<mfenced open="(" close=")"><mrow><mo>-</mo><mfrac>...</mfrac></mrow></mfenced>\`
CORRECT: \`<mrow><mo>(</mo><mrow><mo>-</mo><mfrac>...</mfrac></mrow><mo>)</mo></mrow>\`

WRONG: \`<mfenced open="[" close="]"><mi>x</mi></mfenced>\`
CORRECT: \`<mrow><mo>[</mo><mi>x</mi><mo>]</mo></mrow>\`

WRONG: \`<mfenced open="{" close="}"><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mn>3</mn></mfenced>\`
CORRECT: \`<mrow><mo>{</mo><mn>1</mn><mo>,</mo><mn>2</mn><mo>,</mo><mn>3</mn><mo>}</mo></mrow>\`

WRONG: \`<mfenced><mi>a</mi><mo>+</mo><mi>b</mi></mfenced>\` (default parentheses)
CORRECT: \`<mrow><mo>(</mo><mi>a</mi><mo>+</mo><mi>b</mi><mo>)</mo></mrow>\`

**General Rule for mfenced:** Replace \`<mfenced open="X" close="Y">content</mfenced>\` with \`<mrow><mo>X</mo>content<mo>Y</mo></mrow>\`

**4. QTI Content Model Violations - ALL BANNED:**

**Body Content Must Be Wrapped in Block-Level Elements:**
WRONG: \`body: 'This table gives select values of the differentiable function <math>...</math>.<slot name="h_table" />'\`
CORRECT: \`body: '<p>This table gives select values of the differentiable function <math>...</math>.</p><slot name="h_table" />'\`

WRONG: \`body: 'The lengths of 4 pencils were measured. The lengths are <math><mn>11</mn></math> cm...'\`
CORRECT: \`body: '<p>The lengths of 4 pencils were measured. The lengths are <math><mn>11</mn></math> cm...</p>'\`

WRONG: \`body: 'Select the correct answer from the choices below.<slot name="choice_interaction" />'\`
CORRECT: \`body: '<p>Select the correct answer from the choices below.</p><slot name="choice_interaction" />'\`

WRONG: \`body: 'Use the table to answer the question.<slot name="table_widget" /><slot name="interaction_1" />'\`
CORRECT: \`body: '<p>Use the table to answer the question.</p><slot name="table_widget" /><slot name="interaction_1" />'\`

**CRITICAL: Text Entry Interaction Placement - INLINE ELEMENTS ONLY:**
WRONG: \`body: '<p>Evaluate.</p><math>...</math><slot name="text_entry" />'\`
CORRECT: \`body: '<p>Evaluate. <math>...</math> <slot name="text_entry" /></p>'\`

WRONG: \`body: '<p>The answer is</p><slot name="text_entry_interaction" />'\`
CORRECT: \`body: '<p>The answer is <slot name="text_entry_interaction" /></p>'\`

WRONG: \`body: '<p>Question text</p><slot name="inline_choice" />'\` (floating outside text context)
CORRECT: \`body: '<p>Question text <slot name="inline_choice" /></p>'\` (inside text context)

**Text Entry Interaction Rule:** Text entry interactions (textEntryInteraction, inlineChoiceInteraction) are INLINE elements and MUST be placed inside text containers like \`<p>\` or \`<span>\`. They CANNOT be placed directly in the body or adjacent to block elements without proper wrapping.

**General Rule:** ALL text content in the body must be wrapped in block-level elements like \`<p>\` or \`<div>\`. Raw text at the start of body is FORBIDDEN. Text entry interactions must be INSIDE inline contexts, not floating between block elements.

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY backslash character followed by letters (LaTeX commands)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY raw text at the start of body content (must be wrapped in block-level elements)
Double-check your output before submitting. ZERO TOLERANCE for these violations.`

	return { systemInstruction, userContent }
}

/**
 * SHOT 2: Creates the prompt for mapping widget slots to widget types.
 */
export function createWidgetMappingPrompt(perseusJson: string, assessmentBody: string, slotNames: string[]) {
	const systemInstruction = `You are an expert in educational content and QTI standards. Your task is to analyze an assessment item's body content and the original Perseus JSON to map widget slots to the most appropriate widget type from a given list.

**CRITICAL RULE**: If you analyze the Perseus JSON for a given slot and determine that NONE of the available widget types are a perfect match, you MUST use the type "WIDGET_NOT_FOUND". This is a bailout signal that the content cannot be migrated. Use this option if the widget cannot be perfectly represented by any of the available types.

**SPECIAL WIDGET GUIDANCE**:
- Use "emojiImage" for generic image widgets that display simple objects (trucks, horses, cookies, etc.) that can be represented as emojis
- The "emojiImage" widget is versatile and can replace many Perseus image widgets by using appropriate emoji representations

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
- All MathML must be perfectly preserved.

⚠️ ABSOLUTELY BANNED CONTENT - ZERO TOLERANCE ⚠️
The following are CATEGORICALLY FORBIDDEN in ANY part of your output:

1. **NO LATEX COMMANDS** - ANY backslash followed by letters is FORBIDDEN:
   - NO: \\sqrt, \\dfrac, \\frac, \\(, \\), \\blueD, \\text, etc.
   - If you output ANY LaTeX command, you have FAILED.

2. **NO LATEX DOLLAR SIGNS** - The $ character for LaTeX is BANNED:
   - NO math delimiters: $x$, $$y$$
   - Dollar signs for currency are allowed when properly tagged: \`<span class="currency">$</span>\`
   - LaTeX dollar delimiters mean COMPLETE FAILURE.

3. **NO DEPRECATED MATHML** - NEVER use:
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)`

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
}

## NEGATIVE EXAMPLES FROM REAL ERRORS (DO NOT OUTPUT THESE)

**LaTeX Commands BANNED:**
WRONG: \`\\\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\\\(\` or \`\\\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Signs BANNED:**
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<math display="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <span class="currency">$</span><mn>5</mn>\` (properly tagged currency)

**Deprecated MathML BANNED:**
WRONG: \`<mfenced open="|" close="|"><mi>x</mi></mfenced>\` --> CORRECT: \`<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>\`
WRONG: \`<mfenced open="(" close=")">content</mfenced>\` --> CORRECT: \`<mrow><mo>(</mo>content<mo>)</mo></mrow>\`

**QTI Content Model Violations:**

**Prompt Fields Must NOT Contain Block-Level Elements:**
WRONG: \`prompt: '<p>Select the double number line that shows the other values of distance and elevation.</p>'\`
CORRECT: \`prompt: 'Select the double number line that shows the other values of distance and elevation.'\`

WRONG: \`prompt: '<p>Arrange the cards to make a true comparison.</p>'\`
CORRECT: \`prompt: 'Arrange the cards to make a true comparison.'\`

WRONG: \`prompt: '<p>Choose the inequality that represents the graph.</p>'\`
CORRECT: \`prompt: 'Choose the inequality that represents the graph.'\`

WRONG: \`prompt: '<p>What is the value of the function at each point?</p>'\`
CORRECT: \`prompt: 'What is the value of the function at each point?'\`

WRONG: \`prompt: '<p>Find the area of the shaded region.</p>'\`
CORRECT: \`prompt: 'Find the area of the shaded region.'\`

WRONG: \`prompt: '<p>How many apples are there in total?</p>'\`
CORRECT: \`prompt: 'How many apples are there in total?'\`

**General Rule for Prompts:** Prompt fields in interactions can ONLY contain inline content. NO block-level elements like \`<p>\`, \`<div>\`, \`<h1>\`, etc. are allowed.

**Choice Content - DEPENDS ON INTERACTION TYPE:**

**For Standard Choice Interactions (choiceInteraction, orderInteraction):**
WRONG: \`{ identifier: "A", content: "above" }\` (raw text)
CORRECT: \`{ identifier: "A", content: "<p>above</p>" }\` (needs block wrapper)

**For Inline Choice Interactions (inlineChoiceInteraction):**
WRONG: \`{ identifier: "ABOVE", content: "<p>above</p>" }\` (block element in inline context)
CORRECT: \`{ identifier: "ABOVE", content: "above" }\` (inline text only)

**Choice Feedback - ALWAYS INLINE ONLY:**
WRONG: \`feedback: '<p>Correct! This rectangle has...</p>'\` (block element in inline context)
CORRECT: \`feedback: 'Correct! This rectangle has...'\` (inline text only)

WRONG: \`feedback: '<p>Incorrect. Try again.</p>'\`
CORRECT: \`feedback: 'Incorrect. Try again.'\`

**Critical Rules:**
- **Standard choice interactions** (choiceInteraction, orderInteraction): Choice content MUST be wrapped in block elements like \`<p>\`
- **Inline choice interactions** (inlineChoiceInteraction): Choice content MUST be inline text only (no \`<p>\` tags)
- **ALL choice feedback**: MUST be inline text only (no \`<p>\` tags) regardless of interaction type

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY LaTeX commands (backslash followed by letters)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)
Double-check EVERY string in your output. ZERO TOLERANCE.`

	return { systemInstruction, userContent }
}

/**
 * SHOT 4: Creates a prompt for generating only widget content.
 */
export function createWidgetContentPrompt(
	perseusJson: string,
	assessmentShell: unknown,
	widgetMapping: Record<string, keyof typeof typedSchemas>,
	generatedInteractions: Record<string, AnyInteraction>,
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
- All widget properties must conform to their respective schemas.

⚠️ ABSOLUTELY BANNED CONTENT - ZERO TOLERANCE ⚠️
The following are CATEGORICALLY FORBIDDEN in ANY part of your output:

1. **NO LATEX COMMANDS** - ANY backslash followed by letters is FORBIDDEN:
   - NO: \\sqrt, \\dfrac, \\frac, \\(, \\), \\blueD, \\text, etc.
   - If you output ANY LaTeX command, you have FAILED.

2. **NO LATEX DOLLAR SIGNS** - The $ character for LaTeX is BANNED:
   - NO math delimiters: $x$, $$y$$
   - Dollar signs for currency are allowed when properly tagged: \`<span class="currency">$</span>\`
   - LaTeX dollar delimiters mean COMPLETE FAILURE.

3. **NO DEPRECATED MATHML** - NEVER use:
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)`

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

## Interaction Content (for context):
This is the full content of the interaction(s) in the item. Use this to understand the question being asked, which is essential for creating correct widget data (e.g., correct tick marks on a number line for a choice).
\`\`\`json
${JSON.stringify(generatedInteractions, null, 2)}
\`\`\`

## Widget Mapping:
This mapping tells you the required output type for each widget.
\`\`\`json
${JSON.stringify(widgetMapping, null, 2)}
\`\`\`

## Instructions:
- **Analyze Images**: Use the raster images provided to your vision and the raw SVG content above to understand the visual components of widgets.
- For each entry in the widget mapping, generate a fully-formed widget object of the specified type.
- **Use Interaction Context**: You MUST use the "Interaction Content" object to understand the full question. This context is critical for generating correct data for widgets that appear within choices. For example, the interaction's prompt will tell you what the correct values on a number line widget should be.
- Extract all relevant data from the Perseus JSON to populate the widget properties.
- Ensure all required properties for each widget type are included.
- Return ONLY a JSON object with widget slot names as keys and widget objects as values.

Example output structure:
{
  "widget_1": { "type": "doubleNumberLine", "width": 400, ... },
  "table_1": { "type": "dataTable", "columns": [...], ... }
}

## NEGATIVE EXAMPLES FROM REAL ERRORS (DO NOT OUTPUT THESE)

**LaTeX Commands BANNED:**
WRONG: \`\\\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\\\(\` or \`\\\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Signs BANNED:**
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<math display="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <span class="currency">$</span><mn>5</mn>\` (properly tagged currency)

**Deprecated MathML BANNED:**
WRONG: \`<mfenced open="|" close="|"><mi>x</mi></mfenced>\` --> CORRECT: \`<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>\`
WRONG: \`<mfenced open="(" close=")">content</mfenced>\` --> CORRECT: \`<mrow><mo>(</mo>content<mo>)</mo></mrow>\`

**QTI Content Model Violations:**

**Prompt Fields Must NOT Contain Block-Level Elements:**
WRONG: \`prompt: '<p>Select the double number line that shows the other values of distance and elevation.</p>'\`
CORRECT: \`prompt: 'Select the double number line that shows the other values of distance and elevation.'\`

WRONG: \`prompt: '<p>Arrange the cards to make a true comparison.</p>'\`
CORRECT: \`prompt: 'Arrange the cards to make a true comparison.'\`

WRONG: \`prompt: '<p>Choose the inequality that represents the graph.</p>'\`
CORRECT: \`prompt: 'Choose the inequality that represents the graph.'\`

WRONG: \`prompt: '<p>What is the value of the function at each point?</p>'\`
CORRECT: \`prompt: 'What is the value of the function at each point?'\`

WRONG: \`prompt: '<p>Find the area of the shaded region.</p>'\`
CORRECT: \`prompt: 'Find the area of the shaded region.'\`

WRONG: \`prompt: '<p>How many apples are there in total?</p>'\`
CORRECT: \`prompt: 'How many apples are there in total?'\`

**General Rule for Prompts:** Prompt fields in interactions can ONLY contain inline content. NO block-level elements like \`<p>\`, \`<div>\`, \`<h1>\`, etc. are allowed.

**Choice Content - DEPENDS ON INTERACTION TYPE:**

**For Standard Choice Interactions (choiceInteraction, orderInteraction):**
WRONG: \`{ identifier: "A", content: "above" }\` (raw text)
CORRECT: \`{ identifier: "A", content: "<p>above</p>" }\` (needs block wrapper)

**For Inline Choice Interactions (inlineChoiceInteraction):**
WRONG: \`{ identifier: "ABOVE", content: "<p>above</p>" }\` (block element in inline context)
CORRECT: \`{ identifier: "ABOVE", content: "above" }\` (inline text only)

**Choice Feedback - ALWAYS INLINE ONLY:**
WRONG: \`feedback: '<p>Correct! This rectangle has...</p>'\` (block element in inline context)
CORRECT: \`feedback: 'Correct! This rectangle has...'\` (inline text only)

WRONG: \`feedback: '<p>Incorrect. Try again.</p>'\`
CORRECT: \`feedback: 'Incorrect. Try again.'\`

**Critical Rules:**
- **Standard choice interactions** (choiceInteraction, orderInteraction): Choice content MUST be wrapped in block elements like \`<p>\`
- **Inline choice interactions** (inlineChoiceInteraction): Choice content MUST be inline text only (no \`<p>\` tags)
- **ALL choice feedback**: MUST be inline text only (no \`<p>\` tags) regardless of interaction type

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY LaTeX commands (backslash followed by letters)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)
Double-check EVERY string in your output. ZERO TOLERANCE.`

	return { systemInstruction, userContent }
}
