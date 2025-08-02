import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the labels for the different parts of the parallelogram
const ParallelogramLabelsSchema = z.object({
	base: z.string().optional().describe('The label for the base length (e.g., "7", "b").'),
	height: z.string().optional().describe('The label for the perpendicular height (e.g., "5", "h").'),
	slantedSide: z.string().optional().describe("An optional label for the slanted side length.")
})

// The main Zod schema for the parallelogramDiagram function
export const ParallelogramDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(160).describe("The total height of the output SVG container in pixels."),
		base: z.number().describe("The length of the base of the parallelogram in model units."),
		heightValue: z.number().describe("The perpendicular height of the parallelogram in model units."),
		slantAngle: z
			.number()
			.min(1)
			.max(179)
			.describe("The interior angle of the slanted side, in degrees. 90 creates a rectangle."),
		labels: ParallelogramLabelsSchema.describe("An object containing the text labels for the dimensions.")
	})
	.describe(
		'This template generates a precise SVG diagram of a parallelogram. It is designed to visually represent parallelograms in geometry problems, especially those involving area calculations. The generator constructs a four-sided parallelogram with two pairs of parallel sides. The shape is defined by its base length, its perpendicular height, and a slant angle which controls how "tilted" the shape is (a slant angle of 90 degrees would produce a rectangle). Key features include: Drawing the parallelogram outline. Clearly labeling the length of the base. Drawing a perpendicular height (altitude) from the top base to the bottom base, rendered as a dashed line to distinguish it from the sides. Placing a right-angle marker where the height meets the base. Labeling the height and, optionally, the length of the slanted side. Labels can be numerical values or variables (e.g., "h"). The output is a self-contained and accurate SVG graphic, ideal for QTI items where students must find the area of a parallelogram, or calculate a missing base or height given the area.'
	)

export type ParallelogramDiagramProps = z.infer<typeof ParallelogramDiagramPropsSchema>

/**
 * This template generates a precise SVG diagram of a parallelogram.
 * It is designed to visually represent parallelograms in geometry problems,
 * especially those involving area calculations.
 */
export const generateParallelogramDiagram: WidgetGenerator<typeof ParallelogramDiagramPropsSchema> = (_data) => {
	// TODO: Implement parallelogram-diagram generation
	return "<svg><!-- ParallelogramDiagram implementation --></svg>"
}
