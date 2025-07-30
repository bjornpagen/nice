import type * as logger from "@superbuilders/slog"
import { loadConversionExamples } from "@/lib/qti-examples"
import { VALID_QTI_TAGS } from "@/lib/qti-tags"

interface RegenerationContext {
	flawedXml: string
	errorReason: string
}

/**
 * Creates the structured prompt for the AI model to convert Perseus JSON to QTI XML,
 * including a rich set of few-shot examples.
 * @param logger The logger instance.
 * @param perseusJsonString The stringified Perseus JSON data for the current conversion task.
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @param regenerationContext Optional context for regeneration attempts.
 * @returns The system instruction and user content for the AI prompt.
 */
export async function createQtiConversionPrompt(
	logger: logger.Logger,
	perseusJsonString: string,
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" },
	regenerationContext?: RegenerationContext
) {
	const { type } = options
	const rootTag = type === "stimulus" ? "qti-assessment-stimulus" : "qti-assessment-item"

	logger.debug("creating qti conversion prompt", {
		type,
		rootTag,
		perseusDataLength: perseusJsonString.length,
		isRegeneration: !!regenerationContext
	})

	const systemInstruction = `You are an expert XML generator for educational content. Your primary and most critical function is to convert a Perseus JSON object into a single, well-formed QTI 3.0 XML \`${rootTag}\`. Your output MUST be only the raw XML. The XML MUST be perfect and parseable. The most common and catastrophic failure is an incomplete or malformed closing tag. You are STRICTLY FORBIDDEN from using partial or lazy closing tags like \`</_>\` or \`</>\`. Every single XML element, such as \`<p>\`, must have a corresponding full closing tag, \`</p>\`. This rule is absolute and cannot be violated.`

	logger.debug("loading conversion examples", { type })
	const examples = await loadConversionExamples({ type })
	logger.debug("loaded conversion examples", {
		exampleCount: examples.length,
		exampleNames: examples.map((e) => e.name),
		positiveCount: examples.filter((e) => e.type === "positive").length,
		negativeCount: examples.filter((e) => e.type === "negative").length
	})

	// Separate positive and negative examples
	const positiveExamples = examples.filter((e) => e.type === "positive")
	const negativeExamples = examples.filter((e) => e.type === "negative")

	// Always include positive examples
	const positiveExamplesXml = positiveExamples
		.map(
			(example) => `
<example name="${example.name}">
  <perseus_json>
${JSON.stringify(example.perseus, null, 2)}
  </perseus_json>
  <qti_xml>
${example.qti}
  </qti_xml>
</example>
`
		)
		.join("\n")

	// Conditionally build negative examples block
	let negativeExamplesBlock = ""
	if (!regenerationContext) {
		const negativeExamplesFromData = negativeExamples
			.map(
				(example) => `
<negative_example_from_data name="${example.name}">
  <perseus_json>
${JSON.stringify(example.perseus, null, 2)}
  </perseus_json>
  <malformed_qti_xml>
${example.qti}
  </malformed_qti_xml>
</negative_example_from_data>
`
			)
			.join("\n")

		negativeExamplesBlock = `
<negative_examples_from_filesystem>
<!-- THESE ARE REAL EXAMPLES OF MALFORMED QTI XML LOADED FROM OUR NEGATIVE EXAMPLES DIRECTORY -->
<!-- Each example contains an XML comment explaining why it is incorrect -->
${negativeExamplesFromData}
</negative_examples_from_filesystem>
`
	}

	const regenerationBlock = regenerationContext
		? `
<regeneration_context>
### REGENERATION TASK ###
The previous attempt to generate this QTI XML failed validation for the following reason.
Your task is to regenerate the XML, fixing this specific error while preserving the original intent.

**Reason for Failure:**
${regenerationContext.errorReason}

**Flawed XML from Previous Attempt:**
\`\`\`xml
${regenerationContext.flawedXml}
\`\`\`

**Instructions for Correction:**
1. Analyze the provided reason and the flawed XML.
2. Identify the mistake in the previous attempt (e.g., missing context, incorrect structure, invalid XML).
3. **Pay close attention to the positive examples provided below to understand the correct structure and content fidelity required.**
4. Generate a new, completely valid QTI XML that corrects the error and fully represents the source Perseus JSON.
</regeneration_context>
`
		: ""

	const userContent = `
${regenerationBlock}
<examples>
${positiveExamplesXml}
</examples>
${negativeExamplesBlock}
<critical_negative_examples>
<!-- THESE ARE EXAMPLES OF WHAT MUST NEVER APPEAR IN QTI XML -->
<negative_example reason="Perseus widget artifacts cause QTI API to return 'unknown' type and fail validation">
  <perseus_artifact>[[☃ plotter 1]]</perseus_artifact>
  <explanation>This is a Perseus-specific interactive plotter widget. It MUST be completely removed or converted to a standard QTI interaction.</explanation>
</negative_example>
<negative_example reason="Perseus interactive graphs are not valid QTI">
  <perseus_artifact>[[☃ interactive-graph 1]]</perseus_artifact>
  <explanation>Perseus interactive graph widgets have no QTI equivalent and MUST be removed.</explanation>
</negative_example>
<negative_example reason="Perseus number line widgets are not QTI standard">
  <perseus_artifact>[[☃ number-line 1]]</perseus_artifact>
  <explanation>Number line widgets from Perseus cannot be represented in QTI and MUST be removed.</explanation>
</negative_example>
<negative_example reason="Perseus table widgets are not QTI interactions">
  <perseus_artifact>[[☃ table 1]]</perseus_artifact>
  <explanation>Perseus table widgets must be converted to static HTML tables or removed entirely.</explanation>
</negative_example>
<negative_example reason="Any Perseus widget notation will break QTI">
  <perseus_artifact>[[☃ ANY_WIDGET_NAME ANY_NUMBER]]</perseus_artifact>
  <explanation>ANY text matching the pattern [[☃ ...]] is a Perseus widget and MUST be removed. The QTI API cannot process these and will return 'unknown' type, causing system failures.</explanation>
</negative_example>
<negative_example reason="CDATA sections are not allowed in QTI XML">
  <perseus_artifact><![CDATA[{"maxY":7,"type":"pic"}]]></perseus_artifact>
  <explanation>CDATA sections are FORBIDDEN in QTI. All data must be properly XML-encoded. Never use <![CDATA[...]]> anywhere.</explanation>
</negative_example>
<negative_example reason="Perseus markdown image syntax is not valid QTI">
  <perseus_artifact>![](web+graphie://cdn.kastatic.org/ka-perseus-graphie/example.svg)</perseus_artifact>
  <explanation>This is Perseus-specific markdown syntax. Convert to proper HTML img tag: <img src="https://cdn.kastatic.org/ka-perseus-graphie/example.svg" alt="description"/></explanation>
</negative_example>
<negative_example reason="Perseus URL schemes must be converted">
  <perseus_artifact>web+graphie://cdn.kastatic.org/...</perseus_artifact>
  <explanation>Perseus uses custom URL schemes like 'web+graphie://'. These MUST be converted to standard 'https://' URLs.</explanation>
</negative_example>
<negative_example reason="Non-standard QTI elements are AI hallucinations">
  <perseus_artifact><qti-plotter-interaction response-identifier="RESPONSE"></perseus_artifact>
  <explanation>There is NO such element as qti-plotter-interaction in QTI 3.0. This is an AI hallucination. Use only standard QTI elements like qti-choice-interaction, qti-text-entry-interaction, etc.</explanation>
</negative_example>
<negative_example reason="More non-standard QTI elements">
  <perseus_artifact><qti-graphing-interaction><qti-graphing-category>...</perseus_artifact>
  <explanation>qti-graphing-interaction, qti-plotter-graph, qti-plotter-axis, qti-graphing-category are ALL INVALID. These do not exist in QTI 3.0.</explanation>
</negative_example>
<negative_example reason="Object tags for plotters are not QTI">
  <perseus_artifact><object data-type="plotter" type="application/json"><param name="options">...</perseus_artifact>
  <explanation>This is NOT a valid QTI interaction. The object element cannot be used to create interactive assessments in QTI.</explanation>
</negative_example>
<negative_example reason="qti-prompt must be inside an interaction tag">
  <malformed_qti>
    <qti-item-body>
      <qti-prompt>This is the question.</qti-prompt>
      <qti-choice-interaction response-identifier="RESPONSE">
        <qti-simple-choice identifier="A">Choice A</qti-simple-choice>
      </qti-choice-interaction>
    </qti-item-body>
  </malformed_qti>
  <explanation>The qti-prompt tag is a direct child of qti-item-body. This is INVALID. Since there IS an interaction tag (qti-choice-interaction), the qti-prompt MUST be moved inside it.</explanation>
</negative_example>
<negative_example reason="qti-prompt without interaction should be a p tag">
  <malformed_qti>
    <qti-item-body>
      <qti-prompt>This is an informational text with no interaction.</qti-prompt>
      <p>Some additional content.</p>
    </qti-item-body>
  </malformed_qti>
  <explanation>The qti-prompt tag is used but there is NO interaction element in the item. This is INVALID. Since there is NO interaction, convert the qti-prompt to a regular p tag.</explanation>
</negative_example>
<negative_example reason="qti-text-entry-interaction must be wrapped in a block element">
  <malformed_qti>
    <qti-item-body>
      <div id="reference_text">
        <img src="https://example.com/image.png" alt="Example image"/>
        <p><span class="qti-italic">Note: Description of image.</span></p>
      </div>
      <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="3">
        <qti-prompt>What number is missing?</qti-prompt>
      </qti-text-entry-interaction>
    </qti-item-body>
  </malformed_qti>
  <explanation>The qti-text-entry-interaction is placed directly inside qti-item-body. This structure violates QTI 3.0 schema validation. The interaction MUST be wrapped inside a block-level element like <p>. Additionally, when wrapping the interaction in a paragraph, the qti-prompt should be moved OUTSIDE the interaction as a separate <p> element.</explanation>
</negative_example>
<negative_example reason="qti-stimulus-body must contain only HTML, no QTI elements">
  <malformed_qti>
    <qti-stimulus-body>
      <qti-prompt>Read the following passage:</qti-prompt>
      <p>This is an informational text about photosynthesis...</p>
      <qti-text-entry-interaction response-identifier="RESPONSE">
        <qti-prompt>What did you learn?</qti-prompt>
      </qti-text-entry-interaction>
    </qti-stimulus-body>
  </malformed_qti>
  <explanation>The qti-stimulus-body contains QTI elements (qti-prompt and qti-text-entry-interaction). This is INVALID. The qti-stimulus-body must contain ONLY standard HTML elements. Stimulus items are purely informational and cannot contain any interactions or QTI-specific elements. Use <p>, <h2>, <ul>, <li>, <div>, <img>, <a>, <strong>, <em>, <code>, <pre>, <math>, etc., but NEVER any qti-* elements.</explanation>
</negative_example>
</critical_negative_examples>

<instructions>
### PREAMBLE: THE GOAL OF THIS CONVERSION ###

You are converting from Perseus JSON, a proprietary format from Khan Academy, to QTI 3.0 XML, an industry standard. A direct 1:1 conversion is often impossible and undesirable. The ultimate goal is to produce a **high-quality, student-facing, and robust QTI assessment item.** This means prioritizing student comprehension and system reliability over a literal translation of Perseus features. Perseus's dynamic 'graphie' images are particularly problematic and require special handling as detailed below. Your primary objective is to create an item that is solvable, fair, and technically sound.

Below is a Perseus JSON object. Your task is to provide the corresponding QTI 3.0 XML. Use the PERFECT examples above to inform your output. Respond with ONLY the XML content.

<perseus_json>
${perseusJsonString}
</perseus_json>

Your output will be fed directly into an automated XML parser. If the XML is not well-formed, the entire system will crash. Pay extreme attention to the rules below.

---
### CRITICAL: PERSEUS ARTIFACTS REMOVAL ###

**THE MOST CRITICAL RULE: NO PERSEUS WIDGET ARTIFACTS**

Perseus uses special notation like [[☃ widget-name 1]] for interactive widgets. These MUST NEVER appear in your QTI output. If you include ANY Perseus widget notation:
- The QTI API will fail to recognize the interaction type
- The system will receive "unknown" as the interaction type
- The entire processing pipeline will fail

When you encounter Perseus widgets:
1. If it's a graph/plotter/drawing widget asking students to create something, you MUST either:
   - Remove the interaction entirely and make it an informational item
   - Convert it to a text-entry asking for coordinates or values
   - Convert it to multiple-choice if there are discrete answer options
2. NEVER output the [[☃ ...]] notation itself
3. NEVER reference Perseus-specific features that have no QTI equivalent

---
### CRITICAL: STRATEGY FOR PERSEUS 'GRAPHIE' IMAGES ###

Perseus uses a dynamic renderer called 'graphie'. A direct conversion of a 'graphie' URL to a static SVG often fails or produces an incomplete image (e.g., a ruler without tick marks). You must follow a specific strategy based on the type of visual content.

**1. REPLACE WITH CUSTOM SVG:**
For the following types of visuals, you MUST NOT use the original 'graphie' URL. Instead, you MUST generate a complete, static, self-contained SVG representation of the final state of the visual. This is often best done with an inline data URI (\`data:image/svg+xml,...\`). This rule applies to:
  - **Number Lines** (including time-based and multi-step number lines)
  - **Pictographs**
  - **Dot Plots** (from 'plotter' widgets)
  - **Line Plots** (graphs showing connected points to represent data trends)
  - **Bar Charts** (from 'plotter' widgets)
  - **Visual Grids/Dot Arrays** (grid patterns showing dots for counting or repeated addition)
  - **Line Sorting/Ordering Questions** (where students must order lines by height, length, or other attributes)

**CRITICAL EMOJI RULE:** When creating custom SVG replacements for visual arrays, pictographs, or grids where the ONLY visual element is a repeated singleton icon (e.g., sharks, horses, animals, nuts, squirrels, etc.), you MUST use the corresponding emoji character instead of drawing the shape. Examples include but are not limited to:
  - Sharks → 🦈
  - Horses → 🐴
  - Dogs → 🐕
  - Cats → 🐈
  - Penguins → 🐧
  - Squirrels → 🐿️
  - Nuts/Acorns → 🌰
  - Apples → 🍎
  - Stars → ⭐
  - Hearts → ❤️

The emoji should be rendered as text elements within the SVG, positioned appropriately to create the visual array or grid pattern. See the positive examples for the correct implementation pattern.

**2. SUPPLEMENT WITH TEXT:**
For the following types of visuals, you MUST use the original 'graphie' URL (converted to \`https://...\`) but you MUST ALSO add a descriptive text note below the image to make the question solvable even if the image's details fail to render. This rule applies to:
  - **Rulers**
  - **Analog Clocks**
  - **Ruler-like visual estimations** (e.g., estimating an object's height relative to another object of known height)
  - **Measure the line/object with the number of boxes questions**

**Example of the "Supplement with Text" Strategy:**

<perseus_json>
{
  "question": {
    "content": "What is the length of the mouse?\\n\\n![](web+graphie://.../ruler_image.svg)\\n\\n[[☃ numeric-input 1]] inches"
  }
}
</perseus_json>

<correct_qti_output>
  ...
  <qti-item-body>
    <qti-prompt>What is the length of the mouse?</qti-prompt>
    <div id="reference_text">
      <img src="https://.../ruler_image.svg" alt="A mouse against a ruler."/>
      <p><span class="qti-italic">Note: The mouse's nose is at the 0-inch mark and its tail ends at the 4-inch mark.</span></p>
    </div>
    <p>
      <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/> inches
    </p>
  ...
  </qti-item-body>
  ...
</correct_qti_output>

---
### CRITICAL: CONTENT AND SEMANTIC RULES ###

1.  **Preserve All Necessary Context:** Do not omit introductory sentences or setup text. The question must be fully understandable.
2.  **Convert All LaTeX to MathML:** Any text enclosed in \`$...$\` is LaTeX and MUST be converted to \`<math>...</math>\`. This applies to prompts, choices, and feedback. Do not render math as plain text.
3.  **Correct Interaction Placement:** Ensure interactive elements like \`<qti-text-entry-interaction>\` are placed correctly within sentences or equations to preserve their meaning.
4.  **Correct \`qti-prompt\` Placement:** The \`<qti-prompt>\` element contains the question text for an interaction and has strict placement rules:
    - **WITH an interaction:** If the item contains an interaction element (e.g., \`<qti-choice-interaction>\`, \`<qti-text-entry-interaction>\`), the \`<qti-prompt>\` MUST be placed as a direct child of that interaction element.
    - **WITHOUT an interaction:** If the item contains NO interaction elements (e.g., informational items, stimulus items), do NOT use \`<qti-prompt>\`. Instead, use a regular \`<p>\` tag for the question or prompt text.
    - **NEVER** place \`<qti-prompt>\` as a direct child of \`<qti-item-body>\`.
5.  **Avoid Leaking Answers in Multiple-Choice:** For "select all that apply" questions (\`multipleSelect: true\`), the \`max-choices\` attribute in \`<qti-choice-interaction>\` should be set to the *total number of choices*, not the number of correct answers.
6.  **Use Full Response Processing:** Do NOT use \`<qti-response-processing template="...">\`. Always write a full \`<qti-response-condition>\` block that explicitly sets BOTH the \`SCORE\` and \`FEEDBACK\` outcome variables.
7.  **Do Not Hallucinate Content:** Do not add extraneous text, symbols (like dollar signs), or formatting that is not present in the original Perseus JSON.
8.  **Handle \`sorter\` Widgets Correctly:** A Perseus \`sorter\` becomes a \`<qti-order-interaction>\`. Do not use \`min-choices\` or \`max-choices\` for simple reordering tasks, as this changes the interaction behavior.

### CRITICAL: STIMULUS BODY RULES (FOR qti-assessment-stimulus ONLY) ###

**ABSOLUTE RULE: <qti-stimulus-body> MUST CONTAIN ONLY HTML**

When generating a \`qti-assessment-stimulus\` (not \`qti-assessment-item\`), the \`<qti-stimulus-body>\` element has extremely strict content rules:

1. **NO QTI ELEMENTS ALLOWED**: The stimulus body must NEVER contain any QTI-specific elements. This includes:
   - NO \`<qti-prompt>\` elements (use \`<p>\` or \`<h2>\` instead)
   - NO interaction elements (\`<qti-choice-interaction>\`, \`<qti-text-entry-interaction>\`, etc.)
   - NO QTI structural elements
   - NO elements starting with \`qti-\`

2. **ONLY HTML ELEMENTS**: You may ONLY use standard HTML elements inside \`<qti-stimulus-body>\`:
   - Text formatting: \`<p>\`, \`<h1>\`, \`<h2>\`, \`<h3>\`, \`<strong>\`, \`<em>\`, \`<span>\`, \`<code>\`, \`<pre>\`
   - Lists: \`<ul>\`, \`<ol>\`, \`<li>\`, \`<dl>\`, \`<dt>\`, \`<dd>\`
   - Structure: \`<div>\`, \`<section>\`, \`<article>\`, \`<aside>\`, \`<header>\`, \`<footer>\`, \`<hr>\`
   - Media: \`<img>\`, \`<figure>\`, \`<figcaption>\`
   - Links: \`<a>\`
   - Tables: \`<table>\`, \`<tr>\`, \`<td>\`, \`<th>\`, \`<thead>\`, \`<tbody>\`, \`<tfoot>\`
   - Math: \`<math>\` (MathML is allowed)
   - Others: \`<blockquote>\`, \`<cite>\`, \`<br>\`

3. **PURPOSE**: Stimulus items are purely informational. They provide context, passages, or reference material for other assessment items. They CANNOT contain questions or interactions.

4. **COMMON MISTAKES TO AVOID**:
   - Do NOT use \`<qti-prompt>\` for headings or questions in stimulus - use \`<h2>\` or \`<p>\`
   - Do NOT include any interactive elements - stimulus is read-only
   - Do NOT try to collect responses within a stimulus

**Example of CORRECT stimulus body:**
\`\`\`xml
<qti-stimulus-body>
  <h2>The Water Cycle</h2>
  <p>Water continuously moves through different states in nature...</p>
  <figure>
    <img src="https://example.com/water-cycle.png" alt="Diagram of the water cycle"/>
    <figcaption>The water cycle showing evaporation, condensation, and precipitation</figcaption>
  </figure>
  <p>This process is essential for all life on Earth.</p>
</qti-stimulus-body>
\`\`\`

### CRITICAL: NOTES SECTION FOR ACCESSIBILITY ###

**Notes Section Placement and Content Rules:**

1.  **PLACEMENT:** The Notes section MUST be part of a \`<div id="reference_text">\` block that is placed BEFORE the \`<qti-prompt>\` tag. This ensures screen reader users receive the visual context before hearing the question.

2.  **NEVER REVEAL ANSWERS:** The Notes section must NEVER contain or hint at the correct answer. It exists solely to provide necessary visual context for accessibility.

3.  **CONTENT GUIDELINES:** The Notes section should describe:
    - Visual elements that are essential to understanding the problem
    - Specific measurements or positions shown in diagrams (e.g., "The mouse's nose is at the 0-inch mark")
    - Clock positions (e.g., "The hour hand is just past the 2")
    - Relative sizes or proportions (e.g., "her dad is proportionally taller")
    - Any visual information needed to solve the problem without seeing the image

4.  **FORMAT:** Use this exact structure:
    \`\`\`xml
    <div id="reference_text">
        <img src="https://..." alt="Brief description" width="X" height="Y"/>
        <p><span class="qti-italic">Note: [Detailed visual context description]</span></p>
    </div>
    <qti-prompt>...</qti-prompt>
    \`\`\`

5.  **WHEN TO INCLUDE:** Add a Notes section when:
    - The question involves measuring with rulers or visual estimation
    - Reading analog clocks or other visual instruments
    - Comparing sizes, heights, or proportions visually
    - Any problem where the image contains critical information not in the text

---
### ADDITIONAL CRITICAL BANS ###

1. **NO CDATA SECTIONS**: Never use \`<![CDATA[...]]>\` anywhere in the XML. All content must be properly XML-encoded.

2. **NO PERSEUS MARKDOWN IMAGES**: Convert any \`![alt text](url)\` syntax to proper HTML: \`<img src="url" alt="alt text"/>\`

3. **NO PERSEUS URL SCHEMES**: Convert \`web+graphie://\` to \`https://\`. Perseus uses custom URL protocols that are invalid in standard web contexts.

4. **NO INVENTED QTI ELEMENTS**: Do NOT create elements like:
   - \`<qti-plotter-interaction>\` (DOES NOT EXIST)
   - \`<qti-graphing-interaction>\` (DOES NOT EXIST)
   - \`<qti-plotter-graph>\` (DOES NOT EXIST)
   - \`<qti-plotter-axis>\` (DOES NOT EXIST)
   - \`<qti-graphing-category>\` (DOES NOT EXIST)
   - \`<object data-type="plotter">\` (NOT A VALID QTI INTERACTION)
   
   These are AI hallucinations. Use ONLY the standard QTI 3.0 elements shown in the examples.

5. **WHEN YOU CAN'T CONVERT**: If a Perseus widget has no QTI equivalent, you MUST:
   - Remove the interactive element entirely
   - Keep any instructional text
   - Add a note in the prompt like "Students should work this problem on paper"
   - Set the response type to text-entry where they can enter their final answer

---
### ABSOLUTE XML RULES - NON-NEGOTIABLE ###

1.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.**
    Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags are strictly forbidden and will cause a catastrophic failure.

    - ✅ **CORRECT:** \`</qti-simple-choice>\`, \`</p>\`, \`</math>\`, \`</div>\`
    - ❌ **ABSOLUTELY FORBIDDEN:** \`</_>\`, \`</>\`, \`</qti-simple-cho... \`

2.  **NO TRUNCATED OUTPUT.**
    Your response must be the complete XML file from start to finish. Do not stop generating mid-tag or mid-file. Ensure the final \`</${rootTag}>\` tag is present and correct.

3.  **MENTAL CHECK.**
    Before you output your final answer, perform a mental check: "Did I close every single tag I opened with its full name? Is the final closing tag present?"

4.  **REQUIRED XML ESCAPING:** Only use the absolute minimum XML character escaping required for well-formed XML. The ONLY acceptable entity references are:
    - \`&lt;\` for less-than symbol (<) when it appears in content
    - \`&gt;\` for greater-than symbol (>) when it appears in content
    - \`&amp;\` for ampersand (&) when it appears in content
     - \`&quot;\` for double quote (") when it appears in content or attribute values
    - \`&apos;\` for single quote/apostrophe (') when it appears in content or attribute values
    - ✅ **CORRECT:** \`<mo>&lt;</mo>\` (for less-than symbol), \`<mo>&gt;</mo>\` (for greater-than symbol), \`title="AT&amp;T"\`, \`title="It&apos;s correct"\`
    - ❌ **FORBIDDEN:** \`<mo><</mo>\` (raw less-than), \`title="AT&T"\` (raw ampersand), \`title="It's wrong"\` (raw apostrophe)
    - ❌ **FORBIDDEN:** \`&lt;mo&gt;&lt;/mo&gt;\` (do NOT escape the actual XML tags)

---

### Other Content Rules:
- NEVER place MathML within <qti-correct-response>. Correct responses must be simple values (e.g., "A", "7/4", "42").
- When Perseus JSON shows answerForms as ["proper", "improper"], the response MUST be a fraction.
- Remember: Users must be able to type or select the correct answer - they cannot input MathML markup!

FINAL REMINDER: The examples demonstrate PERFECT QTI 3.0 XML output. Follow their patterns exactly. Your top priority is generating a well-formed XML document with complete closing tags.
`

	logger.debug("prompt created", {
		systemInstructionLength: systemInstruction.length,
		userContentLength: userContent.length,
		totalPromptLength: systemInstruction.length + userContent.length
	})

	return { systemInstruction, userContent, rootTag }
}

/**
 * NEW: Creates the prompt for the AI-powered Content Solvability Validator.
 */
export function createQtiSufficiencyValidationPrompt(
	perseusJson: unknown,
	qtiXml: string
): { developer: string; user: string } {
	const developer =
		"You are a meticulous QTI 3.0 assessment expert. Your ONLY task is to determine if a generated QTI XML assessment item is solvable, considering both its text and any accompanying images. You must respond ONLY with a valid JSON object."

	const user = `
<task_definition>
  # Task
  Your ONLY task is to determine if the provided QTI XML is self-contained and provides sufficient information for a student to solve the question. The question is considered IMPOSSIBLE to solve if critical context, images, tables, or structural elements are missing, malformed, or altered in a way that breaks the problem's logic.

  You will be provided with the source Perseus JSON, the generated QTI XML, and an array of images referenced in the QTI XML. You MUST analyze these images for any defects that would make the question unsolvable.

  **CRITICAL CLARIFICATION:** Your job is NOT to check if the QTI is a "faithful translation" of the Perseus interaction type. A change in format (e.g., a Perseus plotter becoming a QTI multiple-choice with static images) is ACCEPTABLE and should be considered **solvable**, as long as all necessary information from the source is present in the final QTI. The ONLY question is: "Can a student solve this with the provided text and images?"
</task_definition>

<inputs>
  <perseus_json>
    ${JSON.stringify(perseusJson, null, 2)}
  </perseus_json>
  <generated_qti_xml>
    <![CDATA[
      ${qtiXml}
    ]]>
  </generated_qti_xml>
</inputs>

<instructions_and_constraints>
  # Instructions & Rules
  1.  **Compare Source and Output:** Scrutinize the Perseus \`question.content\` and compare it against the QTI \`<qti-item-body>\`.
  2.  **Analyze Images (CRITICAL):** Carefully inspect each image provided. Check for the following unsolvable conditions:
      - The image is corrupted, malformed, or fails to load.
      - The image is blank or does not display the intended content.
      - Critical information is missing from the image (e.g., a number grid is missing numbers, a diagram is missing labels, a ruler is missing markings).
      - The text in the image is illegible.

      **IMPORTANT:** When you identify a broken, nonsensical, or insufficient image, you MUST include in your reason a specific recommendation to:
      - Stop using the problematic image URL
      - Generate a custom SVG replacement that captures the intended visual content
      - Refer to the positive examples in the conversion prompt for guidance on creating inline SVG data URIs

  3.  **Check for Critical Omissions:** Identify if any information essential to solving the problem has been dropped from the text or is missing from the images.
  4.  **Do Not Judge Correctness:** Your task is NOT to check if the correct answer is right. You only check if the question is SOLVABLE.
  5.  **Strict JSON Output:** Respond ONLY with a JSON object with two keys: \`"is_solvable"\` (boolean) and \`"reason"\` (a detailed explanation with actionable recommendations ONLY if not solvable, otherwise an empty string).
</instructions_and_constraints>

<output_format>
  {
    "is_solvable": boolean,
    "reason": "string"
  }
</output_format>
`
	return { developer, user }
}

export function createQtiCorrectionPrompt(
	invalidXml: string,
	errorMessage: string,
	rootTag: "qti-assessment-item" | "qti-assessment-stimulus"
): string {
	return `You are an expert XML developer specializing in the QTI 3.0 standard. You have been given a piece of XML that was rejected by a validation pipeline, along with a JSON array of error messages from that pipeline. Your task is to analyze the XML and ALL the errors, fix ALL issues, and return the corrected XML.

# CONTEXT
<invalid_xml>
${invalidXml}
</invalid_xml>

<api_error_message>
${errorMessage}
</api_error_message>

# VALID QTI TAGS
The only valid QTI tags for this application are:
[${VALID_QTI_TAGS.join(", ")}]

# INSTRUCTIONS & RULES
1.  **Primary Goal: Fix the XML.** Your only job is to produce a valid, well-formed QTI 3.0 XML document that addresses ALL reported issues.
2.  **Analyze All Errors:** The <api_error_message> contains a JSON array of strings. Each string is a specific error message describing a problem. You must address every single error in the list.
3.  **Enforce Correct Tag Names:** The generated XML MUST only use tags from the provided valid tag list. You will often see tags like \`assessmentItem\` or \`choiceInteraction\`; these are incorrect and MUST be corrected to \`qti-assessment-item\` and \`qti-choice-interaction\`, respectively. The \`qti-\` prefix is mandatory for all QTI elements.
4.  **Remove Hallucinated Tags:** The invalid XML might contain hallucinated, non-standard tags like \`<contentBody>\`. These tags must be completely removed, but their inner content (e.g., the \`<p>\` tags within them) must be preserved and correctly placed within the parent element.
5.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.** Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags like \`</_>\` are strictly forbidden. For example, \`<p>\` must be closed with \`</p>\`.
6.  **NO TRUNCATED OUTPUT.** Your response must be the complete XML file from start to finish, beginning with \`<?xml ...?>\` and ending with the final \`</${rootTag}>\` tag.
7.  **Return ONLY XML:** Your final output must be a single JSON object containing only the corrected XML string, as per the specified schema.

# FINAL OUTPUT
Return a single JSON object with the final corrected XML.
`
}
