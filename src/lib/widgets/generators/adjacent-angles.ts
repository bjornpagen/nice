import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single angle segment in the diagram
const AngleSegmentSchema = z.object({
	value: z.number().describe("The measure of the angle in degrees."),
	label: z.string().describe('The text label for the angle measure (e.g., "35°", "x").'),
	color: z.string().describe("The primary color for the angle arc and fill, as a CSS color string."),
	arcRadius: z.number().describe("The radius of the arc used to denote this angle.")
})

// Defines the optional total angle that encompasses all segments
const TotalAngleSchema = z.object({
	label: z.string().describe('The text label for the total angle measure (e.g., "135°").'),
	color: z.string().describe("The color for the total angle arc, as a CSS color string."),
	arcRadius: z.number().describe("The radius for the outer arc representing the total angle.")
})

// The main Zod schema for the adjacentAngles function
export const AdjacentAnglesPropsSchema = z
	.object({
		width: z.number().default(600).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(400).describe("The total height of the output SVG container in pixels."),
		vertexLabel: z.string().default("A").describe("The label for the common vertex point."),
		rayLabels: z
			.array(z.string())
			.describe(
				'An array of labels for the endpoints of the rays, starting from the baseline ray (e.g., ["B", "C", "D", "E"]).'
			),
		angles: z
			.array(AngleSegmentSchema)
			.describe(
				"An array of angle segments, ordered from the baseline. The number of angles should be one less than the number of rays."
			),
		totalAngle: TotalAngleSchema.optional().describe(
			"An optional configuration for displaying the total angle arc and label."
		),
		baselineAngle: z
			.number()
			.default(0)
			.describe("The angle in degrees of the first ray, typically 0 for a horizontal baseline.")
	})
	.describe(
		'This template generates a precise geometric diagram of multiple adjacent angles sharing a common vertex. It is ideal for questions based on the Angle Addition Postulate, where parts of a larger angle sum up to the whole. The generator will render an SVG containing a set of rays originating from a single point. Each individual angle formed by adjacent rays is highlighted with a distinct colored arc. These arcs can be labeled with a number (e.g., "35°") or a variable (e.g., "x"). An optional larger arc can be drawn to span across all the smaller angles, complete with its own label (e.g., "135°").'
	)

export type AdjacentAnglesProps = z.infer<typeof AdjacentAnglesPropsSchema>

/**
 * This template generates a precise geometric diagram of multiple adjacent angles sharing a common vertex.
 * It is ideal for questions based on the Angle Addition Postulate.
 */
export const generateAdjacentAngles: WidgetGenerator<typeof AdjacentAnglesPropsSchema> = (_data) => {
	// TODO: Implement adjacent-angles generation
	return "<svg><!-- AdjacentAngles implementation --></svg>"
}
