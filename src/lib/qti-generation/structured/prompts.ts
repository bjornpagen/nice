import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { allExamples } from "@/lib/qti-generation/examples"
import { type AnyInteraction, AssessmentItemShellSchema } from "@/lib/qti-generation/schemas"
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
type WidgetTypeKey = keyof typeof typedSchemas

const widgetTypeKeys: [WidgetTypeKey, ...WidgetTypeKey[]] = [
	"3dIntersectionDiagram",
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
	"vennDiagram",
	"verticalArithmeticSetup",
	"parallelogramTrapezoidDiagram"
]

function createWidgetMappingSchema(slotNames: string[]) {
	const mappingShape: Record<string, z.ZodEnum<[WidgetTypeKey, ...WidgetTypeKey[]]>> = {}
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

**CRITICAL: NO ANSWERS OR HINTS IN 'BODY'.**
- The 'body' MUST NEVER contain the correct answer, partial answers, worked solutions, or any text that gives away the answer.
- Strip and ignore ALL Perseus 'hints' fields. NEVER include hints in any form in the 'body' (no text, MathML, paraphrases, or reworded guidance).
- Do NOT include hint-like lead-ins such as "Hint:", "Remember:", "Think about...", or statements that restate or imply the answer (e.g., "the constant is 7").
- The ONLY place the correct answer may appear is in the response declarations; it MUST NOT be echoed anywhere in the 'body'.

**CRITICAL: NO EXPLANATION WIDGETS.**
NEVER create a widget for explanatory text. Explanations or definitions found in the Perseus JSON (especially those of type 'explanation' or 'definition') must be embedded directly within the 'body' content as paragraph blocks. The 'explanation' and 'definition' widget types are BANNED. Hints are EXPLICITLY FORBIDDEN and MUST be stripped entirely.

**CRITICAL: NO CURRENCY SLOTS.**
Currency symbols and amounts MUST NOT be represented as slots (widget or interaction). Do not generate any slotId that indicates currency (for example, names containing "currency" or ending with "_feedback"). Represent currency inline using text and/or MathML only; for example: <span class="currency">$</span> followed by <math><mn>5</mn></math> or plain text like "5 dollars".

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
- **Placeholders**:
  - For ALL Perseus widgets (including 'image' widgets), create a { "type": "blockSlot", "slotId": "..." } placeholder in the 'body' and add its identifier to the 'widgets' string array.
  - For inline interactions (e.g., 'text-input', 'inline-choice'), create { "type": "inlineSlot", "slotId": "..." } inside paragraph content.
  - For block interactions (e.g., 'radio', 'order'), create { "type": "blockSlot", "slotId": "..." } in the body array.
- **NEVER EMBED IMAGES OR SVGs**: You MUST NOT generate \`<img>\` tags, \`<svg>\` tags, or data URIs in the 'body' string. This is a critical requirement. ALL images and visual elements must be handled as widgets referenced by slots. If you see an image in Perseus, create a widget slot for it, never embed it directly.
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
  - **CURRENCY HANDLING**:
    * Currency symbols are allowed when properly tagged: \`<span class="currency">$</span>\`
    * Do NOT use \`<mo>$</mo>\` in MathML for currency (use it only for mathematical operators if needed)
    * Acceptable patterns: \`<span class="currency">$</span><math><mn>5</mn></math>\` or text like "5 dollars"
  - Do NOT create slots for currency. Never generate slotIds like "currency7" or "currency7_feedback"; represent currency inline using \`<span class="currency">$</span>\` and text/MathML.
- **Table Rule (MANDATORY)**:
  - Tables must NEVER be created as HTML \`<table>\` elements in the body.
  - ALWAYS create a widget slot for every table (e.g., \`<slot name="table_widget_1" />\`) and add "table_widget_1" to the 'widgets' array.
- **Response Declarations**:
  - The 'question.answers' from Perseus must be used to create the \`responseDeclarations\`.
  - **Numeric Answers Rule**: For text entry interactions, if the correct answer is a decimal that can be represented as a simple fraction (e.g., 0.5, 0.25), the 'correct' value in the response declaration should be a string representing that fraction (e.g., "1/2", "1/4"). This is to avoid forcing students to type decimals.
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
WRONG: \`$\\dfrac{7^{36}}{9^{24}}$\` --> CORRECT: \`<math><mfrac><msup><mn>7</mn><mn>36</mn></msup><msup><mn>9</mn><mn>24</mn></msup></mfrac></math>\`
WRONG: \`\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\(\` or \`\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Sign Delimiters - BANNED:**
WRONG: \`$3(9p-12)$\` --> CORRECT: \`<math><mn>3</mn><mo>(</mo><mn>9</mn><mi>p</mi><mo>-</mo><mn>12</mn><mo>)</mo></math>\`
WRONG: \`$5, \\sqrt8, 33$\` --> CORRECT: \`<math><mn>5</mn></math>, <math><msqrt><mn>8</mn></msqrt></math>, <math><mn>33</mn></math>\`
WRONG: \`paid $<math>\` (bare dollar) --> CORRECT: \`paid <span class="currency">$</span><math>\` (properly tagged currency)
WRONG: \`<mo>$</mo><mn>12</mn>\` --> CORRECT: For currency use \`<span class="currency">$</span><math><mn>12</mn></math>\`
ACCEPTABLE: \`<span class="currency">$</span><math xmlns="..."><mn>2.00</mn></math>\` (properly tagged currency symbol)
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<mathdisplay="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <span class="currency">$</span><mn>5</mn>\` (properly tagged currency)

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

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY backslash character followed by letters (LaTeX commands)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY raw text at the start of body content (must be wrapped in block-level elements)
- ANY interactive element (numeric-input, expression, radio, etc.) in the \`widgets\` array instead of \`interactions\` (EXCEPT tables, which are ALWAYS widgets)
 - ANY hints or hint-prefixed lines (e.g., starting with "Hint:", "Remember:") included in the 'body'
 - ANY explicit statement or implication of the correct answer inside the 'body' (in text, MathML, or worked solution form)
 - ANY duplicate text appearing in both the 'body' and interaction 'prompt' fields (eliminate redundancy by using empty body when interaction has clear prompt)
 - ANY cramped layouts where equations, answer prompts, and input fields are all in one paragraph (use separate paragraphs for visual clarity)
Double-check your output before submitting. ZERO TOLERANCE for these violations.`

	return { systemInstruction, userContent }
}

/**
 * SHOT 2: Creates the prompt for mapping widget slots to widget types.
 */
export function createWidgetMappingPrompt(perseusJson: string, assessmentBody: string, slotNames: string[]) {
	const systemInstruction = `You are an expert in educational content and QTI standards. Your task is to analyze an assessment item's body content and the original Perseus JSON to map widget slots to the most appropriate widget type from a given list.

**CRITICAL RULE**: You MUST choose a widget type from the list for every slot. Do not refuse or omit any slot. When no perfect match exists, select the closest semantically correct type that best represents the visual intent.

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

Assessment Item Body (as structured JSON):
\`\`\`json
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
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)
\n4. **NO CDATA SECTIONS** - Never use \`<![CDATA[ ... ]]>\`. All content must be properly XML-encoded within elements.
\n5. **NO INVALID XML CHARACTERS** - Do not include control characters or non-characters:
   - Disallowed: U+0000–U+001F (except TAB U+0009, LF U+000A, CR U+000D), U+FFFE, U+FFFF, and unpaired surrogates.`

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
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <span class="currency">$</span><mn>5</mn>\` (properly tagged currency)

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

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY LaTeX commands (backslash followed by letters)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$) - properly tagged currency like \`<span class="currency">$</span>\` is allowed
- ANY <mfenced> element
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)
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
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)
\n4. **NO CDATA SECTIONS** - Never use \`<![CDATA[ ... ]]>\`. All content must be properly XML-encoded within elements.
\n5. **NO INVALID XML CHARACTERS** - Do not include control characters or non-characters:
   - Disallowed: U+0000–U+001F (except TAB U+0009, LF U+000A, CR U+000D), U+FFFE, U+FFFF, and unpaired surrogates.`

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
WRONG: \`\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\(\` or \`\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Signs BANNED:**
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<mathdisplay="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <span class="currency">$</span><mn>5</mn>\` (properly tagged currency)

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
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)
Double-check EVERY string in your output. ZERO TOLERANCE.`

	return { systemInstruction, userContent }
}
