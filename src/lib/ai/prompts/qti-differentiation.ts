import { loadConversionExamples } from "@/lib/qti-examples"

export async function produceQtiVariationsPrompt(
	sourceQtiXml: string,
	numberOfVariations: number,
	khanId: string,
	startingIndex = 1
): Promise<{ developer: string; user: string }> {
	// ✅ ADDITION: Load proven examples for additional context
	const provenExamples = await loadConversionExamples({ type: "assessmentItem" })

	// ✅ ADDITION: Extract key structure rules from proven system for context
	const provenStructureContext = `
<proven_qti_structure_context>
<!-- THESE ARE PROVEN EXAMPLES OF PERFECT QTI STRUCTURE FROM OUR CONVERSION SYSTEM -->
<!-- Study these examples to understand the EXACT structure patterns that pass validation -->

${provenExamples
	.slice(0, 5)
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
  - NEVER use identifiers like 'nice-tmp:x...' - these fail validation
  - ALWAYS use format: 'nice:${khanId}:XXXX' where XXXX is 4-digit padded number
  - NEVER place <qti-prompt> in wrong location - study examples above
  - ALWAYS use complete closing tags: </qti-simple-choice>, never </_> or </>
  - NEVER invent QTI elements like <qti-plotter-interaction> - use only standard elements
  - ALWAYS preserve MathML structure exactly: <math xmlns="http://www.w3.org/1998/Math/MathML">
  - NEVER use CDATA sections: <![CDATA[...]]> - forbidden in QTI
  - ALWAYS escape XML properly: &lt; &gt; &amp; &quot; &apos;
</critical_structure_rules>
</proven_qti_structure_context>
`

	// ✅ ADDITION: Render negative examples from proven system (like prompts.ts does)
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

	const user = `
${provenStructureContext}

<source_qti_xml><![CDATA[
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
  6. **External CDN Image References:** If the source contains external image URLs (especially Khan Academy CDN links like "https://cdn.kastatic.org/ka-perseus-graphie/*.svg" or "https://cdn.kastatic.org/*.png"), you MUST either:
     - **Option A:** Remove the image entirely and replace with descriptive text that captures the visual information needed for the question
     - **Option B:** Create a simple, self-contained inline SVG using data:image/svg+xml encoding that represents the essential visual elements
     - **Never keep external URL references** - all images must be either removed or converted to inline content
     - **CRITICAL: Never reveal the answer** - descriptive text must provide enough context for students to solve the problem but MUST NOT contain, hint at, or make obvious the correct answer
     - Ensure any replacement preserves the educational value and accessibility of the visual information
  7. **PNG Image Replacement:** If the source contains PNG images (<img src="*.png" />), you SHOULD replace them with appropriate emojis or Unicode symbols that match the new content context. For example:
     - Science concepts: use 🔬, ⚗️, 🧪, 🧬, ⚡, 🌍, 🌊, 🌟
     - General objects: use relevant emojis (🍎 for apple, 🏠 for house, 🚗 for car, etc.)
     - Replace the entire <img> tag with the emoji/symbol directly in the text
  8. **SVG Image Editing:** If the source contains SVG images, you MUST modify the SVG content to match your new question variation while keeping the same SVG structure:
     - Update text labels within SVG to match new context
     - Modify numbers, dimensions, or values shown in the SVG
     - Change colors, shapes, or diagram elements as needed for the new scenario
     - Ensure the SVG remains valid and well-formed XML
  9. **Image Content Alignment:** All image replacements or edits MUST align perfectly with the new question content and context.

  ## Quality Assurance Rules
  9. **Preserve Feedback Structure:** If the source includes <qti-feedback-inline> for choices, provide unique, relevant feedback for every choice in variations, explaining correctness or errors in the new context.
  10. **Absolute XML Well-Formedness:** Prioritize perfect XML: Open tags must have matching closing tags, attributes quoted, special characters escaped (e.g., &lt; for <).
  11. **Unique Identifiers:** For each variation, assign a unique identifier in this exact format: "nice:${khanId}:XXXX" where XXXX is a 4-digit number starting from ${String(startingIndex).padStart(4, "0")} (e.g., "nice:${khanId}:${String(startingIndex).padStart(4, "0")}", "nice:${khanId}:${String(startingIndex + 1).padStart(4, "0")}", etc.).
  12. **Strict JSON Output:** Output only the specified JSON object without extra text.
</instructions_and_constraints>

<thinking_instructions>
  # Reasoning Process
  For each variation, reason step-by-step in <thinking> tags before generating:
  1. Analyze core skill and misconceptions.
  2. Plan distinct variation (new elements, distractors).
  3. Identify any images that need replacement/editing and plan appropriate substitutions:
     - Check for external CDN URLs (especially Khan Academy links) and plan removal or inline SVG replacement
     - Ensure descriptive text replacements provide context without revealing the answer
     - Plan PNG-to-emoji replacements
     - Plan SVG content modifications
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
