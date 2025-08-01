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

  1.  **ANALYZE**: Scrutinize the <generated_qti_xml> for flaws based on the <qti_analysis_report>. MOST IMPORTANTLY, mentally visualize how every SVG will render in a browser - picture every line, shape, spacing, and visual element in your head. Pay obsessive attention to SVG visual quality, question logic, and educational accuracy.
  2.  **IDENTIFY**: Document every issue you find in the "analysis.issuesFound" array of your JSON response.
  3.  **IMPROVE**: If you identify any issues, you MUST attempt to fix them by rewriting ONLY the necessary content (e.g., the SVG code, text within <p> tags, or MathML). The overall QTI XML structure MUST remain IDENTICAL.
  4.  **RETURN**: You MUST return a single JSON object matching the required schema. The "improvedXml" field must contain the complete, corrected QTI XML string. If no changes were needed, return the original XML.
</task_definition>

<qti_analysis_report>
  <!-- This is your knowledge base for what constitutes a "bad" question. -->
  ${analysisReport}
</qti_analysis_report>

<svg_quality_examples>
  <!-- These are concrete examples of EXCELLENT vs HORRIBLE SVG quality that you must internalize. -->
  
  ## EXCELLENT SVG EXAMPLE - Coordinate Grid with Point
  This is a PERFECT example of educational SVG quality:
  
  \`\`\`xml
  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>
    <rect x='0' y='0' width='400' height='400' fill='white'/>
    <line x1='50' y1='350' x2='350' y2='350' stroke='black' stroke-width='2'/>
    <line x1='50' y1='350' x2='50' y2='50' stroke='black' stroke-width='2'/>
    <line x1='50' y1='345' x2='50' y2='355' stroke='black' stroke-width='1'/>
    <text x='50' y='370' font-size='12' text-anchor='middle'>0</text>
    <line x1='200' y1='345' x2='200' y2='355' stroke='black' stroke-width='1'/>
    <text x='200' y='370' font-size='12' text-anchor='middle'>5</text>
    <line x1='350' y1='345' x2='350' y2='355' stroke='black' stroke-width='1'/>
    <text x='350' y='370' font-size='12' text-anchor='middle'>10</text>
    <line x1='45' y1='350' x2='55' y2='350' stroke='black' stroke-width='1'/>
    <text x='35' y='355' font-size='12' text-anchor='end'>0</text>
    <line x1='45' y1='110' x2='55' y2='110' stroke='black' stroke-width='1'/>
    <text x='35' y='115' font-size='12' text-anchor='end'>8</text>
    <line x1='50' y1='110' x2='350' y2='110' stroke='gray' stroke-dasharray='4,2' stroke-width='1'/>
    <line x1='200' y1='350' x2='200' y2='50' stroke='gray' stroke-dasharray='4,2' stroke-width='1'/>
    <circle cx='200' cy='110' r='6' fill='blue'/>
  </svg>
  \`\`\`
  
  **Why this is EXCELLENT:**
  - Clear, bold axes with proper stroke-width
  - Perfect tick marks that are visible but not overwhelming
  - Text labels are properly positioned and never cut off
  - Grid lines are subtle (gray, dashed) but helpful
  - Point is clearly visible with appropriate size
  - All spacing is mathematically precise
  - Nothing overlaps or gets cut off
  - Educational clarity is perfect
  
  ## ACCEPTABLE SVG EXAMPLE - Coordinate Grid with Negative Values
  This is good enough but could be improved:
  
  \`\`\`xml
  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>
    <rect x='0' y='0' width='400' height='400' fill='white'/>
    <line x1='0' y1='200' x2='400' y2='200' stroke='gray' stroke-width='2'/>
    <line x1='200' y1='0' x2='200' y2='400' stroke='gray' stroke-width='2'/>
    <line x1='0' y1='195' x2='0' y2='205' stroke='black' stroke-width='1'/>
    <text x='0' y='215' font-size='12' text-anchor='middle' fill='black'>-10</text>
    <!-- ... more tick marks and labels ... -->
    <circle cx='320' cy='260' r='8' fill='blue'/>
    <text x='330' y='255' font-size='12' fill='black'>A</text>
  </svg>
  \`\`\`
  
  **What makes this acceptable:**
  - Axes are clearly drawn
  - Labels are readable and positioned correctly
  - Point is visible and labeled
  - Nothing gets cut off
  
  **Minor issues that could be improved:**
  - Could use better visual hierarchy (axes vs grid lines)
  - Point labeling could be more elegant
  
  ## CONFUSING SVG EXAMPLE - AVOID THIS PATTERN
  This graph looks decent visually but has serious educational problems:
  
  \`\`\`xml
  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <g transform='translate(40,20)'>
      <line class='axis' x1='0' y1='180' x2='320' y2='180'/>
      <line class='axis' x1='40' y1='0' x2='40' y2='360'/>
      <text x='40' y='195'>Mon</text>
      <text x='80' y='195'>Tue</text>
      <text x='120' y='195'>Wed</text>
      <text x='160' y='195'>Thu</text>
      <text x='200' y='195'>Fri</text>
      <text x='240' y='195'>Sat</text>
      <text x='280' y='195'>Sun</text>
      <text x='28' y='340'>10</text>
      <text x='28' y='300'>20</text>
      <text x='28' y='260'>30</text>
      <text x='28' y='220'>40</text>
      <!-- MISSING 50! -->
      <text x='28' y='140'>60</text>
      <text x='28' y='100'>70</text>
      <text x='28' y='60'>80</text>
      <circle cx='200' cy='100' r='6'/>
      <text x='212' y='92'>A</text>
    </g>
  </svg>
  \`\`\`
  
  **Why this is EDUCATIONALLY PROBLEMATIC:**
  - Y-axis starts at 10, not 0 (confusing origin point)
  - Missing the value 50 in the sequence (10, 20, 30, 40, 60, 70, 80)
  - Origin is not at mathematical (0,0) but at (Mon, 10)
  - X-axis uses categorical data (days) instead of numerical coordinates
  - Students expecting standard coordinate grid behavior will be confused
  - Not suitable for coordinate geometry or standard math graphing exercises
  
  ## HORRENDOUS SVG EXAMPLE - DO NOT CREATE ANYTHING LIKE THIS
  This is what you must NEVER allow:
  
  \`\`\`xml
  <svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>
    <g transform='translate(50,350) scale(30,-30)'>
      <text x='1' y='-0.3'>1</text>
      <text x='2' y='-0.3'>2</text>
      <!-- Text appears upside down due to negative scale -->
      <circle cx='7' cy='12' r='0.3' fill='blue'/>
    </g>
  </svg>
  \`\`\`
  
  **Why this is HORRIFIC:**
  - Text is upside down due to negative scale transform
  - Elements get cut off at boundaries
  - No clear axes or proper grid structure
  - Point is barely visible
  - Overall rendering is illegible and confusing
  - Educational value is completely destroyed
  
  ## QUALITY CRITERIA FOR ALL SVG TYPES
  
  ### Graphs and Plots (Bar charts, Line graphs, Scatter plots):
  - Axes MUST be clearly drawn with appropriate stroke-width (2-3px)
  - Tick marks MUST be visible and properly spaced
  - Labels MUST be readable, never upside down, never cut off
  - Data points MUST be clearly visible (minimum 4px radius for circles)
  - Grid lines should be subtle but helpful (gray, dashed, 1px)
  - Proper margins to prevent text cutoff (minimum 50px on all sides)
  
  ### Number Lines:
  - Main line MUST be bold and clearly visible
  - Tick marks MUST be evenly spaced and properly sized
  - Numbers MUST be centered under tick marks
  - Arrow heads should indicate direction if applicable
  - Highlighted points should be clearly distinguishable
  
  ### Geometric Shapes:
  - Lines MUST be clean and precise
  - Angles MUST be mathematically accurate
  - Labels and measurements MUST be clearly positioned
  - No overlapping text or elements
  - Proper proportions for educational accuracy
  
  ### Box Plots and Statistical Charts:
  - Boxes MUST have clear borders and proper fill
  - Whiskers MUST extend to correct lengths
  - Outliers MUST be clearly marked as distinct points
  - Scale MUST be clearly labeled and mathematically accurate
  
  ### Mathematical Diagrams:
  - All elements MUST be educationally accurate
  - Text labels MUST be positioned to enhance understanding
  - Visual hierarchy MUST guide the eye properly
  - No ambiguous or confusing visual elements
  
  ### Coordinate Grids and Mathematical Graphs:
  - Origin (0,0) MUST be clearly marked and positioned correctly
  - Axes MUST start at 0 unless there's a clear educational reason otherwise
  - Number sequences MUST be complete with no missing values
  - For coordinate geometry, use numerical values, not categorical data
  - Scale MUST be consistent and mathematically accurate
  - Grid intersections should align perfectly with coordinate values
  
  ### Universal Requirements:
  - NOTHING should ever appear upside down
  - NOTHING should get cut off at edges
  - Text must ALWAYS be readable at target font sizes (12px minimum)
  - Colors must have sufficient contrast for accessibility
  - Spacing must be generous enough to prevent visual crowding
  - All measurements and scales must be mathematically precise
</svg_quality_examples>

<source_context>
  <!-- This is the context of the original question being differentiated. -->
  <khan_id>${sourceContext.khanId}</khan_id>
  <exercise_title>${sourceContext.exerciseTitle}</exercise_title>
</source_context>

<generated_qti_xml>
  <![CDATA[
    ${qtiXml}
  ]]>
</generated_qti_xml>

<instructions_and_constraints>
  # Core Rules
  -   **Structure is Sacred**: NEVER add, remove, or reorder any QTI XML tags. Only modify the content *within* them.
  -   **SVG Quality is ABSOLUTELY CRITICAL**: You must COMPREHENSIVELY analyze every SVG element and mentally visualize exactly how it will render in a browser. Picture the final visual output in your head - every line, every shape, every piece of text, every spacing element. EVERY SVG must meet the standard of the EXCELLENT example provided above - clear axes, proper spacing, readable labels, perfect alignment. If you detect ANY visual ugliness, poor spacing, misalignment, missing educational elements, or rendering issues (no matter how small), you MUST fix them immediately. NEVER allow anything that resembles the HORRENDOUS example - no upside down text, no cut off elements, no unclear visual hierarchy. Replace placeholder SVGs (e.g., text-only diagrams) with fully functional, educationally accurate SVGs that match the quality criteria provided. Use the specific technical requirements: minimum 50px margins, 2-3px stroke-width for main axes, 12px minimum font size, proper text-anchor positioning, clear visual hierarchy. Pay obsessive attention to: spacing between elements, text alignment, visual balance, educational clarity, proportional sizing, color contrast, and overall aesthetic quality. Even minor visual flaws are unacceptable.
  -   **Check Logic**: Ensure the question is solvable and logically sound. Fix any mismatches between question type and the number of correct answers.
  -   **Do Not Reveal Answers**: Ensure image alt text or p notes do not give away the answer.
  -   **Final Output**: The improvedXml MUST be a complete and valid QTI XML document.

  # Systematic Quality Review Methodology: DECONSTRUCT → DIAGNOSE → REPAIR → RECONSTRUCT
  
  ## STEP 1: DECONSTRUCTION - "What is the system and where are the problems?"
  
  1.1. **Identify the Overall QTI System**: Understand the complete QTI XML structure. What type of question is this (choice-interaction, multiple-select, etc.)? What subject? What educational objective is being assessed?
  
  1.2. **Isolate Components for Analysis**: Systematically examine each component:
       - **Visual Components**: Every SVG, image, diagram, chart, graph
       - **Content Components**: Question prompt, answer choices, feedback blocks
       - **Logic Components**: Response declarations, correct answers, scoring
       - **Educational Components**: Age-appropriate content, learning objectives
  
  1.3. **Prepare Components for Deep Analysis**: For each SVG, extract and decode it mentally. For complex structures, break them down into constituent elements (axes, labels, data points, shapes, etc.).
  
  ## STEP 2: DIAGNOSIS - "What is the difference between what IS and what SHOULD BE?"
  
  2.1. **Define the Correct Educational Standard**: For each component, establish the benchmark:
       - **SVG Quality Standard**: Must match EXCELLENT examples (clear axes, proper spacing, readable labels, correct origin, complete sequences)
       - **Educational Standard**: Age-appropriate, mathematically accurate, pedagogically sound
       - **Technical Standard**: Valid QTI structure, proper response processing, clear feedback
  
  2.2. **Systematic Comparison Analysis**: Compare actual vs. correct state:
       
       **Visual Diagnosis Checklist**:
       - Close your eyes and mentally render every SVG pixel by pixel
       - Compare directly to EXCELLENT examples - does it meet that standard?
       - For coordinate grids: Is origin at (0,0)? Do axes start at 0? Any missing numbers in sequences?
       - For graphs: Are axes 2-3px stroke-width? Tick marks visible? Labels positioned correctly?
       - Universal checks: 50px margin? 12px font-size? Any upside down elements? Cut-off text? Overlapping elements?
       
       **Educational Diagnosis Checklist**:
       - Is content educationally appropriate and clearly presented?
       - Are mathematical concepts accurate and clearly presented?
       - Does the question assess the stated learning objective?
       - Are there any logical inconsistencies or confusing elements?
       
       **Technical Diagnosis Checklist**:
       - Is the QTI structure valid and complete?
       - Do response declarations match the interaction type?
       - Is scoring logic correct?
       - Are feedback blocks appropriate and helpful?
  
  2.3. **The "Aha!" Moment - Pinpoint Exact Discrepancies**: Document every specific error found:
       - **Primary Errors**: Critical issues that break educational value (e.g., wrong origin, upside down text, illogical answers)
       - **Secondary Errors**: Minor issues that reduce quality (e.g., poor spacing, missing labels, unclear hierarchy)
  
  ## STEP 3: REPAIR - "How do I make the ACTUAL STATE match the CORRECT STATE?"
  
  3.1. **Formulate Precise Repair Plan**: For each diagnosed error, plan the exact surgical fix:
       - "I will replace this problematic SVG with a coordinate grid following the EXCELLENT pattern: 400x400 viewBox, 50px margins, 2px stroke-width for axes, proper tick marks with 1px stroke-width, 12px font-size labels with correct text-anchor positioning"
       - "I will correct the Y-axis sequence from (10,20,30,40,60,70,80) to (0,10,20,30,40,50,60,70,80) with proper origin at (0,0)"
       - "I will fix the question logic by changing from single-choice to multiple-choice since two answers are correct"
  
  3.2. **Execute Targeted Changes**: Make ONLY the necessary modifications:
       - **Correct** wrong values, parameters, coordinates
       - **Add** missing educational elements, labels, tick marks
       - **Remove** faulty, redundant, or confusing elements  
       - **Reorder** if sequence or logic is incorrect
       - **Replace** if component is fundamentally broken beyond repair
  
  ## STEP 4: RECONSTRUCT AND VERIFY - "Did the fix work and did I break anything else?"
  
  4.1. **Reintegrate Components**: Ensure the repaired components work within the complete QTI XML structure.
  
  4.2. **Final Systematic Verification**:
       - **Integrity Check**: Is the overall QTI XML still valid? No broken tags or malformed structure?
       - **Goal Achievement Check**: Does every component now match the CORRECT STATE defined in Step 2?
       - **Educational Effectiveness Check**: Will this question effectively assess student learning?
       - **Visual Quality Check**: Do all SVGs meet the EXCELLENT standard when mentally rendered?
       - **Completeness Check**: Have I addressed ALL issues identified in the diagnosis phase?
  
  4.3. **Construct Final Response**: Build the JSON object with:
       - **Thorough Analysis**: Document every issue found during diagnosis
       - **Complete Improved XML**: The fully reconstructed, verified QTI assessment item
       - **Modification Summary**: Clear description of what was repaired and why
</instructions_and_constraints>
`

	return { systemInstruction, userContent }
}
