import { loadConversionExamples } from "@/lib/qti-examples"

export async function produceQtiVariationsPrompt(
	sourceQtiXml: string,
	numberOfVariations: number,
	khanId: string,
	startingIndex = 1,
	validationErrors?: string[]
): Promise<{ developer: string; user: string }> {
	// ✅ ADDITION: Load proven examples for additional context
	const provenExamples = await loadConversionExamples({ type: "assessmentItem" })

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
  6. **Khan Academy CDN Image Replacement (CRITICAL):** If the source contains Khan Academy CDN URLs like "https://cdn.kastatic.org/ka-perseus-graphie/*.png" or "https://cdn.kastatic.org/*.svg", you MUST analyze the image's educational purpose and replace contextually:
     - **NEVER keep the external URL** - always replace with appropriate content based on what the image represents
     - **For simple counting objects (cookies, toys, animals):** Replace with HTML-rendered emojis that students can count in span tags
     - **For grids, charts, geometric shapes, or structured layouts:** Create simple inline SVG that represents the same visual structure and educational concept
     - **For mathematical diagrams:** Create clean inline SVG with proper geometric elements, labels, and measurements
     - **Be contextually intelligent:** Understand what educational purpose the original image serves and replicate that function in your replacement
  7. **External CDN Image References (General):** For other external image URLs, you MUST either:
     - **Option A:** Remove the image entirely and replace with descriptive text that captures the visual information needed for the question
     - **Option B:** Create a simple, self-contained inline SVG using data:image/svg+xml encoding that represents the essential visual elements
     - **Never keep external URL references** - all images must be either removed or converted to inline content
     - **CRITICAL: Never reveal the answer** - descriptive text must provide enough context for students to solve the problem but MUST NOT contain, hint at, or make obvious the correct answer
     - Ensure any replacement preserves the educational value and accessibility of the visual information
  8. **PNG Image Replacement:** If the source contains PNG images (<img src="*.png" />), you SHOULD replace them with appropriate emojis or Unicode symbols that match the new content context. For example:
     - Science concepts: use microscope, beaker, test tube, DNA, lightning, earth, wave, star emojis
     - General objects: use relevant emojis (apple, house, car, etc.)
     - Replace the entire <img> tag with the emoji/symbol directly in the text
  9. **SVG Image Editing:** If the source contains SVG images, you MUST modify the SVG content to match your new question variation while keeping the same SVG structure:
     - Update text labels within SVG to match new context
     - Modify numbers, dimensions, or values shown in the SVG
     - Change colors, shapes, or diagram elements as needed for the new scenario
     - Ensure the SVG remains valid and well-formed XML
  10. **Image Content Alignment:** All image replacements or edits MUST align perfectly with the new question content and context.

  ## Quality Assurance Rules
  11. **Preserve Feedback Structure:** If the source includes <qti-feedback-inline> for choices, provide unique, relevant feedback for every choice in variations, explaining correctness or errors in the new context.
  12. **Absolute XML Well-Formedness:** Prioritize perfect XML: Open tags must have matching closing tags, attributes quoted, special characters escaped (e.g., &lt; for <).
  13. **Unique Identifiers:** For each variation, assign a unique identifier in this exact format: "nice_${khanId}_XXXX" where XXXX is a 4-digit number starting from ${String(startingIndex).padStart(4, "0")} (e.g., "nice_${khanId}_${String(startingIndex).padStart(4, "0")}", "nice_${khanId}_${String(startingIndex + 1).padStart(4, "0")}", etc.).
  14. **Strict JSON Output:** Output only the specified JSON object without extra text.

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
  1. Analyze core skill and misconceptions.
  2. Plan distinct variation (new elements, distractors).
  3. Identify any images that need replacement/editing and plan appropriate substitutions:
     - **Analyze what the original image represents:** Is it counting objects, a grid, a chart, geometric shapes, or mathematical diagrams?
     - **For counting objects (cookies, toys, animals):** Plan emoji replacement with span tags - choose emojis that match your new context
     - **For grids, charts, or structured layouts:** Plan inline SVG creation that replicates the visual structure and educational purpose
     - **For mathematical diagrams:** Plan SVG with proper geometric elements, measurements, and labels
     - **Ensure contextual accuracy:** Your replacement must serve the same educational function as the original image
     - Plan PNG-to-emoji/SVG replacements based on context, not just format
  4. Verify structure preservation, feedback alignment, and XML validity.
  Generate 2-3 reasoning paths if needed and select the most consistent. After all variations, critique in <self_review> tags: Check XML validity, skill alignment, distinctness, structure preservation, image handling, and ensure no descriptive text reveals answers. Refine if issues found (but output only final JSON).
</thinking_instructions>

${negativeExamplesBlock}

<thinking>
  <!-- Your detailed plan for the live request, following the thinking instructions. -->
</thinking>
`
	return { developer, user }
}
