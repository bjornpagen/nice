import { loadConversionExamples } from "@/lib/qti-examples"
import { loadPromptAsset } from "./prompt-utils"

export async function produceQtiVariationsPrompt(
	sourceQtiXml: string,
	numberOfVariations: number,
	khanId: string,
	startingIndex = 1,
	validationErrors?: string[]
): Promise<{ developer: string; user: string }> {
	// ✅ ADDITION: Load proven examples for additional context
	const provenExamples = await loadConversionExamples({ type: "assessmentItem" })

	// ✅ ADDITION: Load the analysis report
	const qualitativeAnalysisReport = await loadPromptAsset("qti_analysis_report.md")
	const qualitativeFailureAnalysisBlock = `
<qualitative_failure_analysis_from_previous_run>
<!--
CRITICAL LEARNINGS: The following is an analysis of a previous generation task.
It contains examples that PASSED XML validation but FAILED human quality review.
You MUST study these failures to understand what makes a question educationally "bad" even if the XML is technically "good".
DO NOT repeat these qualitative mistakes.
-->
${qualitativeAnalysisReport}
</qualitative_failure_analysis_from_previous_run>
`

	// ✅ ADDITION: Extract key structure rules from proven system for context
	const provenStructureContext = `
<proven_qti_structure_context>
<!-- THESE ARE PROVEN EXAMPLES OF PERFECT QTI STRUCTURE FROM OUR CONVERSION SYSTEM -->
<!-- Study these examples to understand the EXACT structure patterns that pass validation -->

${provenExamples
	.slice(0, 20)
	.map(
		(example, index) => `
<proven_example_${index + 1}>
  <qti_xml>
${example.qti}
  </qti_xml>
</proven_example_${index + 1}>
`
	)
	.join("\n")}

<!-- CRITICAL VALIDATION RULES FROM PROVEN SYSTEM -->
<critical_structure_rules>
  - ALWAYS use format: 'nice_${khanId}_XXXX' where XXXX is 4-digit padded number
  - NEVER place <qti-prompt> in wrong location - study examples above
  - ALWAYS use complete closing tags: </qti-simple-choice>, never </_> or </>
  - NEVER invent QTI elements like <qti-plotter-interaction> - use only standard elements
  - ALWAYS preserve MathML structure exactly: <math xmlns="http://www.w3.org/1998/Math/MathML">
  - NEVER use CDATA sections: <![CDATA[...]]> - forbidden in QTI
  - ALWAYS escape XML properly: &lt; &gt; &amp; &quot; &apos;
  - CRITICAL: ALWAYS escape angle brackets in MathML <mo> elements: use &lt; and &gt; never < or >
  - NEVER use unescaped < or > inside <mo> tags - this breaks QTI API validation
  - ALWAYS preserve MathML namespace exactly: xmlns="http://www.w3.org/1998/Math/MathML"
  - FORBIDDEN: Named HTML entities like &nbsp; &mdash; &copy; - use Unicode characters instead
  - ONLY safe XML entities: &quot; &apos; &lt; &gt; &amp;
  - NEVER include XML comments <!-- --> as they are automatically stripped and cause validation issues
</critical_structure_rules>
</proven_qti_structure_context>
`

	// ✅ ADDITION: Render negative examples from proven system (like prompts.ts does)
	const criticalFailurePatternsBlock = `
<critical_failure_patterns>
<!-- THESE ARE REAL VALIDATION FAILURES FROM OUR SYSTEM -->
<!-- Adding these patterns helps avoid common AI generation mistakes -->
<validation_killers>
  - Unescaped angle brackets in MathML operators: <mo><</mo> instead of <mo>&lt;</mo>
  - Named HTML entities that break XML parsing
  - XML comments that get stripped and break structure
  - Missing closing tags or malformed tag nesting
  - Questions that become unsolvable due to missing context
  - Mathematical expressions that break when escaped/unescaped incorrectly
  - Khan Academy CDN images left as external URLs instead of contextually appropriate replacements
  - Using emojis for grids/charts where SVG would be more appropriate, or SVG for simple counting where emojis would work better
  - Failing to understand the educational purpose of the original image when creating replacements
</validation_killers>
</critical_failure_patterns>
`

	const negativeExamplesBlock = `
<negative_examples_from_filesystem>
<!-- THESE ARE REAL EXAMPLES OF MALFORMED QTI XML LOADED FROM OUR NEGATIVE EXAMPLES DIRECTORY -->
<!-- Each example contains an XML comment explaining why it is incorrect -->
${provenExamples
	.filter((e) => e.type === "negative")
	.map(
		(example) => `
<negative_example_from_data name="${example.name}">
  <qti_xml>
${example.qti}
  </qti_xml>
</negative_example_from_data>
`
	)
	.join("\n")}
</negative_examples_from_filesystem>
`

	const developer = ""

	// Add validation error context for retries
	const validationErrorsBlock =
		validationErrors && validationErrors.length > 0
			? `
<validation_errors_from_previous_attempt>
<!-- THESE ARE VALIDATION ERRORS FROM YOUR PREVIOUS ATTEMPT -->
<!-- Learn from these errors and avoid making the same mistakes -->
<previous_errors>
${validationErrors.map((error, index) => `  ${index + 1}. ${error}`).join("\n")}
</previous_errors>

<retry_instructions>
  CRITICAL: Your previous attempt failed validation with the above errors.
  - Study each error carefully and understand what went wrong
  - Apply the fixes directly to your new variations
  - Do NOT repeat any of the patterns that caused these validation failures
  - Generate better QTI XML that passes all validation checks
</retry_instructions>
</validation_errors_from_previous_attempt>

`
			: ""

	const user = `
${provenStructureContext}

${criticalFailurePatternsBlock}

${qualitativeFailureAnalysisBlock}

${validationErrorsBlock}<source_qti_xml><![CDATA[
${sourceQtiXml}
]]></source_qti_xml>

<task_definition>
  # Task
  Your task is to generate exactly ${numberOfVariations} new, distinct variations of the provided QTI 3.0 assessment item. Each variation MUST be a complete, valid QTI XML document that tests the same core skill but with new scenarios, numbers, contexts, or wording.
</task_definition>

<additional_requirements>
  # Output Format
  You MUST return a single JSON object. This object will have one key, "differentiatedQuestions", which is an array of strings. Each string in the array MUST be a complete and valid QTI XML document for one of the generated question variations.
  - Example: { "differentiatedQuestions": ["<qti-assessment-item>...</qti-assessment-item>", "<qti-assessment-item>...</qti-assessment-item>"] }
</additional_requirements>

<configuration_parameters>
  <number_of_variations_to_generate>${numberOfVariations}</number_of_variations_to_generate>
</configuration_parameters>

<instructions_and_constraints>
  # Instructions & Rules
  1. **Understand the Core Skill:** Deeply analyze the <source_qti_xml> to identify the specific educational skill being tested (e.g., calculating area, identifying a verb, historical knowledge).
  2. **Generate Meaningful Variations:** Create ${numberOfVariations} new questions that test the same core skill using fresh numbers, scenarios, contexts, or wording. Ensure variations are meaningfully different while preserving alignment.
  3. **Target Common Misconceptions:** For multiple-choice questions, design incorrect answers (distractors) to target common student misconceptions related to the skill. Base them on logical errors, not randomness (e.g., for area calculation, use perimeter result as a distractor).
  
  ## ⚠️ CRITICAL: Structure Preservation Rules
  4. **NEVER Modify QTI XML Structure:** The QTI XML structure (tags, attributes, nesting, organization) MUST remain exactly the same as the source. You may ONLY change:
     - Text content within tags
     - Numbers and values
     - Choice identifiers and content
     - Image sources (following image rules below, including converting external CDN URLs to inline content)
     - Mathematical expressions within existing math tags
  5. **Forbidden Structure Changes:** You MUST NOT add, remove, or rearrange:
     - QTI tags (qti-choice-interaction, qti-simple-choice, etc.)
     - XML attributes or namespaces
     - Response declarations or outcome declarations
     - Feedback blocks or processing templates
     - The overall XML hierarchy and nesting

  ## Image Handling Rules
  6. **Khan Academy CDN Image Replacement (CRITICAL):** If the source contains Khan Academy CDN URLs (e.g., "https://cdn.kastatic.org/..."), you MUST analyze its educational purpose and replace it. **NEVER keep the external URL.**
     - **For simple counting objects (cookies, animals):** Replace with HTML-rendered emojis inside span tags.
     - **For grids, charts, and geometric shapes:** Create a high-quality, educationally accurate inline SVG. Your generated SVG MUST be functional and visually clear to a 2nd grader.
  7. **SVG Quality Standards (CRITICAL):** When you generate an SVG, it is not enough for it to be a simple placeholder. It MUST be educationally sound.
     - **Rulers:** A ruler MUST have a main axis line, clearly marked and evenly-spaced tick marks, and corresponding numerical labels (e.g., 0, 1, 2, 3).
     - **Place-Value Blocks:** A diagram MUST visually render distinct hundreds blocks (large squares), tens blocks (vertical rods), and ones blocks (small squares). If items are subtracted, they must be visually crossed out with a line.
     - **Bar Graphs:** A graph MUST have clearly labeled X and Y axes, tick marks with values on the Y-axis, and bars whose heights accurately correspond to the data. Use a g transform to position elements correctly.
     - **Number Lines:** A number line MUST show jumps as curved paths with labels (e.g., +10, -5) to indicate the operation.
     - **Rendering:** ALL generated SVGs MUST include a viewBox attribute to ensure they scale correctly and are not cut off.
  8. **PNG Image Replacement:** If the source contains a PNG image, you SHOULD replace it with a contextually relevant emoji, Unicode symbol, or a new, accurate SVG that matches the new question variation.
  9. **SVG Image Editing:** If the source already contains an SVG, you MUST modify its internal elements (paths, text, values) to align with your new question variation. Preserve the SVG's structure and attributes.
  10. **Content Alignment:** All visual replacements (SVG, emoji) MUST perfectly align with the numbers, context, and logic of the new question variation. The alt text for the image must accurately describe the new visual.
  11. **CRITICAL: Do Not Reveal the Answer:** Image alt text and any associated p notes must provide context but MUST NOT contain the answer or make it obvious. Describe the setup, not the solution.

  ## Quality Assurance & Solvability Rules
  11. **Preserve Feedback Structure:** If the source includes <qti-feedback-inline>, provide unique, relevant feedback for every choice in your variations, explaining correctness or errors in the new context.
  12. **Absolute XML Well-Formedness:** Prioritize perfect XML. Open tags must have matching closing tags, attributes must be quoted, and special characters must be escaped.
  13. **Unique Identifiers:** For each variation, assign a unique identifier in the format: "nice_${khanId}_XXXX" starting from ${String(startingIndex).padStart(4, "0")}.
  14. **Strict JSON Output:** Output only the specified JSON object without any extra text or explanations.
  15. **Solvability Preservation (CRITICAL):** Your variations MUST be logically solvable.
      - After generating a question, double-check that only the intended correct answers are actually correct.
      - For single-choice questions (cardinality="single"), ensure exactly one choice is correct.
      - For multiple-select questions (cardinality="multiple"), ensure the number of correct choices you create matches the number of qti-value tags in the qti-correct-response block.
      - Check that the question provides all necessary information for a student to arrive at the answer.

  ## ⚠️ CRITICAL: Validation Survival Rules
  15. **MathML Operator Safety:** If your variation contains mathematical operators like < or > in <mo> elements, you MUST escape them as &lt; and &gt; respectively.
  16. **Solvability Preservation:** Your variations MUST remain logically solvable. NEVER create ambiguous questions or break the logical path to the correct answer.
  17. **API Compliance:** The generated XML will be validated by QTI API. Common rejection reasons include malformed MathML, invalid tag nesting, and structural inconsistencies.
  18. **Content Sufficiency:** Each variation must provide enough information for a student to solve the problem without external knowledge beyond the grade level.
  19. **Contextual Image Intelligence:** When replacing images, first understand what educational purpose the original serves (counting, spatial reasoning, measurement, etc.) and create replacements that serve the same exact purpose.
</instructions_and_constraints>

<thinking_instructions>
  # Reasoning Process
  For each variation, reason step-by-step in <thinking> tags before generating:
  1. **Analyze Core Skill:** What is the original question testing? What are the likely student misconceptions?
  2. **Plan Variation:** Brainstorm a new scenario with new numbers and context. Plan the new correct answer and plausible incorrect distractors.
  3. **Plan Visuals (If any):**
     - Identify any image needing replacement.
     - Based on the **SVG Quality Standards**, plan the exact SVG structure. Will it be a ruler, a bar graph, place-value blocks?
     - Define the necessary SVG elements: paths for number line jumps, rectangles for bars, correct labels and values.
     - For emoji replacements, choose a contextually appropriate emoji.
  4. **Self-Critique before Generating:**
     - **Visual Check:** Does my planned SVG meet all the quality standards? Is it a *functional diagram* or just a placeholder?
     - **Logic Check:** Is my question unambiguously solvable? Have I created the correct number of correct answers for the question type?
     - **Answer Check:** Does any text in my question prompt, choices, or notes accidentally give away the answer?
  5. **Generate:** Create the final QTI XML based on the refined plan.
  
  After planning all variations, perform a final <self_review> of your entire plan. Check XML validity, skill alignment, structure preservation, and that all new rules have been followed. Refine your plan if any issues are found. Only output the final, reviewed JSON.
</thinking_instructions>

${negativeExamplesBlock}

<thinking>
  <!-- Your detailed plan for the live request, following the thinking instructions. -->
</thinking>
`
	return { developer, user }
}
