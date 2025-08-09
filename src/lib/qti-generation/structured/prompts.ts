import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { allExamples } from "@/lib/qti-generation/examples"
import { type AnyInteraction, AssessmentItemShellSchema } from "@/lib/qti-generation/schemas"
import { type WidgetCollectionName, widgetCollections } from "@/lib/widget-collections"
import { allWidgetSchemas } from "@/lib/widgets/generators"
import type { ImageContext } from "./perseus-image-resolver"

// Helper to convert a full AssessmentItemInput into a shell for prompt examples
function createShellFromExample(item: (typeof allExamples)[0]) {
	const shell = {
		...item,
		widgets: item.widgets ? Object.keys(item.widgets) : [],
		interactions: item.interactions ? Object.keys(item.interactions) : []
	}
	// Validate against the shell schema before returning
	// Use safeParse to avoid throwing and to align with error handling policy
	const result = AssessmentItemShellSchema.safeParse(shell)
	if (!result.success) {
		// If an example shell fails validation, something is wrong with our example data
		// Log the issue and throw an error instead of using type assertion
		throw errors.new(`Example shell validation failed: ${result.error.message}`)
	}
	return result.data
}

// Define a strict widget type key list (no bailouts)
type WidgetTypeKey = keyof typeof allWidgetSchemas

const widgetTypeKeys: [WidgetTypeKey, ...WidgetTypeKey[]] = [
	"threeDIntersectionDiagram",
	"absoluteValueNumberLine",
	"angleDiagram",
	"barChart",
	"boxGrid",
	"boxPlot",
	"circleDiagram",
	"compositeShapeDiagram",
	"coordinatePlane",
	"distanceFormulaGraph",
	"functionPlotGraph",
	"lineEquationGraph",

	"pointPlotGraph",
	"polygonGraph",
	"shapeTransformationGraph",
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
	"rectangularFrameDiagram",
	"scaleCopiesSlider",
	"scatterPlot",
	"stackedItemsDiagram",
	"tapeDiagram",
	"transformationDiagram",
	"treeDiagram",
	"triangleDiagram",
	"unitBlockDiagram",
	"urlImage",
	"vennDiagram",
	"verticalArithmeticSetup",
	"parallelogramTrapezoidDiagram"
]

// DEPRECATED: This is now moved inside createWidgetMappingPrompt to be dynamic
// Build a machine-generated list of widget type names and their top-level descriptions from schemas
function buildWidgetTypeDescriptions(): string {
	const parts: string[] = []
	for (const typeName of widgetTypeKeys) {
		const schema = allWidgetSchemas[typeName]
		// Zod stores the description on the schema definition
		const rawDescription = schema._def.description
		const safeDescription =
			typeof rawDescription === "string" && rawDescription.trim() !== ""
				? rawDescription.trim()
				: "no description available"
		parts.push(`- ${typeName}: ${safeDescription}`)
	}
	// Sort for stable output
	parts.sort((a, b) => a.localeCompare(b))
	return parts.join("\n")
}

function createWidgetMappingSchema(slotNames: string[], allowedWidgetKeys: readonly string[]) {
	const shape: Record<string, z.ZodType<string>> = {}
	for (const slotName of slotNames) {
		// Use z.string() with refinement to validate allowed values
		shape[slotName] = z.string().refine((val) => allowedWidgetKeys.includes(val), {
			message: `Must be one of: ${allowedWidgetKeys.join(", ")}`
		})
	}
	return z.object({
		widget_mapping: z
			.object(shape)
			.describe("A JSON object mapping each widget slot name to one of the allowed widget types.")
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
	const systemInstruction = `You are an expert in educational content conversion. Your task is to analyze a Perseus JSON object and create a structured assessment shell in JSON format. Your primary goal is to accurately represent all content using a strict, nested object model.

**CRITICAL: STRUCTURED CONTENT MODEL**
Your entire output for any rich text field (like 'body' or 'feedback') MUST be a JSON array of block-level items.
- **Block Items**: Can be a paragraph \`{ "type": "paragraph", "content": [...] }\` or a slot \`{ "type": "blockSlot", "slotId": "..." }\`.
- **Paragraph Content**: The 'content' array inside a paragraph consists of inline items.
- **Inline Items**: Can be text \`{ "type": "text", "content": "..." }\`, math \`{ "type": "math", "mathml": "..." }\`, or an inline slot \`{ "type": "inlineSlot", "slotId": "..." }\`.

This structure is non-negotiable. You are FORBIDDEN from outputting raw HTML strings for content fields.

The shell should:
1. Convert Perseus content into a structured 'body' field as a JSON array of block-level items.
2. List all widget and interaction identifiers as arrays of strings in the 'widgets' and 'interactions' properties.
3. Faithfully translate all mathematical content from LaTeX to MathML within the structured content.
4. NEVER generate <img> or <svg> tags in the body - all visual elements must be widget slots.

**Example of a structured body:**
\`\`\`json
"body": [
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "content": "Evaluate " },
      { "type": "math", "mathml": "msup><mi>x</mi><mn>2</mn></msup>" },
      { "type": "inlineSlot", "slotId": "text_entry_1" }
    ]
  },
  { "type": "blockSlot", "slotId": "some_graph_widget" }
]
\`\`\`

CRITICAL CLASSIFICATION RULE:
- WIDGETS are COMPLETELY STATIC (images, graphs) - NO user input
- INTERACTIONS require USER INPUT (typing, clicking, selecting) - ALL input elements MUST be interactions
- EXCEPTION: TABLES ARE ALWAYS WIDGETS - Even if they contain input fields, tables MUST be widgets
Perseus misleadingly calls both types "widgets" - you MUST reclassify based on whether user input is required, EXCEPT tables which are ALWAYS widgets.

ABSOLUTE REQUIREMENT: SLOT CONSISTENCY.
This is the most critical rule. Any slot you include in the 'body' MUST have its slotId listed in either the 'widgets' array or the 'interactions' array. Conversely, every name in the 'widgets' and 'interactions' arrays MUST correspond to a slot in the 'body'. There must be a perfect, one-to-one mapping.

CRITICAL: Never embed images or SVGs directly. The body must contain ONLY text, MathML, and slot placeholders.
\nCRITICAL: All content must be XML-safe. Do not use CDATA sections and do not include invalid XML control characters.

**CRITICAL: NO ANSWERS OR HINTS IN 'BODY', WIDGETS, OR INTERACTIONS.**
- The 'body' MUST NEVER contain the correct answer, partial answers, worked solutions, or any text that gives away the answer.
- WIDGETS MUST NEVER label, highlight, or otherwise indicate the correct answer. This includes diagram labels, highlighted values, or any visual cues that reveal the answer.
- Strip and ignore ALL Perseus 'hints' fields. NEVER include hints in any form in the 'body' (no text, MathML, paraphrases, or reworded guidance).
- Do NOT include hint-like lead-ins such as "Hint:", "Remember:", "Think about...", or statements that restate or imply the answer (e.g., "the constant is 7").
- **ABSOLUTE RULE**: The ONLY places the correct answer may appear are:
  1. Response declarations (for validation)
  2. Feedback fields - SPECIFICALLY:
     - The 'feedback' object at the assessment level (correct/incorrect arrays)
     - Individual choice 'feedback' within interactions
     - NO OTHER LOCATION
- **HARD STOP. NO EXCEPTIONS.** Answers are FORBIDDEN in body, widgets, or interactions. They are ONLY allowed in the designated feedback fields above.

**CRITICAL: NO EXPLANATION WIDGETS.**
NEVER create a widget for explanatory text. Explanations or definitions found in the Perseus JSON (especially those of type 'explanation' or 'definition') must be embedded directly within the 'body' content as paragraph blocks. The 'explanation' and 'definition' widget types are BANNED. Hints are EXPLICITLY FORBIDDEN and MUST be stripped entirely.

**CRITICAL: NO CURRENCY SLOTS - STRICT MATHML ENFORCEMENT.**
Currency symbols and amounts MUST NOT be represented as slots (widget or interaction). Do not generate any slotId that indicates currency (for example, names containing "currency" or ending with "_feedback"). 

**MANDATORY CURRENCY/PERCENT MATHML CONVERSION:**
- Currency: Use <mo>$</mo><mn>amount</mn> in MathML, NOT raw text like "$5"
- Percentages: Use <mn>number</mn><mo>%</mo> in MathML, NOT raw text like "50%"
- Example: Convert "$5.50" to <math><mo>$</mo><mn>5.50</mn></math>
- Example: Convert "75%" to <math><mn>75</mn><mo>%</mo></math>
- NEVER use raw text currency/percent symbols outside MathML tags

⚠️ ABSOLUTELY BANNED CONTENT - ZERO TOLERANCE ⚠️
The following are CATEGORICALLY FORBIDDEN in the output. ANY violation will result in IMMEDIATE REJECTION:

1. **LATEX COMMANDS ARE BANNED** - Under NO circumstances may ANY LaTeX command appear in the output:
   - NO backslash commands: \\sqrt, \\dfrac, \\sum, \\int, etc.
   - NO LaTeX delimiters: \\(, \\), \\[, \\], \\begin, \\end
   - NO color commands: \\blueD, \\maroonD, \\redE, \\greenC, etc.
   - NO text commands: \\text, \\textbf, \\textit, etc.
   - If you see ANY backslash followed by letters, you have FAILED.

2. **LATEX DOLLAR SIGN DELIMITERS ARE BANNED** - The $ character when used for LaTeX is FORBIDDEN:
   - NO inline math delimiters: $x + y$ (convert to \`<math>...</math>\`)
   - NO display math delimiters: $$x + y$$ (convert to \`<math display="block">...</math>\`)
   - Dollar signs for currency are ALLOWED when properly tagged: \`<span class="currency">$</span>\`
   - Remove $ when it's used as a LaTeX delimiter, but preserve it when it's properly marked as currency.

3. **DEPRECATED MATHML IS BANNED** - The following MathML elements are OBSOLETE and FORBIDDEN:
   - NO <mfenced> elements - use <mrow> with explicit <mo> delimiters instead
   - NO deprecated attributes or elements
\n4. **NO CDATA SECTIONS** - Never use \`<![CDATA[ ... ]]>\`. All content must be properly XML-encoded within elements.
\n5. **NO INVALID XML CHARACTERS** - Do not include control characters or non-characters:
   - Disallowed: U+0000–U+001F (except TAB U+0009, LF U+000A, CR U+000D), U+FFFE, U+FFFF, and unpaired surrogates.

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
- **\`body\` Field**: Create a 'body' field containing the main content as a structured JSON array (not an HTML string).
  - **ONLY REFERENCED WIDGETS (WITH CHOICE-LEVEL EXCEPTION)**: CRITICAL RULE - Only include widgets/interactions that are explicitly referenced in the Perseus content string via \`[[☃ widget_name]]\` placeholders. Perseus JSON may contain many widget definitions, but you MUST ignore any that aren't actually used in the content.
    - **Exception for visuals inside interaction choices (radio/order/inlineChoice)**: When the original Perseus JSON encodes visuals (e.g., Graphie images, number lines, diagrams) inside interaction choice content, you MUST predeclare widget slots for those visuals even if there is no corresponding \`[[☃ ...]]\` placeholder in the top-level body.
    - Do NOT render these per-choice visuals in the shell body. Simply reserve their widget slot identifiers in the \`widgets\` array for later use by the interaction content shot.
  - **Placeholders**:
  - For ALL Perseus widgets (including 'image' widgets), create a { "type": "blockSlot", "slotId": "..." } placeholder in the 'body' and add its identifier to the 'widgets' string array.
  - For inline interactions (e.g., 'text-input', 'inline-choice'), create { "type": "inlineSlot", "slotId": "..." } inside paragraph content.
  - For block interactions (e.g., 'radio', 'order'), create { "type": "blockSlot", "slotId": "..." } in the body array.
  - **NEVER EMBED IMAGES OR SVGs**: You MUST NOT generate \`<img>\` tags, \`<svg>\` tags, or data URIs in the 'body' string. This is a critical requirement. ALL images and visual elements must be handled as widgets referenced by slots. If you see an image in Perseus, create a widget slot for it, never embed it directly.
  - **NO ANSWERS OR HINTS IN 'BODY'**: Do NOT reveal or restate the correct answer anywhere in the 'body'. Remove ALL Perseus 'hints' content entirely and NEVER include hint-like guidance (e.g., lines starting with "Hint:" or text that gives away the answer). Only the prompt and neutral problem context belong in the 'body'; answers live solely in response declarations.
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
  - **CURRENCY/PERCENT HANDLING (UPDATED REQUIREMENTS)**:
    * Currency: MUST use MathML <mo>$</mo><mn>amount</mn> pattern, NOT <span class="currency">
    * Percentages: MUST use MathML <mn>number</mn><mo>%</mo> pattern
    * CORRECT: <math><mo>$</mo><mn>12.50</mn></math> and <math><mn>85</mn><mo>%</mo></math>
    * WRONG: <span class="currency">$</span><mn>12.50</mn> or raw text "$12.50" or "85%"
    * Raw text currency/percent symbols are BANNED
  - Do NOT create slots for currency. Never generate slotIds like "currency7" or "currency7_feedback".
- **Table Rule (MANDATORY)**:
  - Tables must NEVER be created as HTML \`<table>\` elements in the body.
  - ALWAYS create a widget slot for every table (e.g., \`<slot name="table_widget_1" />\`) and add "table_widget_1" to the 'widgets' array.
- **Response Declarations**:
  - The 'question.answers' from Perseus must be used to create the \`responseDeclarations\`.
  - **Numeric Answers Rule**: For text entry interactions, if the correct answer is a decimal that can be represented as a simple fraction (e.g., 0.5, 0.25), the 'correct' value in the response declaration should be a string representing that fraction (e.g., "1/2", "1/4"). This is to avoid forcing students to type decimals.
  - **Cardinality Selection Rule**: 
    * Use "single" for most choice interactions (select one answer)
    * Use "multiple" for interactions allowing multiple selections
    * Use "ordered" ONLY when the sequence of choices matters (e.g., ranking, arranging steps)
    * For ordering/sequencing tasks, ALWAYS use cardinality "ordered" to enable proper sequence validation
- **Metadata**: Include all required assessment metadata: 'identifier', 'title', 'responseDeclarations', and 'feedback'.
- **Widget Generation**: When you generate the final widget objects in a later step, ensure all image references are properly resolved.

Return ONLY the JSON object for the assessment shell.

## NEGATIVE EXAMPLES FROM REAL ERRORS (DO NOT OUTPUT THESE)

**1. Invalid Content Structure:**

**WRONG (Raw string in 'body'):**
\`\`\`json
"body": "<p>Some text</p>"
\`\`\`
**CORRECT (Structured content):**
\`\`\`json
"body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Some text" }] }]
\`\`\`

**WRONG (Text not wrapped in a paragraph at the block level):**
\`\`\`json
"body": [{ "type": "text", "content": "This is invalid." }]
\`\`\`
**CORRECT (Text is inside a paragraph's content array):**
\`\`\`json
"body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "This is valid." }] }]
\`\`\`

**2. Incorrect Slot Placement:**

**WRONG (Inline slot used at the block level):**
\`\`\`json
"body": [
  { "type": "paragraph", "content": [{ "type": "text", "content": "Enter your answer: " }] },
  { "type": "inlineSlot", "slotId": "text_entry_1" }
]
\`\`\`
**CORRECT (Inline slot is INSIDE a paragraph's content):**
\`\`\`json
"body": [
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "content": "Enter your answer: " },
      { "type": "inlineSlot", "slotId": "text_entry_1" }
    ]
  }
]
\`\`\`

**WRONG (Block slot used inside a paragraph):**
\`\`\`json
"body": [
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "content": "Here is a graph: " },
      { "type": "blockSlot", "slotId": "graph_widget_1" }
    ]
  }
]
\`\`\`
**CORRECT (Block slot is a top-level item in the 'body' array):**
\`\`\`json
"body": [
  { "type": "paragraph", "content": [{ "type": "text", "content": "Here is a graph: " }] },
  { "type": "blockSlot", "slotId": "graph_widget_1" }
]
\`\`\`

**Currency Represented as Slots (BANNED):**

**WRONG (currency as a slot in body):**
\`\`\`json
"body": [
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "content": "The price is " },
      { "type": "inlineSlot", "slotId": "currency7" }
    ]
  }
],
"widgets": ["currency7"],
"interactions": []
\`\`\`

**WRONG (currency slot in feedback):**
\`\`\`json
"feedback": {
  "correct": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "You saved " },
        { "type": "inlineSlot", "slotId": "currency7_feedback" }
      ]
    }
  ],
  "incorrect": []
}
\`\`\`

**CORRECT (inline currency, no slots):**
\`\`\`json
"body": [
  {
    "type": "paragraph",
    "content": [
      { "type": "text", "content": "The price is " },
      { "type": "text", "content": "$" },
      { "type": "math", "mathml": "<mn>7</mn>" }
    ]
  }
],
"widgets": [],
"interactions": []
\`\`\`

**3. Banned Content (LaTeX, Deprecated MathML):**

**WRONG (LaTeX in text content):**
\`\`\`json
{ "type": "text", "content": "The value is $$\\sqrt{x}$$" }
\`\`\`
**CORRECT (MathML in a math object):**
\`\`\`json
{ "type": "math", "mathml": "<msqrt><mi>x</mi></msqrt>" }
\`\`\`

**LaTeX Commands - ALL BANNED:**
WRONG: \`<mi>\\sqrt{a}</mi>\` --> CORRECT: \`<msqrt><mi>a</mi></msqrt>\`
WRONG: \`\\(\\dfrac{3}{10}\\)\` --> CORRECT: \`<math><mfrac><mn>3</mn><mn>10</mn></mfrac></math>\`
WRONG: \`\\(n = \\dfrac{96}{5}\\)\` --> CORRECT: \`<math><mi>n</mi><mo>=</mo><mfrac><mn>96</mn><mn>5</mn></mfrac></math>\`
WRONG: \`\\blueD{x=2} and \\maroonD{y=4}\` --> CORRECT: \`<mi>x</mi><mo>=</mo><mn>2</mn> and <mi>y</mi><mo>=</mo><mn>4</mn>\`
WRONG: \`\\(\\tfrac{4}{3}\\)\` --> CORRECT: \`<math><mfrac><mn>4</mn><mn>3</mn></mfrac></math>\`
WRONG: \`$\\green{\\text{Step }1}$\` --> CORRECT: \`Step 1\`
WRONG: \`$3^4 \\;\\rightarrow\\; 3\\times3\\times3\\times3$\` --> CORRECT: \`<math><msup><mn>3</mn><mn>4</mn></msup><mo>→</mo><mn>3</mn><mo>×</mo><mn>3</mn><mo>×</mo><mn>3</mn><mo>×</mo><mn>3</mn></math>\`
WRONG: \`\\(\\sqrt{121}=11\\)\` --> CORRECT: \`<math><msqrt><mn>121</mn></msqrt><mo>=</mo><mn>11</mn></math>\`
WRONG: \`$\\begin{align}2\\times11&\\stackrel{?}=211\\\\22&\\neq21...\` --> CORRECT: Convert to proper MathML table structure
WRONG: \`\\dfrac{Change in x}{Change in y}\` --> CORRECT: \`<mfrac><mtext>Change in x</mtext><mtext>Change in y</mtext></mfrac>\`
WRONG: \`\\(\\dfrac{19}{27}=0.\\overline{703}\\)\` --> CORRECT: \`<math><mfrac><mn>19</mn><mn>27</mn></mfrac><mo>=</mo><mn>0.</mn><mover><mn>703</mn><mo>‾</mo></mover></math>\`

**CRITICAL: REPEATING DECIMAL OVERLINES**
- Repeating decimals MUST use <mover> with overline to show the repeating part
- WRONG: <mn>0.333...</mn> or text "0.3 repeating"
- CORRECT: <mn>0.</mn><mover><mn>3</mn><mo>‾</mo></mover>
- WRONG: <mn>2.6666</mn> (truncated)
- CORRECT: <mn>2.</mn><mover><mn>6</mn><mo>‾</mo></mover>
- For multi-digit repeating: <mn>0.</mn><mover><mn>142857</mn><mo>‾</mo></mover>
WRONG: \`$\\dfrac{7^{36}}{9^{24}}$\` --> CORRECT: \`<math><mfrac><msup><mn>7</mn><mn>36</mn></msup><msup><mn>9</mn><mn>24</mn></msup></mfrac></math>\`
WRONG: \`\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\(\` or \`\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Sign Delimiters - BANNED:**
WRONG: \`$3(9p-12)$\` --> CORRECT: \`<math><mn>3</mn><mo>(</mo><mn>9</mn><mi>p</mi><mo>-</mo><mn>12</mn><mo>)</mo></math>\`
WRONG: \`$5, \\sqrt8, 33$\` --> CORRECT: \`<math><mn>5</mn></math>, <math><msqrt><mn>8</mn></msqrt></math>, <math><mn>33</mn></math>\`
WRONG: \`paid $<math>\` (bare dollar) --> CORRECT: \`paid <math><mo>$</mo><mn>12</mn></math>\` (currency in MathML)
CORRECT: \`<math><mo>$</mo><mn>12</mn></math>\` (currency symbols go in MathML as operators)
WRONG: \`<span class="currency">$</span><mn>12</mn>\` --> CORRECT: \`<math><mo>$</mo><mn>12</mn></math>\`
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<mathdisplay="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <math><mo>$</mo><mn>5</mn></math>\` (currency in MathML)

**Deprecated <mfenced> - ALL BANNED:**
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

WRONG: \`<mfenced open="|" close="|"><mi>x</mi></mfenced>\` --> CORRECT: \`<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>\`
WRONG: \`<mfenced open="(" close=")">content</mfenced>\` --> CORRECT: \`<mrow><mo>(</mo>content<mo>)</mo></mrow>\`

**4. Explanation Widgets - BANNED:**
Perseus 'explanation' or 'definition' widgets MUST be inlined as text, not turned into slots.

**Perseus Input Snippet:**
\`\`\`json
{
  "content": "Some text... [[☃ explanation 1]]",
  "widgets": {
    "explanation 1": {
      "type": "explanation",
      "options": {
        "showPrompt": "Does this always work?",
        "explanation": "Yes, dividing by a fraction is always the same as multiplying by the reciprocal of the fraction."
      }
    }
  }
}
\`\`\`

**WRONG:**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Some text... " }, { "type": "blockSlot", "slotId": "explanation_1" }] }],
  "widgets": ["explanation_1"],
  ...
}
\`\`\`
**CORRECT:**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "Some text..." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "Does this always work?" }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "Yes, dividing by a fraction is always the same as multiplying by the reciprocal of the fraction." }] }
  ],
  "widgets": [], // No widget for the explanation
  ...
}
\`\`\`

**5. Widget vs. Interaction Misclassification - BANNED:**
Perseus often calls interactive elements "widgets". You MUST correctly reclassify them as **interactions**.

**CRITICAL DISTINCTION:**
- **WIDGETS are COMPLETELY STATIC** - they display information only (images, graphs, diagrams)
- **INTERACTIONS require USER INPUT** - ANY element that accepts user input MUST be an interaction
- **EXCEPTION: TABLES ARE ALWAYS WIDGETS** - Even if a table contains input fields, the TABLE itself is ALWAYS a widget

**ABSOLUTE RULE:** If a Perseus element requires ANY form of user input (typing, clicking, selecting, dragging, etc.), it MUST be placed in the \`interactions\` array, NOT the \`widgets\` array. 

**THE ONLY EXCEPTION: TABLES**
- Tables are ALWAYS widgets, regardless of content
- If a question requires entry IN a table, the table MUST remain a widget
- The table widget will handle its own internal input fields

**Perseus Input with \`numeric-input\`:**
\`\`\`json
"question": {
  "content": "Solve for x. [[☃ numeric-input 1]]",
  "widgets": {
    "numeric-input 1": { "type": "numeric-input", ... }
  }
}
\`\`\`

**WRONG Shell Output (Automatic Rejection):**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Solve for x. " }, { "type": "blockSlot", "slotId": "numeric-input-1" }] }],
  "widgets": ["numeric-input-1"],
  "interactions": []
}
\`\`\`

**CORRECT Shell Output:**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Solve for x. " }, { "type": "inlineSlot", "slotId": "text_entry_interaction_1" }] }],
  "widgets": [],
  "interactions": ["text_entry_interaction_1"]
}
\`\`\`
**Explanation:** \`numeric-input\`, \`input-number\`, and \`expression\` are ALWAYS interactions. They must be placed in the \`interactions\` array, not the \`widgets\` array.

**Perseus Input with \`expression\`:**
\`\`\`json
"question": {
  "content": "Write an equation. [[☃ expression 1]]",
  "widgets": {
    "expression 1": { "type": "expression", ... }
  }
}
\`\`\`
**WRONG Shell Output (Automatic Rejection):**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Write an equation. " }, { "type": "blockSlot", "slotId": "expression_1" }] }],
  "widgets": ["expression_1"],
  "interactions": []
}
\`\`\`
**CORRECT Shell Output:**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Write an equation. " }, { "type": "inlineSlot", "slotId": "text_entry_interaction_1" }] }],
  "widgets": [],
  "interactions": ["text_entry_interaction_1"]
}
\`\`\`

**Perseus Input with \`radio\`:**
\`\`\`json
"question": {
  "content": "Choose the best answer. [[☃ radio 1]]",
  "widgets": {
    "radio 1": { "type": "radio", ... }
  }
}
\`\`\`
**WRONG Shell Output (Automatic Rejection):**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Choose the best answer." }] }, { "type": "blockSlot", "slotId": "radio_1" }],
  "widgets": ["radio_1"],
  "interactions": []
}
\`\`\`
**CORRECT Shell Output:**
\`\`\`json
{
  "body": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Choose the best answer." }] }, { "type": "blockSlot", "slotId": "choice_interaction_1" }],
  "widgets": [],
  "interactions": ["choice_interaction_1"]
}
\`\`\`
**FINAL RULE:** 
- If a Perseus element requires ANY user input = **INTERACTION** (goes in \`interactions\` array)
- If a Perseus element is purely visual/static = **WIDGET** (goes in \`widgets\` array)
- **EXCEPTION: TABLES ARE ALWAYS WIDGETS** - Even tables with input fields

**Common Perseus elements that are ALWAYS INTERACTIONS (never widgets):**
- \`numeric-input\`, \`input-number\`, \`expression\` - text entry
- \`radio\`, \`dropdown\` - selection
- \`sorter\`, \`matcher\` - ordering/matching
- ANY element where the user types, clicks, selects, or manipulates = **INTERACTION**

**Common Perseus elements that are ALWAYS WIDGETS:**
- \`table\` - **ALWAYS a widget, even if it contains input fields**
- \`image\` - static images
- \`grapher\`, \`plotter\` - static graphs/plots
- \`passage\` - static text passages

**Remember:** Perseus misleadingly calls interactive elements "widgets" in its JSON. IGNORE THIS. Reclassify based on whether user input is required, EXCEPT for tables which are ALWAYS widgets.

**11. Unused Widgets in Perseus JSON - IGNORE THEM:**
Perseus JSON may contain widget definitions that are NOT actually used in the content. You MUST ONLY include widgets/interactions that are explicitly referenced in the Perseus content string via \`[[☃ widget_name]]\` placeholders.

**Perseus Input with unused widget:**
\`\`\`json
{
  "content": "Compare. $\\sqrt{13}$ [[☃ dropdown 1]] $\\dfrac{15}{4}$",
  "widgets": {
    "dropdown 1": {
      "type": "dropdown",
      "choices": [{"content": "<", "correct": true}, {"content": ">", "correct": false}, {"content": "=", "correct": false}]
    },
    "radio 1": {  // ⚠️ NOTE: This widget EXISTS but is NOT referenced in content
      "type": "radio",
      "choices": [{"content": "$A$", "correct": false}, {"content": "$B$", "correct": true}]
    }
  }
}
\`\`\`

**WRONG Shell Output (includes unused widget):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "Compare. " }, { "type": "math", "mathml": "<msqrt><mn>13</mn></msqrt>" }, { "type": "text", "content": " " }, { "type": "inlineSlot", "slotId": "comparison_dropdown" }, { "type": "text", "content": " " }, { "type": "math", "mathml": "<mfrac><mn>15</mn><mn>4</mn></mfrac>" }] },
    { "type": "blockSlot", "slotId": "choice_interaction_1" }  // ❌ BANNED: This radio widget was never referenced!
  ],
  "widgets": [],
  "interactions": ["comparison_dropdown", "choice_interaction_1"]  // ❌ WRONG: Extra interaction
}
\`\`\`

**CORRECT Shell Output (only referenced widgets):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "Compare." }] },
    { "type": "paragraph", "content": [{ "type": "math", "mathml": "<msqrt><mn>13</mn></msqrt>" }, { "type": "text", "content": " " }, { "type": "inlineSlot", "slotId": "comparison_dropdown" }, { "type": "text", "content": " " }, { "type": "math", "mathml": "<mfrac><mn>15</mn><mn>4</mn></mfrac>" }] }
  ],
  "widgets": [],
  "interactions": ["comparison_dropdown"]  // ✅ CORRECT: Only the dropdown that's actually used
}
\`\`\`

**Explanation:** The Perseus JSON contained both a dropdown widget (used in content) and a radio widget (not used). The wrong output created slots for BOTH widgets, adding an extra choice interaction that doesn't belong. The correct output ONLY includes the dropdown that's actually referenced via \`[[☃ dropdown 1]]\` in the content string.

**ABSOLUTE RULE:** Only create slots for widgets that appear as \`[[☃ widget_name]]\` in the Perseus content. Ignore all other widget definitions.

 **Perseus Input with \`table\` containing input:**
\`\`\`json
"question": {
  "content": "Fill in the table. [[☃ table 1]]",
  "widgets": {
    "table 1": { "type": "table", "headers": [...], "answers": [...] }
  }
}
\`\`\`
**CORRECT Shell Output (Table is ALWAYS a widget):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "Fill in the table." }] },
    { "type": "blockSlot", "slotId": "table_1" }
  ],
  "widgets": ["table_1"],
  "interactions": []
}
\`\`\`
**Explanation:** Tables are ALWAYS widgets, even when they contain input fields. The table widget handles its own internal input mechanism.

**Structured Content Model Requirements:**
**Body Content Must Use Structured JSON Arrays:**
WRONG: \`body: '<p>This table gives select values...</p><slot name="h_table" />'\` (HTML string)
CORRECT: \`body: [{ "type": "paragraph", "content": [{ "type": "text", "content": "This table gives select values..." }] }, { "type": "blockSlot", "slotId": "h_table" }]\`

WRONG: \`body: 'The lengths of 4 pencils were measured...'\` (raw text)
CORRECT: \`body: [{ "type": "paragraph", "content": [{ "type": "text", "content": "The lengths of 4 pencils were measured. The lengths are " }, { "type": "math", "mathml": "<mn>11</mn>" }, { "type": "text", "content": " cm..." }] }]\`

**CRITICAL: Inline Interaction Placement:**
WRONG: \`body: [{ "type": "paragraph", "content": [{ "type": "text", "content": "Evaluate." }] }, { "type": "blockSlot", "slotId": "text_entry" }]\` (text entry as block)
CORRECT: \`body: [{ "type": "paragraph", "content": [{ "type": "text", "content": "Evaluate. " }, { "type": "math", "mathml": "..." }, { "type": "text", "content": " " }, { "type": "inlineSlot", "slotId": "text_entry" }] }]\`

WRONG: \`body: [{ "type": "paragraph", "content": [{ "type": "text", "content": "The answer is" }] }, { "type": "inlineSlot", "slotId": "text_entry" }]\` (inline slot outside paragraph)
CORRECT: \`body: [{ "type": "paragraph", "content": [{ "type": "text", "content": "The answer is " }, { "type": "inlineSlot", "slotId": "text_entry" }] }]\`

**Inline vs Block Slots Rule:**
- Text entry and inline choice interactions use \`{ "type": "inlineSlot", "slotId": "..." }\` INSIDE paragraph content arrays
- Choice and order interactions use \`{ "type": "blockSlot", "slotId": "..." }\` in the main body array
- Widgets always use \`{ "type": "blockSlot", "slotId": "..." }\` in the main body array

**6. Hints and Answer Leakage in Body - BANNED:**
Hints and answer-revealing content must NEVER appear in the 'body' field.

**WRONG (Hints in body revealing answer):**
\`\`\`json
{
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "What is the constant of proportionality in the equation " },
        { "type": "math", "mathml": "<mi>y</mi><mo>=</mo><mn>7</mn><mi>x</mi>" },
        { "type": "text", "content": "?" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "constant of proportionality = " },
        { "type": "inlineSlot", "slotId": "text_entry" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Hint: If the constant of proportionality is " },
        { "type": "math", "mathml": "<mi>k</mi>" },
        { "type": "text", "content": ", then:" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "math", "mathml": "<mi>y</mi><mo>=</mo><mi>k</mi><mi>x</mi>" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "What number do we multiply by " },
        { "type": "math", "mathml": "<mi>x</mi>" },
        { "type": "text", "content": " to get " },
        { "type": "math", "mathml": "<mi>y</mi>" },
        { "type": "text", "content": "?" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Hint: The constant of proportionality is " },
        { "type": "math", "mathml": "<mn>7</mn>" },
        { "type": "text", "content": "." }
      ]
    }
  ]
}
\`\`\`

**CORRECT (Clean body, no hints, no answer leakage):**
\`\`\`json
{
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "What is the constant of proportionality in the equation " },
        { "type": "math", "mathml": "<mi>y</mi><mo>=</mo><mn>7</mn><mi>x</mi>" },
        { "type": "text", "content": "?" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "constant of proportionality = " },
        { "type": "inlineSlot", "slotId": "text_entry" }
      ]
    }
  ]
}
\`\`\`

**Explanation:** The wrong example contains multiple hint paragraphs that give away the answer (7) and provide step-by-step guidance. The correct version strips all hints and only presents the core question.

**7. Redundant Body and Interaction Prompt - BANNED:**
Never duplicate the same instructional text in both the body and interaction prompt. When an interaction has a clear prompt, the body can be empty.

**WRONG (Duplicate text in body and prompt):**
\`\`\`json
{
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Order the following numbers from least to greatest. Put the lowest number on the left." }
      ]
    },
    { "type": "blockSlot", "slotId": "order_interaction" }
  ],
  "interactions": {
    "order_interaction": {
      "type": "orderInteraction",
      "prompt": [
        { "type": "text", "content": "Order the following numbers from least to greatest. Put the lowest number on the left." }
      ],
      "choices": [...]
    }
  }
}
\`\`\`

**CORRECT (Empty body, instruction only in prompt):**
\`\`\`json
{
  "body": [
    { "type": "blockSlot", "slotId": "order_interaction" }
  ],
  "interactions": {
    "order_interaction": {
      "type": "orderInteraction",
      "prompt": [
        { "type": "text", "content": "Order the following numbers from least to greatest. Put the lowest number on the left." }
      ],
      "choices": [...]
    }
  }
}
\`\`\`

**Explanation:** The wrong example wastes space by repeating identical instructions. The correct version places the instruction only in the interaction prompt where it belongs, keeping the body minimal and focused.

**8. Poor Visual Separation - Cramped Layout - BANNED:**
Never place equations, answer prompts, and input fields all in the same paragraph. This creates visual confusion and poor readability.

**WRONG (Everything crammed in one paragraph):**
\`\`\`json
{
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Solve the equation. " },
        { "type": "math", "mathml": "<mn>20</mn><mo>=</mo><mi>r</mi><mo>+</mo><mn>11</mn>" },
        { "type": "text", "content": " r = " },
        { "type": "inlineSlot", "slotId": "text_entry" }
      ]
    }
  ]
}
\`\`\`

**CORRECT (Clear visual separation with multiple paragraphs):**
\`\`\`json
{
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Solve the equation." }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "math", "mathml": "<mn>20</mn><mo>=</mo><mi>r</mi><mo>+</mo><mn>11</mn>" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "r = " },
        { "type": "inlineSlot", "slotId": "text_entry" }
      ]
    }
  ]
}
\`\`\`

**Explanation:** The wrong example crams the instruction, equation, variable prompt, and input field all together, creating visual confusion. The correct version separates these elements into distinct paragraphs for better readability and clarity.

**9. Explanations, Strategies, Worked Solutions in Body - BANNED:**
All explanatory material (strategy, step-by-step algebra, graphical intuition, and final conclusions) MUST be placed in the 'feedback' section, NOT in the 'body'. The 'body' is ONLY for the neutral problem statement and slot placement.

**10. Answer Leakage in Widgets - BANNED:**
Widgets MUST NEVER display, label, or visually indicate the correct answer. This is a critical violation that defeats the purpose of the assessment.

**WRONG (Widget directly labels the answer):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "What is a name for the marked angle?" }] },
    { "type": "blockSlot", "slotId": "angle_diagram" },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ],
  "widgets": {
    "angle_diagram": {
      "type": "angleDiagram",
      "angles": [{
        "label": "EAF",  // ❌ BANNED: This labels the angle with the answer!
        "vertices": ["E", "A", "F"]
      }]
    }
  },
  "interactions": {
    "choice_interaction": {
      "choices": [
        { "content": [{ "type": "math", "mathml": "<mo>∠</mo><mrow><mi>E</mi><mi>A</mi><mi>F</mi></mrow>" }], "identifier": "C" }
      ]
    }
  },
  "responseDeclarations": [{ "correct": "C" }]
}
\`\`\`

**CORRECT (Widget shows angle without revealing the answer):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "What is a name for the marked angle?" }] },
    { "type": "blockSlot", "slotId": "angle_diagram" },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ],
  "widgets": {
    "angle_diagram": {
      "type": "angleDiagram",
      "angles": [{
        "label": null,  // ✅ CORRECT: No label that gives away the answer
        "vertices": ["E", "A", "F"],
        "color": "#11accd"  // Visual marking without answer
      }]
    }
  }
}
\`\`\`

**Explanation:** The wrong example has the angle diagram widget literally labeling the angle as "EAF", which is the correct answer (∠EAF). This completely defeats the purpose of the question. The correct version visually marks the angle with color but doesn't label it with the answer.

**WRONG (Massive explanations and complete worked solution in body):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "How many solutions does the following equation have?" }] },
    { "type": "paragraph", "content": [{ "type": "math", "mathml": "<mn>3</mn><mrow><mo>(</mo><mi>x</mi><mo>+</mo><mn>5</mn><mo>)</mo></mrow><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn>" }] },
    { "type": "blockSlot", "slotId": "choice_interaction" },
    { "type": "paragraph", "content": [{ "type": "text", "content": "The strategy" }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "Let's manipulate the equation to simplify it and isolate " }, { "type": "math", "mathml": "<mi>x</mi>" }, { "type": "text", "content": ". We should end with one of the following cases:" }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "- An equation of the form " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": " (where " }, { "type": "math", "mathml": "<mi>a</mi>" }, { "type": "text", "content": " is any number). In this case, the equation has exactly one solution." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "- An equation of the form " }, { "type": "math", "mathml": "<mi>a</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": " (where " }, { "type": "math", "mathml": "<mi>a</mi>" }, { "type": "text", "content": " is a number). In this case, the equation has infinitely many solutions." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "- An equation of the form " }, { "type": "math", "mathml": "<mi>a</mi><mo>=</mo><mi>b</mi>" }, { "type": "text", "content": " (where " }, { "type": "math", "mathml": "<mi>a</mi>" }, { "type": "text", "content": " and " }, { "type": "math", "mathml": "<mi>b</mi>" }, { "type": "text", "content": " are different numbers). In this case, the equation has no solutions." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "How do these equations correspond to the number of solutions?" }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "It's helpful to think about the equation graphically. Both the left-hand side and the right-hand side of our equation represent a line. When we set the two sides equal and simplify, we are finding any points that the two lines share. Therefore, any solutions to the equation represent the number of points that the lines share." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "- If the two lines are different but not parallel, they intersect at exactly one point. This corresponds to ending up with an equation of the form " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": "." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "- If the two lines are the same, they share all of their points (infinitely many). This corresponds to ending up with an equation of the form " }, { "type": "math", "mathml": "<mi>a</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": "." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "- If the two lines are different and parallel, they share no points. This corresponds to ending up with a false equation of the form " }, { "type": "math", "mathml": "<mi>a</mi><mo>=</mo><mi>b</mi>" }, { "type": "text", "content": ", where " }, { "type": "math", "mathml": "<mi>a</mi>" }, { "type": "text", "content": " and " }, { "type": "math", "mathml": "<mi>b</mi>" }, { "type": "text", "content": " are different numbers." }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "Simplifying the equation" }] },
    { "type": "paragraph", "content": [{ "type": "math", "mathml": "<mrow><mtable columnalign=\"left left\"><mtr><mtd><mn>3</mn><mrow><mo>(</mo><mi>x</mi><mo>+</mo><mn>5</mn><mo>)</mo></mrow><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn></mtd><mtd></mtd></mtr><mtr><mtd><mn>3</mn><mi>x</mi><mo>+</mo><mn>15</mn><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn></mtd><mtd><mrow><mo>(</mo><mtext>Distribute</mtext><mo>)</mo></mrow></mtd></mtr><mtr><mtd><mn>7</mn><mi>x</mi><mo>+</mo><mn>15</mn><mo>=</mo><mn>8</mn></mtd><mtd><mrow><mo>(</mo><mtext>Add </mtext><mn>4</mn><mi>x</mi><mtext> to both sides</mtext><mo>)</mo></mrow></mtd></mtr><mtr><mtd><mn>7</mn><mi>x</mi><mo>=</mo><mo>-</mo><mn>7</mn></mtd><mtd><mrow><mo>(</mo><mtext>Subtract </mtext><mn>15</mn><mtext> from both sides</mtext><mo>)</mo></mrow></mtd></mtr><mtr><mtd><mi>x</mi><mo>=</mo><mo>-</mo><mn>1</mn></mtd><mtd><mrow><mo>(</mo><mtext>Divide both sides by </mtext><mn>7</mn><mo>)</mo></mrow></mtd></mtr></mtable></mrow>" }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "The answer" }] },
    { "type": "paragraph", "content": [{ "type": "text", "content": "The given equation has exactly one solution." }] }
  ],
  "interactions": {
    "choice_interaction": {
      "type": "choiceInteraction",
      "prompt": [{ "type": "text", "content": "How many solutions does the following equation have?" }],
      "choices": [
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "No solutions" }] }], "feedback": null, "identifier": "A" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Exactly one solution" }] }], "feedback": null, "identifier": "B" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Infinitely many solutions" }] }], "feedback": null, "identifier": "C" }
      ]
    }
  },
  "feedback": {
    "correct": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Correct! Simplifying gives " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mo>-</mo><mn>1</mn>" }, { "type": "text", "content": ", which is of the form " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": " and therefore there is exactly one solution." }] }],
    "incorrect": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Not quite. Distribute, then collect like terms on one side, and isolate " }, { "type": "math", "mathml": "<mi>x</mi>" }, { "type": "text", "content": ": " }, { "type": "math", "mathml": "<mn>3</mn><mrow><mo>(</mo><mi>x</mi><mo>+</mo><mn>5</mn><mo>)</mo></mrow><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn><mo>⇒</mo><mn>3</mn><mi>x</mi><mo>+</mo><mn>15</mn><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn><mo>⇒</mo><mn>7</mn><mi>x</mi><mo>=</mo><mo>-</mo><mn>7</mn><mo>⇒</mo><mi>x</mi><mo>=</mo><mo>-</mo><mn>1</mn>" }, { "type": "text", "content": ". Since this is of the form " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": ", the equation has exactly one solution." }] }]
  }
}
\`\`\`

**CORRECT (Clean body, all teaching content moved to feedback):**
\`\`\`json
{
  "body": [
    { "type": "paragraph", "content": [{ "type": "text", "content": "How many solutions does the following equation have?" }] },
    { "type": "paragraph", "content": [{ "type": "math", "mathml": "<mn>3</mn><mrow><mo>(</mo><mi>x</mi><mo>+</mo><mn>5</mn><mo>)</mo></mrow><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn>" }] },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ],
  "interactions": {
    "choice_interaction": {
      "type": "choiceInteraction",
      "prompt": [{ "type": "text", "content": "How many solutions does the following equation have?" }],
      "choices": [
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "No solutions" }] }], "feedback": null, "identifier": "A" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Exactly one solution" }] }], "feedback": null, "identifier": "B" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Infinitely many solutions" }] }], "feedback": null, "identifier": "C" }
      ]
    }
  },
  "feedback": {
    "correct": [{ "type": "paragraph", "content": [{ "type": "text", "content": "Correct! Simplifying gives " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mo>-</mo><mn>1</mn>" }, { "type": "text", "content": ", which is of the form " }, { "type": "math", "mathml": "<mi>x</mi><mo>=</mo><mi>a</mi>" }, { "type": "text", "content": " and therefore there is exactly one solution." }] }],
    "incorrect": [
      { "type": "paragraph", "content": [{ "type": "text", "content": "Strategy: Manipulate the equation to isolate x. Look for these patterns:" }] },
      { "type": "paragraph", "content": [{ "type": "text", "content": "• x = a (exactly one solution)" }] },
      { "type": "paragraph", "content": [{ "type": "text", "content": "• a = a (infinitely many solutions)" }] },
      { "type": "paragraph", "content": [{ "type": "text", "content": "• a = b where a ≠ b (no solutions)" }] },
      { "type": "paragraph", "content": [{ "type": "text", "content": "Solution: " }, { "type": "math", "mathml": "<mn>3</mn><mrow><mo>(</mo><mi>x</mi><mo>+</mo><mn>5</mn><mo>)</mo></mrow><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn><mo>⇒</mo><mn>3</mn><mi>x</mi><mo>+</mo><mn>15</mn><mo>=</mo><mo>-</mo><mn>4</mn><mi>x</mi><mo>+</mo><mn>8</mn><mo>⇒</mo><mn>7</mn><mi>x</mi><mo>=</mo><mo>-</mo><mn>7</mn><mo>⇒</mo><mi>x</mi><mo>=</mo><mo>-</mo><mn>1</mn>" }, { "type": "text", "content": ". This gives exactly one solution." }] }
    ]
  }
}
\`\`\`

**Explanation:** The wrong example turns the body into a complete lesson with strategy explanations, graphical interpretations, detailed worked solutions, and conclusions. The correct version keeps the body minimal (just the problem) and moves ALL teaching content to the feedback sections where it belongs.

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY backslash character followed by letters (LaTeX commands)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<math><mo>$</mo><mn>amount</mn></math>\` is allowed
- ANY <mfenced> element
- ANY raw text at the start of body content (must be wrapped in block-level elements)
- ANY interactive element (numeric-input, expression, radio, etc.) in the \`widgets\` array instead of \`interactions\` (EXCEPT tables, which are ALWAYS widgets)
- ANY hints or hint-prefixed lines (e.g., starting with "Hint:", "Remember:") included in the 'body'
- ANY explicit statement or implication of the correct answer inside the 'body' (in text, MathML, or worked solution form)
- ANY widget that labels, highlights, or visually indicates the correct answer (e.g., angle diagrams with answer labels)
- ANY duplicate text appearing in both the 'body' and interaction 'prompt' fields (eliminate redundancy by using empty body when interaction has clear prompt)
- ANY cramped layouts where equations, answer prompts, and input fields are all in one paragraph (use separate paragraphs for visual clarity)
- ANY explanations, strategies, worked solutions, or teaching content in the 'body' (these belong ONLY in 'feedback' sections)
- ANY widget or interaction that is NOT referenced in the Perseus content via \`[[☃ widget_name]]\` (unused widgets must be ignored)

**REMEMBER: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.**
Double-check your output before submitting. ZERO TOLERANCE for these violations.`

	return { systemInstruction, userContent }
}

/**
 * SHOT 2: Creates the prompt for mapping widget slots to widget types.
 */
export function createWidgetMappingPrompt(
	perseusJson: string,
	assessmentBody: string,
	slotNames: string[],
	widgetCollectionName: WidgetCollectionName
) {
	const collection = widgetCollections[widgetCollectionName]

	function buildWidgetTypeDescriptions(): string {
		// Use spread operator to convert readonly array to regular array
		const sortedKeys = [...collection.widgetTypeKeys].sort()
		return sortedKeys
			.map((typeName) => {
				// Type narrowing by iterating through the object
				const schemaEntries = Object.entries(allWidgetSchemas)
				const schemaEntry = schemaEntries.find(([key]) => key === typeName)
				if (schemaEntry) {
					const [, schema] = schemaEntry
					const description = schema?._def.description ?? "No description available."
					return `- ${typeName}: ${description}`
				}
				return `- ${typeName}: No description available.`
			})
			.join("\n")
	}
	const systemInstruction = `You are an expert in educational content and QTI standards. Your task is to analyze an assessment item's body content and the original Perseus JSON to map widget slots to the most appropriate widget type from a given list.

**CRITICAL RULE**: You MUST choose a widget type from the list for every slot. Do not refuse or omit any slot. When no perfect match exists, select the closest semantically correct type that best represents the visual intent.

Widget Type Options:
${[...collection.widgetTypeKeys].sort().join("\n")}`

	const userContent = `Based on the Perseus JSON and assessment body below, create a JSON object that maps each widget slot name to the most appropriate widget type.

Perseus JSON:
\`\`\`json
${perseusJson}
\`\`\`

Assessment Item Body (as structured JSON):
\`\`\`json
${assessmentBody}
\`\`\`

 MANDATORY RULES FOR CHOICE-LEVEL VISUALS:
 - Some widget slot names may follow the convention \`<responseIdentifier>__<choiceLetter>__v<index>\`. These are widgets reserved for visuals that appear INSIDE interaction choices (e.g., images/diagrams in radio choices).
 - You MUST map these choice-level widget slots to the correct widget types by inspecting the Perseus JSON for the corresponding choice content.
 - Do NOT assume these appear in the top-level body; they are intentionally absent from body and will be inserted inside choices later.

Available Widget Types and Descriptions:
${buildWidgetTypeDescriptions()}

Your response must be a JSON object with a single key "widget_mapping", mapping every slot name from the list below to its type.

Slot Names to Map:
${slotNames.join("\n")}`

	const WidgetMappingSchema = createWidgetMappingSchema(slotNames, collection.widgetTypeKeys)

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

**UNSUPPORTED INTERACTION HANDLING**
Some Perseus widgets require complex, dynamic user input that we do not support. You MUST identify these and flag them.

- **Unsupported Perseus Types**: \`interactive-graph\`, \`plotter\`, \`grapher\`, \`sorter\`, \`matcher\`, \`number-line\` (the interactive version, not a static image).
- **Your Task**: Look at the original Perseus JSON. If an interaction slot in the shell corresponds to a Perseus widget with one of these unsupported types, you MUST generate a specific JSON object for that slot:
\`\`\`json
{
  "type": "unsupportedInteraction",
  "perseusType": "the-original-perseus-type-from-the-json",
  "responseIdentifier": "the-response-identifier-from-the-shell"
}
\`\`\`
This is a critical instruction to flag items that cannot be converted. For all other supported interaction types, generate the full, valid QTI interaction object as normal.

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
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)

4. **NO CDATA SECTIONS** - Never use \`<![CDATA[ ... ]]>\`. All content must be properly XML-encoded within elements.

5. **NO INVALID XML CHARACTERS** - Do not include control characters or non-characters:
   - Disallowed: U+0000–U+001F (except TAB U+0009, LF U+000A, CR U+000D), U+FFFE, U+FFFF, and unpaired surrogates.

6. **NO ANSWER LEAKAGE IN INTERACTIONS** - CRITICAL: Interactions MUST NEVER reveal the correct answer:
   - NEVER pre-select or highlight the correct choice
   - NEVER order choices in a way that gives away the answer
   - NEVER include visual or textual cues that indicate the correct response
   - **ABSOLUTE RULE**: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.`

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
- For each interaction slot name name in the shell's 'interactions' array, generate a complete QTI interaction object.
- Extract all relevant data from the Perseus JSON to populate the interaction properties (prompt, choices, etc.).
- Ensure all required properties for each interaction type are included.
- **CRITICAL**: Preserve all MathML content exactly as it appears in the assessment shell body.
  
  - **MANDATORY: EMBED WIDGET SLOTS INSIDE CHOICES WHEN VISUALS ARE PRESENT**
    - If the original Perseus choice content includes images/diagrams/graphie visuals, you MUST represent the choice's visual by inserting a block slot reference to the predeclared widget slot using the naming scheme \`<responseIdentifier>__<choiceLetter>__v<index>\`.
    - Build each choice's \`content\` as structured block content that includes a \`blockSlot\` with the correct \`slotId\` for each visual in that choice, preserving any accompanying text.
    - Never embed \`<img>\` or \`<svg>\` directly. Always reference the widget slot(s).
    - Use choice identifiers A, B, C, ... consistently with the response declaration plan; ensure the slot names match exactly.
- Return ONLY a JSON object with interaction slot names as keys and interaction objects as values.

Example output structure:
{
  "interaction_1": { /* full QTI choiceInteraction object */ },
  "interaction_2": { /* full QTI textEntryInteraction object */ }
}

## NEGATIVE EXAMPLES FROM REAL ERRORS (DO NOT OUTPUT THESE)

**LaTeX Commands BANNED:**
WRONG: \`\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\(\` or \`\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Signs BANNED:**
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<mathdisplay="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <math><mo>$</mo><mn>5</mn></math>\` (currency in MathML)

**Deprecated MathML BANNED:**
WRONG: \`<mfenced open="|" close="|"><mi>x</mi></mfenced>\` --> CORRECT: \`<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>\`
WRONG: \`<mfenced open="(" close=")">content</mfenced>\` --> CORRECT: \`<mrow><mo>(</mo>content<mo>)</mo></mrow>\`

**QTI Content Model Violations:**

**Prompt Fields Must Use Structured Inline Content:**
WRONG: \`prompt: 'Select the double number line...'\` (plain string)
CORRECT: \`prompt: [{ "type": "text", "content": "Select the double number line that shows the other values of distance and elevation." }]\`

WRONG: \`prompt: '<p>Arrange the cards to make a true comparison.</p>'\` (HTML string)
CORRECT: \`prompt: [{ "type": "text", "content": "Arrange the cards to make a true comparison." }]\`

**Example with Math in Prompt:**
CORRECT: \`prompt: [{ "type": "text", "content": "What is the value of " }, { "type": "math", "mathml": "<mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo>" }, { "type": "text", "content": " at each point?" }]\`

**General Rule for Prompts:** Prompt fields MUST be arrays of inline content objects. No raw strings or HTML allowed.

**Choice Content - DEPENDS ON INTERACTION TYPE:**

**For Standard Choice Interactions (choiceInteraction, orderInteraction):**
WRONG: \`{ identifier: "A", content: "<p>above</p>" }\` (HTML string)
CORRECT: \`{ identifier: "A", content: [{ "type": "paragraph", "content": [{ "type": "text", "content": "above" }] }] }\`

**For Inline Choice Interactions (inlineChoiceInteraction):**
WRONG: \`{ identifier: "ABOVE", content: "above" }\` (plain string)
CORRECT: \`{ identifier: "ABOVE", content: [{ "type": "text", "content": "above" }] }\`

**Choice Feedback - ALWAYS INLINE CONTENT:**
WRONG: \`feedback: 'Correct! This rectangle has...'\` (plain string)
CORRECT: \`feedback: [{ "type": "text", "content": "Correct! This rectangle has..." }]\`

WRONG: \`feedback: '<p>Incorrect. Try again.</p>'\` (HTML string)
CORRECT: \`feedback: [{ "type": "text", "content": "Incorrect. Try again." }]\`

**Prompt Fields Must Use Structured Inline Content:**
WRONG: \`prompt: 'Select the correct answer.'\` (plain string)
CORRECT: \`prompt: [{ "type": "text", "content": "Select the correct answer." }]\`

**Choice Content MUST be structured:**
**For choiceInteraction:**
WRONG: \`content: "<p>Option A</p>"\` (HTML string)
CORRECT: \`content: [{ "type": "paragraph", "content": [{ "type": "text", "content": "Option A" }] }]\`

  **CRITICAL: CHOICE-LEVEL VISUALS MUST USE WIDGET SLOTS (DO NOT DESCRIBE THE IMAGE IN TEXT)**
  WRONG (text-only description of a number line inside a choice):
  \`\`\`json
  {
    "choices": [
      {
        "identifier": "A",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "content": "A vertical number line from 6 to -6 with tick marks... another arrow from 2.5 to 5.5 ..."
              }
            ]
          }
        ]
      }
    ]
  }
  \`\`\`
  
  CORRECT (embed the predeclared widget slot for the choice's visual):
  \`\`\`json
  {
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "blockSlot", "slotId": "RESPONSE__A__v1" }
        ],
        "feedback": null
      },
      {
        "identifier": "B",
        "content": [
          { "type": "blockSlot", "slotId": "RESPONSE__B__v1" }
        ],
        "feedback": null
      }
    ]
  }
  \`\`\`

**⚠️ CRITICAL NEW SECTION: MANDATORY USE OF ALL DECLARED WIDGET SLOTS IN INTERACTIONS**

**ABSOLUTE REQUIREMENT: You MUST use ALL widget slots declared in the assessment shell that are not already used in the body.**

When the assessment shell declares widget slots (especially those following patterns like \\\`choice_a_table\\\`, \\\`choice_b_table\\\`, or \\\`RESPONSE__A__v1\\\`), these are widgets specifically reserved for embedding inside interaction choices. The pipeline has already:
1. Identified these widgets in Shot 1
2. Mapped them to specific widget types in Shot 2
3. Reserved them for use in this interaction generation step

**FAILURE TO USE DECLARED WIDGET SLOTS WILL CAUSE THEM TO BE PRUNED AND THE QUESTION TO FAIL.**

**Real Example of This Critical Error:**

**Assessment Shell (showing declared but unused widget slots):**
\`\`\`json
{
  "widgets": ["stimulus_dnl", "choice_a_table", "choice_b_table"],
  "body": [
    { "type": "blockSlot", "slotId": "stimulus_dnl" },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ]
}
\`\`\`

**WRONG (Creating text representations instead of using widget slots):**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "content": "Seconds | Meters" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "8 | 225" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "12 | 300" }] }
        ]
      },
      {
        "identifier": "B",
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "content": "Seconds | Meters" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "3 | 75" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "5 | 125" }] }
        ]
      }
    ]
  }
}
\`\`\`
**Why this is WRONG:** The shell declared \\\`choice_a_table\\\` and \\\`choice_b_table\\\` widgets, but the interaction didn't use them. These widgets will be pruned as "unused" and never generated, breaking the question.

**CORRECT (Using the declared widget slots):**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "blockSlot", "slotId": "choice_a_table" }
        ]
      },
      {
        "identifier": "B",
        "content": [
          { "type": "blockSlot", "slotId": "choice_b_table" }
        ]
      }
    ]
  }
}
\`\`\`

**MANDATORY CHECKLIST FOR INTERACTION GENERATION:**
1. Check the assessment shell's \\\`widgets\\\` array for ALL declared widget slots
2. Identify which widgets are already used in the \\\`body\\\` 
3. The remaining unused widgets MUST be embedded in your interaction choices
4. Use the exact slotId from the shell - do not create new slot names
5. For choice-level visuals (tables, images, diagrams), ALWAYS use blockSlot, never create text representations

**Common Widget Slot Patterns to Watch For:**
- \\\`choice_a_table\\\`, \\\`choice_b_table\\\`, etc. - Tables for each choice
- \\\`RESPONSE__A__v1\\\`, \\\`RESPONSE__B__v1\\\`, etc. - Visual widgets for choices
- \\\`option_1_diagram\\\`, \\\`option_2_diagram\\\`, etc. - Diagrams for each choice
- Any widget slot not used in the body MUST be used in the interaction

**REMEMBER:** The pipeline will DELETE any widget slots you don't reference. If the shell declares it, YOU MUST USE IT.

### POSITIVE EXAMPLE: Double Number Line Choice Interaction

**Assessment Shell:**
\`\`\`json
{
  "widgets": ["image_1", "choice_a_dnl", "choice_b_dnl"],
  "interactions": ["choice_interaction"],
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "The double number line shows that " },
        { "type": "math", "mathml": "<mn>3</mn>" },
        { "type": "text", "content": " back-to-school packages contain " },
        { "type": "math", "mathml": "<mn>36</mn>" },
        { "type": "text", "content": " pencils." }
      ]
    },
    { "type": "blockSlot", "slotId": "image_1" },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Select the double number line that shows the other values of packages and pencils." }
      ]
    },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ]
}
\`\`\`

**✅ CORRECT: Properly embeds widget slots in choices**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "responseIdentifier": "RESPONSE",
    "prompt": [
      { "type": "text", "content": "Select the double number line that shows the other values of packages and pencils." }
    ],
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "blockSlot", "slotId": "choice_a_dnl" }
        ],
        "feedback": null
      },
      {
        "identifier": "B",
        "content": [
          { "type": "blockSlot", "slotId": "choice_b_dnl" }
        ],
        "feedback": null
      }
    ],
    "shuffle": true,
    "maxChoices": 1,
    "minChoices": 1
  }
}
\`\`\`

**❌ WRONG: Text descriptions instead of widget slots (causes widgets to be deleted!)**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "responseIdentifier": "RESPONSE",
    "prompt": [
      { "type": "text", "content": "Select the double number line that shows the other values of packages and pencils." }
    ],
    "choices": [
      {
        "identifier": "A",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "content": "A double number line with 5 equally spaced tick marks. The line labeled Packages reads 0, 1, 2, 3, 4. The line labeled Pencils reads 0, 12, 24, 36, 48."
              }
            ]
          }
        ],
        "feedback": null
      },
      {
        "identifier": "B",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "content": "A double number line with 5 equally spaced tick marks. The line labeled Packages reads 0, 1, 2, 3, 4. The line labeled Pencils reads 0, 10, 22, 36, 52."
              }
            ]
          }
        ],
        "feedback": null
      }
    ],
    "shuffle": true,
    "maxChoices": 1,
    "minChoices": 1
  }
}
\`\`\`

**For inlineChoiceInteraction:**
WRONG: \`content: "Option A"\` (plain string)
CORRECT: \`content: [{ "type": "text", "content": "Option A" }]\`

**Feedback MUST be structured inline content:**
WRONG: \`feedback: 'That is correct.'\` (plain string)
CORRECT: \`feedback: [{ "type": "text", "content": "That is correct." }]\`

**Critical Rules:**
- **Standard choice interactions** (choiceInteraction, orderInteraction): Choice content MUST be arrays of block content objects
- **Inline choice interactions** (inlineChoiceInteraction): Choice content MUST be arrays of inline content objects
- **ALL choice feedback**: MUST be arrays of inline content objects regardless of interaction type
- **ALL prompts**: MUST be arrays of inline content objects

## Real Example of Unsupported Interaction - Plotter Widget

Here's a real Perseus question that uses an unsupported plotter widget for creating histograms:

**Perseus JSON (showing unsupported widget):**
\`\`\`json
{
  "question": {
    "content": "The following data points represent the number of points the Hawaii Eagles football team scored each game.\\n\\n$\\qquad17,33,28,23,10,42,3$\\n\\n**Using the data, create a histogram.**\\n\\n[[☃ plotter 1]]",
    "widgets": {
      "plotter 1": {
        "type": "plotter",
        "graded": true,
        "options": {
          "maxY": 5,
          "type": "histogram",
          "labels": ["Number of points", "Number of games"],
          "correct": [2, 3, 2],
          "categories": ["$0$", "$15$", "$30$", "$45$"]
        }
      }
    }
  }
}
\`\`\`

**Required Output for this Unsupported Widget:**
\`\`\`json
{
  "histogram_interaction": {
    "type": "unsupportedInteraction",
    "perseusType": "plotter",
    "responseIdentifier": "RESPONSE"
  }
}
\`\`\`

This plotter widget requires interactive histogram creation which is not supported. You MUST flag it as unsupported rather than trying to convert it to a text entry or choice interaction.

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY LaTeX commands (backslash followed by letters)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY answer content outside of feedback fields (no pre-selected choices, no answer indicators)
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)

**REMEMBER: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.**
Double-check EVERY string in your output. ZERO TOLERANCE.

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if any content field is a plain string instead of the required structured JSON array.`

	return { systemInstruction, userContent }
}

/**
 * SHOT 4: Creates a prompt for generating only widget content.
 */
export function createWidgetContentPrompt(
	perseusJson: string,
	assessmentShell: unknown,
	widgetMapping: Record<string, keyof typeof allWidgetSchemas>,
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
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)

4. **NO CDATA SECTIONS** - Never use \`<![CDATA[ ... ]]>\`. All content must be properly XML-encoded within elements.

5. **NO INVALID XML CHARACTERS** - Do not include control characters or non-characters:
   - Disallowed: U+0000–U+001F (except TAB U+0009, LF U+000A, CR U+000D), U+FFFE, U+FFFF, and unpaired surrogates.

  **DEDICATED RULE: ANSWER LEAKAGE IS STRICTLY PROHIBITED**
  Widgets must NEVER reveal, hint at, or encode the correct answer in any way.
  - Do not pre-label target values (angles, lengths, coordinates, categories) with the correct answer
  - Do not pre-highlight the correct region, tick, or element
  - Do not include explanatory text that states or implies the answer
  - When a label field could reveal the answer, set it to null

6. **NO ANSWER LEAKAGE IN WIDGETS** - CRITICAL: Widgets MUST NEVER reveal the correct answer:
   - NEVER label diagrams with the answer (e.g., angle labeled "EAF" when asking for angle name)
   - NEVER highlight or mark the correct value in visualizations
   - NEVER include text, labels, or visual indicators that give away the answer
   - The widget should present the problem visually WITHOUT showing the solution
   - **ABSOLUTE RULE**: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.`

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

## Available Widget Types and Descriptions:
${buildWidgetTypeDescriptions()}

## Instructions:
- **Analyze Images**: Use the raster images provided to your vision and the raw SVG content above to understand the visual components of widgets.
- For each entry in the widget mapping, generate a fully-formed widget object of the specified type.
- **Use Interaction Context**: You MUST use the "Interaction Content" object to understand the full question. This context is critical for generating correct data for widgets that appear within choices. For example, the interaction's prompt will tell you what the correct values on a number line widget should be.
- Extract all relevant data from the Perseus JSON to populate the widget properties.
- **CRITICAL: PRESERVE ALL LABELS AND VALUES FROM PERSEUS EXACTLY** - When Perseus describes labels, markers, values, or any visual properties (in alt text, descriptions, or widget options), you MUST copy them EXACTLY. Missing or changing labels can make questions impossible to answer.
- Ensure all required properties for each widget type are included.
  - **MANDATORY: HONOR CHOICE-LEVEL SLOT NAMING**: For any widget slot name matching \`<responseIdentifier>__<choiceLetter>__v<index>\`, generate the widget corresponding to the visual content in that specific choice within the referenced interaction. Do not repurpose or collapse these slots; they must map 1:1 to the visuals per choice.
- Return ONLY a JSON object with widget slot names as keys and widget objects as values.

Example output structure:
{
  "widget_1": { "type": "doubleNumberLine", "width": 400, ... },
  "table_1": { "type": "dataTable", "columns": [...], ... }
}

## NEGATIVE EXAMPLES FROM REAL ERRORS (DO NOT OUTPUT THESE)

**LaTeX Commands BANNED:**
WRONG: \`\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\(\` or \`\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Signs BANNED:**
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<mathdisplay="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <math><mo>$</mo><mn>5</mn></math>\` (currency in MathML)

**Deprecated MathML BANNED:**
WRONG: \`<mfenced open="|" close="|"><mi>x</mi></mfenced>\` --> CORRECT: \`<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>\`
WRONG: \`<mfenced open="(" close=")">content</mfenced>\` --> CORRECT: \`<mrow><mo>(</mo>content<mo>)</mo></mrow>\`

**QTI Content Model Violations:**

**Prompt Fields Must Use Structured Inline Content:**
WRONG: \`prompt: 'Select the double number line...'\` (plain string)
CORRECT: \`prompt: [{ "type": "text", "content": "Select the double number line that shows the other values of distance and elevation." }]\`

WRONG: \`prompt: '<p>Arrange the cards to make a true comparison.</p>'\` (HTML string)
CORRECT: \`prompt: [{ "type": "text", "content": "Arrange the cards to make a true comparison." }]\`

**Example with Math in Prompt:**
CORRECT: \`prompt: [{ "type": "text", "content": "What is the value of " }, { "type": "math", "mathml": "<mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo>" }, { "type": "text", "content": " at each point?" }]\`

**General Rule for Prompts:** Prompt fields MUST be arrays of inline content objects. No raw strings or HTML allowed.

**Choice Content - DEPENDS ON INTERACTION TYPE:**

**For Standard Choice Interactions (choiceInteraction, orderInteraction):**
WRONG: \`{ identifier: "A", content: "<p>above</p>" }\` (HTML string)
CORRECT: \`{ identifier: "A", content: [{ "type": "paragraph", "content": [{ "type": "text", "content": "above" }] }] }\`

**For Inline Choice Interactions (inlineChoiceInteraction):**
WRONG: \`{ identifier: "ABOVE", content: "above" }\` (plain string)
CORRECT: \`{ identifier: "ABOVE", content: [{ "type": "text", "content": "above" }] }\`

**Choice Feedback - ALWAYS INLINE CONTENT:**
WRONG: \`feedback: 'Correct! This rectangle has...'\` (plain string)
CORRECT: \`feedback: [{ "type": "text", "content": "Correct! This rectangle has..." }]\`

WRONG: \`feedback: '<p>Incorrect. Try again.</p>'\` (HTML string)
CORRECT: \`feedback: [{ "type": "text", "content": "Incorrect. Try again." }]\`

**LaTeX in Widget Properties BANNED:**
WRONG (e.g., in a dataTable): \`"label": "Value of $$x$$"\`
CORRECT: \`"label": "Value of <math><mi>x</mi></math>"\`

**Answer Leakage in Widgets BANNED:**
WRONG (angle diagram with answer label):
\`{
  "angle_diagram": {
    "type": "angleDiagram",
    "angles": [{
      "label": "EAF",  // ❌ BANNED: Labels the angle with the answer!
      "vertices": ["E", "A", "F"]
    }]
  }
}\`
CORRECT (angle diagram without answer):
\`{
  "angle_diagram": {
    "type": "angleDiagram", 
    "angles": [{
        "label": null,  // ✅ CORRECT: No label revealing the answer
      "vertices": ["E", "A", "F"],
      "color": "#11accd"  // Visual marking without giving away answer
    }]
  }
}\`

WRONG (triangle diagram question with angle labeled):
\`{
  "triangle_widget": {
    "type": "triangleDiagram",
    "triangles": [{
      "vertices": ["B", "A", "C"],
      "angles": [{
        "vertex": "A",
        "label": "BAC"  // ❌ BANNED: When asking "Which angle is ∠BAC?", don't label it!
      }]
    }]
  }
}\`
CORRECT (triangle diagram without revealing labels):
\`{
  "triangle_widget": {
    "type": "triangleDiagram",
    "triangles": [{
      "vertices": ["B", "A", "C"],
      "angles": [{
        "vertex": "A",
        "label": null  // ✅ CORRECT: Let students identify which angle is ∠BAC
      }]
    }]
  }
}\`

**CRITICAL: Missing Essential Widget Data BANNED:**
WRONG (triangle with missing side labels that are needed for the question):
\`{
  "image_1": {
    "type": "triangleDiagram",
    "sides": [
      {"label": " ", "vertices": ["L", "R"]},  // ❌ BANNED: Side should be labeled "A" per Perseus!
      {"label": " ", "vertices": ["R", "T"]},  // ❌ BANNED: Side should be labeled "B" per Perseus!
      {"label": " ", "vertices": ["T", "L"]}   // ❌ BANNED: Side should be labeled "C" per Perseus!
    ]
  }
}\`
*Perseus had: "The base is labeled A. The other two sides are labeled, in clockwise order, B and C."*
*Question asks: "Which line segment shows the base?" with choices A, B, C*
*Without the labels, the question is IMPOSSIBLE to answer!*

CORRECT (preserving all essential labels from Perseus):
\`{
  "image_1": {
    "type": "triangleDiagram",
    "sides": [
      {"label": "A", "vertices": ["L", "R"]},  // ✅ CORRECT: Label preserved from Perseus
      {"label": "B", "vertices": ["R", "T"]},  // ✅ CORRECT: Label preserved from Perseus
      {"label": "C", "vertices": ["T", "L"]}   // ✅ CORRECT: Label preserved from Perseus
    ]
  }
}\`

**GENERAL RULE: COPY WIDGET DATA FROM PERSEUS EXACTLY**
When Perseus describes labels, values, or visual properties in the widget (via alt text, descriptions, or widget options), you MUST preserve ALL of them exactly. Missing labels or values makes questions unsolvable!

**Ensure all text content within widget properties is properly escaped and follows content rules.**

**Critical Rules:**
- **Standard choice interactions** (choiceInteraction, orderInteraction): Choice content MUST be arrays of block content objects
- **Inline choice interactions** (inlineChoiceInteraction): Choice content MUST be arrays of inline content objects
- **ALL choice feedback**: MUST be arrays of inline content objects regardless of interaction type
- **ALL prompts**: MUST be arrays of inline content objects

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY LaTeX commands (backslash followed by letters)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY widget that labels or visually indicates the correct answer (e.g., angle labeled "EAF" when answer is ∠EAF)
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)

**REMEMBER: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.**
Double-check EVERY string in your output. ZERO TOLERANCE for these violations.`

	return { systemInstruction, userContent }
}
