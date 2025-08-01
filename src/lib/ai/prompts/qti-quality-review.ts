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
	const coneExample = await loadPromptAsset("cone_svg_example.md")

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

<cone_svg_gold_standard>
  <!-- This is the GOLD STANDARD for ALL 3D shape SVG creation. Use this EXACT approach for cones, cylinders, cubes, spheres, pyramids, prisms, and any other 3D geometric shapes. -->
  ${coneExample}
</cone_svg_gold_standard>

<svg_quality_examples>
  <!-- These are concrete examples of EXCELLENT vs HORRIBLE SVG quality that you must internalize. -->
  
  ## EXCELLENT SVG EXAMPLE - Coordinate Grid with Point
  This is a PERFECT example of educational SVG quality:
  
  <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='400'%20viewBox='0%200%20400%20400'%3E%3Crect%20x='0'%20y='0'%20width='400'%20height='400'%20fill='white'/%3E%3Cline%20x1='50'%20y1='350'%20x2='350'%20y2='350'%20stroke='black'%20stroke-width='2'/%3E%3Cline%20x1='50'%20y1='350'%20x2='50'%20y2='50'%20stroke='black'%20stroke-width='2'/%3E%3Cline%20x1='50'%20y1='345'%20x2='50'%20y2='355'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='50'%20y='370'%20font-size='12'%20text-anchor='middle'%3E0%3C/text%3E%3Cline%20x1='200'%20y1='345'%20x2='200'%20y2='355'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='200'%20y='370'%20font-size='12'%20text-anchor='middle'%3E5%3C/text%3E%3Cline%20x1='350'%20y1='345'%20x2='350'%20y2='355'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='350'%20y='370'%20font-size='12'%20text-anchor='middle'%3E10%3C/text%3E%3Cline%20x1='45'%20y1='350'%20x2='55'%20y2='350'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='35'%20y='355'%20font-size='12'%20text-anchor='end'%3E0%3C/text%3E%3Cline%20x1='45'%20y1='110'%20x2='55'%20y2='110'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='35'%20y='115'%20font-size='12'%20text-anchor='end'%3E8%3C/text%3E%3Cline%20x1='50'%20y1='110'%20x2='350'%20y2='110'%20stroke='gray'%20stroke-dasharray='4,2'%20stroke-width='1'/%3E%3Cline%20x1='200'%20y1='350'%20x2='200'%20y2='50'%20stroke='gray'%20stroke-dasharray='4,2'%20stroke-width='1'/%3E%3Ccircle%20cx='200'%20cy='110'%20r='6'%20fill='blue'/%3E%3C/svg%3E">
  
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
  
  <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='400'%20viewBox='0%200%20400%20400'%3E%3Crect%20x='0'%20y='0'%20width='400'%20height='400'%20fill='white'/%3E%3Cline%20x1='0'%20y1='200'%20x2='400'%20y2='200'%20stroke='gray'%20stroke-width='2'/%3E%3Cline%20x1='200'%20y1='0'%20x2='200'%20y2='400'%20stroke='gray'%20stroke-width='2'/%3E%3Cline%20x1='0'%20y1='195'%20x2='0'%20y2='205'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='0'%20y='215'%20font-size='12'%20text-anchor='middle'%20fill='black'%3E-10%3C/text%3E%3C!--%20...%20more%20tick%20marks%20and%20labels%20...%20--%3E%3Ccircle%20cx='320'%20cy='260'%20r='8'%20fill='blue'/%3E%3Ctext%20x='330'%20y='255'%20font-size='12'%20fill='black'%3EA%3C/text%3E%3C/svg%3E">
  
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
  
  <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='400'%3E%3Cg%20transform='translate(40,20)'%3E%3Cline%20class='axis'%20x1='0'%20y1='180'%20x2='320'%20y2='180'/%3E%3Cline%20class='axis'%20x1='40'%20y1='0'%20x2='40'%20y2='360'/%3E%3Ctext%20x='40'%20y='195'%3EMon%3C/text%3E%3Ctext%20x='80'%20y='195'%3ETue%3C/text%3E%3Ctext%20x='120'%20y='195'%3EWed%3C/text%3E%3Ctext%20x='160'%20y='195'%3EThu%3C/text%3E%3Ctext%20x='200'%20y='195'%3EFri%3C/text%3E%3Ctext%20x='240'%20y='195'%3ESat%3C/text%3E%3Ctext%20x='280'%20y='195'%3ESun%3C/text%3E%3Ctext%20x='28'%20y='340'%3E10%3C/text%3E%3Ctext%20x='28'%20y='300'%3E20%3C/text%3E%3Ctext%20x='28'%20y='260'%3E30%3C/text%3E%3Ctext%20x='28'%20y='220'%3E40%3C/text%3E%3C!--%20MISSING%2050!%20--%3E%3Ctext%20x='28'%20y='140'%3E60%3C/text%3E%3Ctext%20x='28'%20y='100'%3E70%3C/text%3E%3Ctext%20x='28'%20y='60'%3E80%3C/text%3E%3Ccircle%20cx='200'%20cy='100'%20r='6'/%3E%3Ctext%20x='212'%20y='92'%3EA%3C/text%3E%3C/g%3E%3C/svg%3E">
  
  **Why this is EDUCATIONALLY PROBLEMATIC:**
  - Y-axis starts at 10, not 0 (confusing origin point)
  - Missing the value 50 in the sequence (10, 20, 30, 40, 60, 70, 80)
  - Origin is not at mathematical (0,0) but at (Mon, 10)
  - X-axis uses categorical data (days) instead of numerical coordinates
  - Students expecting standard coordinate grid behavior will be confused
  - Not suitable for coordinate geometry or standard math graphing exercises
  
  ## HORRENDOUS SVG EXAMPLE - DO NOT CREATE ANYTHING LIKE THIS
  This is what you must NEVER allow:
  
  <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='400'%20viewBox='0%200%20400%20400'%3E%3Cg%20transform='translate(50,350)%20scale(30,-30)'%3E%3Ctext%20x='1'%20y='-0.3'%3E1%3C/text%3E%3Ctext%20x='2'%20y='-0.3'%3E2%3C/text%3E%3C!--%20Text%20appears%20upside%20down%20due%20to%20negative%20scale%20--%3E%3Ccircle%20cx='7'%20cy='12'%20r='0.3'%20fill='blue'/%3E%3C/g%3E%3C/svg%3E">
  
  **Why this is HORRIFIC:**
  - Text is upside down due to negative scale transform
  - Elements get cut off at boundaries
  - No clear axes or proper grid structure
  - Point is barely visible
  - Overall rendering is illegible and confusing
  - Educational value is completely destroyed
  
  ## EXCELLENT SCATTER PLOT EXAMPLE - Perfect Educational Chart
  This demonstrates the GOLD STANDARD for scatter plots and data visualization:
  
  <img src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='300'%20viewBox='0%200%20400%20300'%3E%3Crect%20x='0'%20y='0'%20width='400'%20height='300'%20fill='white'/%3E%3Cline%20x1='50'%20y1='50'%20x2='50'%20y2='250'%20stroke='black'%20stroke-width='2'/%3E%3Cline%20x1='50'%20y1='250'%20x2='350'%20y2='250'%20stroke='black'%20stroke-width='2'/%3E%3C!-- vertical%20grid%20--%3E%3Cline%20x1='100'%20y1='250'%20x2='100'%20y2='50'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='150'%20y1='250'%20x2='150'%20y2='50'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='200'%20y1='250'%20x2='200'%20y2='50'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='250'%20y1='250'%20x2='250'%20y2='50'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='300'%20y1='250'%20x2='300'%20y2='50'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3C!-- horizontal%20grid%20--%3E%3Cline%20x1='50'%20y1='200'%20x2='350'%20y2='200'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='50'%20y1='150'%20x2='350'%20y2='150'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='50'%20y1='100'%20x2='350'%20y2='100'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3Cline%20x1='50'%20y1='50'%20x2='350'%20y2='50'%20stroke='%23dddddd'%20stroke-width='1'/%3E%3C!-- x-axis%20ticks%20and%20labels%20--%3E%3Cline%20x1='50'%20y1='255'%20x2='50'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='100'%20y1='255'%20x2='100'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='150'%20y1='255'%20x2='150'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='200'%20y1='255'%20x2='200'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='250'%20y1='255'%20x2='250'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='300'%20y1='255'%20x2='300'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='350'%20y1='255'%20x2='350'%20y2='245'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='50'%20y='265'%20font-size='12'%20text-anchor='middle'%3E0%3C/text%3E%3Ctext%20x='100'%20y='265'%20font-size='12'%20text-anchor='middle'%3E2%3C/text%3E%3Ctext%20x='150'%20y='265'%20font-size='12'%20text-anchor='middle'%3E4%3C/text%3E%3Ctext%20x='200'%20y='265'%20font-size='12'%20text-anchor='middle'%3E6%3C/text%3E%3Ctext%20x='250'%20y='265'%20font-size='12'%20text-anchor='middle'%3E8%3C/text%3E%3Ctext%20x='300'%20y='265'%20font-size='12'%20text-anchor='middle'%3E10%3C/text%3E%3Ctext%20x='350'%20y='265'%20font-size='12'%20text-anchor='middle'%3E12%3C/text%3E%3C!-- y-axis%20ticks%20and%20labels%20--%3E%3Cline%20x1='45'%20y1='250'%20x2='55'%20y2='250'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='45'%20y1='200'%20x2='55'%20y2='200'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='45'%20y1='150'%20x2='55'%20y2='150'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='45'%20y1='100'%20x2='55'%20y2='100'%20stroke='black'%20stroke-width='1'/%3E%3Cline%20x1='45'%20y1='50'%20x2='55'%20y2='50'%20stroke='black'%20stroke-width='1'/%3E%3Ctext%20x='45'%20y='250'%20font-size='12'%20text-anchor='end'%3E60%3C/text%3E%3Ctext%20x='45'%20y='200'%20font-size='12'%20text-anchor='end'%3E70%3C/text%3E%3Ctext%20x='45'%20y='150'%20font-size='12'%20text-anchor='end'%3E80%3C/text%3E%3Ctext%20x='45'%20y='100'%20font-size='12'%20text-anchor='end'%3E90%3C/text%3E%3Ctext%20x='45'%20y='50'%20font-size='12'%20text-anchor='end'%3E100%3C/text%3E%3C!-- axis%20titles%20--%3E%3Ctext%20x='200'%20y='290'%20font-size='14'%20text-anchor='middle'%3EHours%20Studied%3C/text%3E%3Ctext%20transform='rotate(-90)'%20x='-150'%20y='15'%20font-size='14'%20text-anchor='middle'%3EExam%20Score%3C/text%3E%3C!-- data%20points%20--%3E%3Ccircle%20cx='100'%20cy='200'%20r='5'%20fill='%234285F4'/%3E%3Ccircle%20cx='150'%20cy='175'%20r='5'%20fill='%234285F4'/%3E%3Ccircle%20cx='200'%20cy='125'%20r='5'%20fill='%234285F4'/%3E%3Ccircle%20cx='250'%20cy='100'%20r='5'%20fill='%234285F4'/%3E%3Ccircle%20cx='300'%20cy='75'%20r='5'%20fill='%234285F4'/%3E%3C/svg%3E">
  
  **Why this scatter plot is EXCELLENT:**
  - Bold, clear axes with proper 2px stroke-width for main lines
  - Professional grid system with subtle #dddddd lines that aid reading without overwhelming
  - Perfect tick marks (1px stroke-width) with consistent 10px spacing
  - All text labels properly positioned with correct text-anchor alignment
  - Meaningful axis titles ("Hours Studied", "Exam Score") with proper rotation for Y-axis
  - Data points are clearly visible with 5px radius and professional blue color (#4285F4)
  - Excellent use of whitespace and margins (50px buffer zones)
  - Scale progresses logically (0,2,4,6,8,10,12 for X-axis; 60,70,80,90,100 for Y-axis)
  - Shows clear positive correlation pattern that supports educational objectives
  - All elements are precisely positioned for maximum readability
  - Perfect example for statistics, data analysis, and correlation concepts

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
  -   **3D GEOMETRIC SHAPES - MANDATORY GOLD STANDARD**: For ANY 3D geometric shape (cones, cylinders, spheres, pyramids, prisms, etc.), you MUST follow the EXACT implementation standards from the cone_svg_gold_standard. This means: (1) ALWAYS use base64 encoding (data:image/svg+xml;base64,), NEVER URL encoding with %3C %3E, (2) Create proper 3D perspective with curved surfaces using SVG path arc commands, (3) Use linear and radial gradients for realistic depth and lighting effects, (4) Show hidden edges with dashed lines for proper geometric understanding, (5) Implement clean polygon arrows instead of broken marker fragments that fail in data URIs, (6) Use professional typography (Arial font family, bold weight, 16px minimum size), (7) Ensure proper proportions and educational accuracy. The cone example demonstrates the PERFECT approach - any 3D shape that doesn't meet this standard MUST be completely rewritten to match it. NO EXCEPTIONS.
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
       - **For 3D shapes (cones, cylinders, spheres, pyramids, prisms): Does it match the cone_svg_gold_standard? Base64 encoding? Proper 3D perspective with curved surfaces? Gradients for depth? Hidden edges shown with dashed lines? Clean polygon arrows? Professional typography? NO URL encoding allowed!**
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
       - **"For 3D shapes: I will completely rewrite this oversimplified 3D shape SVG following the cone_svg_gold_standard exactly: convert to base64 encoding, add proper curved surfaces using SVG path arc commands, implement linear and radial gradients for realistic 3D depth, show hidden edges with dashed lines, replace broken marker arrows with clean polygon shapes, use Arial font family with bold weight and 16px size, ensure professional proportions and educational accuracy"**
  
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
