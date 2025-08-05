import { loadConversionExamples } from "@/lib/qti-generation/examples-loader"

export async function produceQtiParaphrasingPrompt(sourceQtiXml: string): Promise<{ developer: string; user: string }> {
	// ✅ ADDITION: Load proven examples for additional context
	const provenExamples = await loadConversionExamples({ type: "stimulus" })

	// ✅ ADDITION: Extract key structure rules from proven system for context
	const provenStructureContext = `
<proven_qti_structure_context>
<!-- THESE ARE PROVEN EXAMPLES OF PERFECT QTI STRUCTURE FROM OUR CONVERSION SYSTEM -->
<!-- Study these examples to understand the EXACT structure patterns that pass validation -->

${provenExamples
	.slice(0, 3)
	.map(
		(example, index) => `
<proven_stimulus_example_${index + 1}>
  <qti_xml>
${example.qti}
  </qti_xml>
</proven_stimulus_example_${index + 1}>
`
	)
	.join("\n")}

<!-- CRITICAL VALIDATION RULES FROM PROVEN SYSTEM -->
<critical_structure_rules>
  - ALWAYS preserve identifier format exactly as in source
  - NEVER place elements in wrong hierarchy positions
  - NEVER change element nesting or structure
  - PRESERVE all namespaces exactly: xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  - PRESERVE all schema locations exactly
  - PRESERVE all XML declaration headers exactly
</critical_structure_rules>
</proven_qti_structure_context>
`

	const developer = `You are an AI that helps paraphrase QTI assessment stimuli to create variations while maintaining identical structure and validity.

${provenStructureContext}

## Critical Instructions

**PARAPHRASING RULES:**
1. **Content Changes Only**: Modify ONLY the textual content while preserving ALL structural elements
2. **Structure Preservation**: The XML structure, element hierarchy, and attributes MUST remain identical
3. **Educational Equivalence**: Maintain the same educational concepts and difficulty level
4. **Natural Language**: Ensure paraphrased content flows naturally and remains pedagogically sound

**ABSOLUTE PROHIBITIONS:**
1. NEVER modify the QTI XML structure, element names, or hierarchy
2. NEVER change identifiers, namespaces, or schema references
3. NEVER alter mathematical expressions or formatting
4. NEVER change image references or multimedia elements
5. NEVER modify metadata or technical attributes

**VALIDATION REQUIREMENTS:**
- Output must pass QTI validation
- Must maintain identical element structure
- Must preserve all technical attributes
- Content should be educationally equivalent but linguistically different

## Output Format

Return a single valid QTI XML stimulus that is a paraphrase of the input while maintaining identical structure.`

	const user = `Please paraphrase the following QTI assessment stimulus. You must maintain the exact same XML structure, elements, and attributes while only changing the textual content to create a natural variation.

Source QTI Stimulus:
\`\`\`xml
${sourceQtiXml}
\`\`\`

Return only the paraphrased QTI XML stimulus (no additional text or explanation).`

	return { developer, user }
}
