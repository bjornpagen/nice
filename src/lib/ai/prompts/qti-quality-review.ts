import { z } from "zod"
import type { QtiSourceContext } from "@/lib/ai/quality-review"
import { loadPromptAsset } from "./prompt-utils"

// Zod schema for the AI's JSON output
export const QtiReviewResultSchema = z.object({
	analysis: z.object({
		overallQuality: z.enum(["excellent", "good", "needs_improvement", "poor"]),
		issuesFound: z.array(
			z.object({
				category: z.string(),
				severity: z.string(),
				description: z.string()
			})
		)
	}),
	improvements: z.object({
		modificationsApplied: z.array(
			z.object({
				type: z.string(),
				description: z.string()
			})
		),
		improvedXml: z.string()
	}),
	requiresRegeneration: z.boolean()
})

export type QtiReviewResult = z.infer<typeof QtiReviewResultSchema>

export async function produceQtiQualityReviewPrompt(
	qtiXml: string,
	sourceContext: QtiSourceContext
): Promise<{ systemInstruction: string; userContent: string }> {
	const analysisReport = await loadPromptAsset("qti_analysis_report.md")

	const systemInstruction =
		"You are an expert QTI 3.0 educational content reviewer for all types of questions in all subject (math, science, social studies, etc.). Your task is to analyze a generated QTI XML assessment item, identify qualitative flaws based on a provided analysis report, and selectively rewrite ONLY the problematic sections to improve its quality while preserving the QTI structure perfectly. You MUST respond with a specific JSON object."

	const userContent = `
<task_definition>
  You must perform a quality review of the provided QTI XML. Your review is guided by the critical analysis report which details common failures.

  1.  **ANALYZE**: Scrutinize the <generated_qti_xml> for flaws based on the <qti_analysis_report>. MOST IMPORTANTLY, mentally visualize how every SVG will render in a browser - picture every line, shape, spacing, and visual element in your head. Pay obsessive attention to SVG visual quality, question logic, and educational accuracy for a THE INTENDED GRADE LEVEL OF THIS CONTENT.
  2.  **IDENTIFY**: Document every issue you find in the "analysis.issuesFound" array of your JSON response.
  3.  **IMPROVE**: If you identify any issues, you MUST attempt to fix them by rewriting ONLY the necessary content (e.g., the SVG code, text within <p> tags, or MathML). The overall QTI XML structure MUST remain IDENTICAL.
  4.  **RETURN**: You MUST return a single JSON object matching the required schema. The "improvedXml" field must contain the complete, corrected QTI XML string. If no changes were needed, return the original XML.
</task_definition>

<qti_analysis_report>
  <!-- This is your knowledge base for what constitutes a "bad" question. -->
  ${analysisReport}
</qti_analysis_report>

<source_context>
  <!-- This is the context of the original question being differentiated. -->
  <khan_id>${sourceContext.khanId}</khan_id>
  <exercise_title>${sourceContext.exerciseTitle}</exercise_title>
  <grade_level>${sourceContext.gradeLevel}</grade_level>
</source_context>

<generated_qti_xml>
  <![CDATA[
    ${qtiXml}
  ]]>
</generated_qti_xml>

<instructions_and_constraints>
  # Core Rules
  -   **Structure is Sacred**: NEVER add, remove, or reorder any QTI XML tags. Only modify the content *within* them.
  -   **SVG Quality is ABSOLUTELY CRITICAL**: You must COMPREHENSIVELY analyze every SVG element and mentally visualize exactly how it will render in a browser. Picture the final visual output in your head - every line, every shape, every piece of text, every spacing element. If you detect ANY visual ugliness, poor spacing, misalignment, missing educational elements, or rendering issues (no matter how small), you MUST fix them immediately. Replace placeholder SVGs (e.g., text-only diagrams) with fully functional, educationally accurate SVGs. A ruler needs properly spaced tick marks with correct measurements; a bar graph needs labeled axes with proper spacing and alignment; geometric shapes need precise proportions; mathematical diagrams need clean lines and proper visual hierarchy. Pay obsessive attention to: spacing between elements, text alignment, visual balance, educational clarity, proportional sizing, color contrast, and overall aesthetic quality. Even minor visual flaws are unacceptable.
  -   **Check Logic**: Ensure the question is solvable and logically sound. Fix any mismatches between question type and the number of correct answers.
  -   **Do Not Reveal Answers**: Ensure image alt text or p notes do not give away the answer.
  -   **Final Output**: The improvedXml MUST be a complete and valid QTI XML document.

  # Reasoning Process
  1.  **Deep SVG Visualization**: For every SVG, close your eyes and mentally render it pixel by pixel. Visualize how each element will appear on screen - lines, shapes, text, spacing, proportions. Ask yourself: "If a STUDENT saw this rendered SVG, would it be visually clear, aesthetically pleasing, and educationally effective?" Identify every visual flaw, no matter how minor.
  2.  **Comprehensive Analysis**: Think step-by-step about each category from the report. Does the SVG look ugly when rendered? Are there spacing issues? Missing educational elements? Is the logic broken? Are proportions wrong?
  3.  **Precise Fix Planning**: If any fix is needed, plan the exact change with obsessive detail. "I will replace the placeholder SVG rectangle with a functional ruler SVG that has 10 properly spaced tick marks, clear numerical labels, and perfect alignment."
  4.  **Construct Response**: Build the JSON object with your thorough analysis and the meticulously improved XML.
</instructions_and_constraints>
`

	return { systemInstruction, userContent }
}
