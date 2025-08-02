import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single segment within a tape
const TapeSegmentSchema = z.object({
	label: z.string().describe('The text label to display inside this segment (e.g., "10", "w").'),
	length: z.number().positive().describe("The numerical length of the segment for proportional rendering.")
})

// Defines one of the two tapes in the diagram
const TapeSchema = z.object({
	label: z.string().describe('The text label for this tape (e.g., "Teeth per larger gear").'),
	segments: z.array(TapeSegmentSchema).min(1).describe("An array of segment objects that make up this tape."),
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
		'This template generates a "tape diagram" (also known as a bar model), a visual tool used to represent part-whole relationships in mathematics, rendered as an SVG graphic inside an HTML <div>. It is exceptionally useful for helping students model and solve word problems involving addition, subtraction, multiplication, and division. The generator will render two horizontal rectangular bars, or "tapes." Each tape is composed of one or more segments, where each segment has its own label and length. The key feature is that the lengths of the segments are proportional to their numerical values. Each segment can be labeled with a number (e.g., "10"), a variable (e.g., "w"), or an expression. This allows the template to visually model equations. For example, to show 10 + w = 25, the bottom tape would be divided into two segments: one with label "10" and length 10, and another with label "w" and length 15, while the top tape would be a single segment with label "25" and length 25. The visual alignment makes the additive relationship clear. The generator can also render a total bracket and label for the combined segments. The final output is a clean, accurately scaled diagram that translates abstract numerical relationships into a concrete, geometric form.'
	)

export type TapeDiagramProps = z.infer<typeof TapeDiagramPropsSchema>

/**
 * This template generates a "tape diagram" (also known as a bar model), a visual tool
 * used to represent part-whole relationships in mathematics, rendered as an SVG graphic.
 * Each tape can have multiple segments with individual labels and lengths, making it
 * perfect for modeling equations like 10 + w = 25 where segments have different sizes.
 */
export const generateTapeDiagram: WidgetGenerator<typeof TapeDiagramPropsSchema> = (_data) => {
	// TODO: Implement tape-diagram generation
	return "<svg><!-- TapeDiagram implementation --></svg>"
}
