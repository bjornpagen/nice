import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines one of the two tapes in the diagram
const TapeSchema = z.object({
	label: z.string().describe('The text label for this tape (e.g., "Teeth per larger gear").'),
	segments: z.number().int().positive().describe("The number of equal segments to divide this tape into."),
	color: z.string().default("rgba(66, 133, 244, 0.6)").describe("The CSS fill color for the tape segments.")
})

// The main Zod schema for the tapeDiagram function
export const TapeDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(170).describe("The total height of the output SVG container in pixels."),
		topTape: TapeSchema.describe("Configuration for the upper tape."),
		bottomTape: TapeSchema.describe("Configuration for the lower tape."),
		showTotalBracket: z
			.boolean()
			.default(false)
			.describe("If true, displays a bracket and label for the total number of segments."),
		totalLabel: z.string().default("Total").describe("The text label for the total bracket, if shown.")
	})
	.describe(
		'This template generates a "tape diagram" (also known as a bar model), a visual tool used to represent part-whole relationships in mathematics, rendered as an SVG graphic inside an HTML <div>. It is exceptionally useful for helping students model and solve word problems involving addition, subtraction, multiplication, and division. The generator will render one or more horizontal rectangular bars, or "tapes." Each tape can be a single, solid block or be divided into multiple, distinct segments. The key feature is that the lengths of the segments are proportional to the numerical values they represent. Each tape and segment can be labeled with a number (e.g., "10"), a variable (e.g., "w"), or an expression. This allows the template to visually model equations. For example, to show 10 + w = 25, one tape would be divided into a segment labeled "10" and another labeled "w", while a second tape of equal total length below it would be a single segment labeled "25". The visual alignment makes the additive relationship clear. The generator can also render a total value for an entire tape, typically displayed with a bracket above or below the bar. The final output is a clean, accurately scaled diagram that translates abstract numerical relationships into a concrete, geometric form.'
	)

export type TapeDiagramProps = z.infer<typeof TapeDiagramPropsSchema>

/**
 * This template generates a "tape diagram" (also known as a bar model), a visual tool
 * used to represent part-whole relationships in mathematics, rendered as an SVG graphic.
 * It is exceptionally useful for helping students model and solve word problems.
 */
export const generateTapeDiagram: WidgetGenerator<typeof TapeDiagramPropsSchema> = (_data) => {
	// TODO: Implement tape-diagram generation
	return "<svg><!-- TapeDiagram implementation --></svg>"
}
