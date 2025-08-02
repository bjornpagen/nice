import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the eight possible positions for an angle at an intersection
const AnglePositionSchema = z.enum(["topLeft", "topRight", "bottomLeft", "bottomRight"])

// Defines a label for a specific angle in the diagram
const AngleLabelSchema = z.object({
	intersection: z.enum(["top", "bottom"]).describe("Which of the two intersections the angle is at."),
	position: AnglePositionSchema.describe("The position of the angle within that intersection."),
	label: z.string().describe('The text or mathematical label for the angle (e.g., "x", "34°", "2x + 10").'),
	color: z.string().optional().describe('An optional CSS color for the angle\'s highlighting arc (e.g., "#1E90FF").')
})

// The main Zod schema for the parallelLinesTransversal function
export const ParallelLinesTransversalPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(280).describe("The total height of the output SVG container in pixels."),
		linesAngle: z
			.number()
			.default(0)
			.describe("The rotation angle of the two parallel lines in degrees (0 is horizontal)."),
		transversalAngle: z
			.number()
			.default(60)
			.describe("The angle of the transversal line in degrees, relative to the horizontal."),
		labels: z.array(AngleLabelSchema).describe("An array of angle labels to be drawn on the diagram.")
	})
	.describe(
		"This template generates an SVG diagram depicting two parallel lines being intersected by a transversal line. It creates eight distinct angles, any of which can be labeled with a value, variable, or expression. This is ideal for problems involving corresponding, alternate interior, and other angle relationships."
	)

export type ParallelLinesTransversalProps = z.infer<typeof ParallelLinesTransversalPropsSchema>

/**
 * This template generates an SVG diagram depicting two parallel lines
 * being intersected by a transversal line.
 */
export const generateParallelLinesTransversal: WidgetGenerator<typeof ParallelLinesTransversalPropsSchema> = (
	_data
) => {
	// TODO: Implement parallel-lines-transversal generation
	return "<svg><!-- ParallelLinesTransversal implementation --></svg>"
}
