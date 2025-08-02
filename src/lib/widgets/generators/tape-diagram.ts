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
		'Generates a "tape diagram" or "bar model" as an SVG graphic to represent part-whole relationships. This widget is exceptionally useful for modeling and solving word problems involving ratios or algebraic equations. It renders one or two tapes, each composed of proportionally sized segments that can be labeled with numbers or variables. By visually aligning tapes or their segments, it translates abstract numerical relationships into a concrete, geometric form, making concepts like "3x = 15" intuitive.'
	)

export type TapeDiagramProps = z.infer<typeof TapeDiagramPropsSchema>

/**
 * Generates a "tape diagram" (bar model) to visually represent part-whole relationships,
 * perfect for modeling ratios and simple algebraic equations.
 */
export const generateTapeDiagram: WidgetGenerator<typeof TapeDiagramPropsSchema> = (_data) => {
	// TODO: Implement tape-diagram generation
	return "<svg><!-- TapeDiagram implementation --></svg>"
}
