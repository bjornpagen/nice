import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines one of the two number lines in the diagram
const LineSchema = z.object({
	label: z.string().describe('The text label for this quantity (e.g., "Time (seconds)").'),
	ticks: z
		.array(z.union([z.string(), z.number()]))
		.describe("An array of values to label the tick marks in order from left to right.")
})

// The main Zod schema for the doubleNumberLine function
export const DoubleNumberLinePropsSchema = z
	.object({
		width: z.number().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(150).describe("The total height of the output SVG container in pixels."),
		topLine: LineSchema.describe("Configuration for the upper number line."),
		bottomLine: LineSchema.describe(
			"Configuration for the lower number line. Must have the same number of ticks as the top line."
		)
	})
	.refine((data) => data.topLine.ticks.length === data.bottomLine.ticks.length, {
		message: "Top and bottom lines must have the same number of tick values.",
		path: ["bottomLine", "ticks"]
	})
	.describe(
		'This template generates a double number line diagram as a clear and accurate SVG graphic. This visualization tool is excellent for illustrating the relationship between two different quantities that share a constant ratio. The generator will render two parallel horizontal lines, one above the other. Each line represents a different quantity and will have a text label (e.g., "Time (minutes)", "Items"). Both lines are marked with a configurable number of equally spaced tick marks. The core of the template is the array of corresponding values for the tick marks on each line. For example, the top line might have values [0, 1, 2, 3, 4] while the bottom line has [0, 50, 100, 150, 200]. The generator will place these labels at the correct tick marks, visually aligning the proportional pairs. Some labels can be omitted to create "fill-in-the-blank" style questions where the student must deduce the missing value. The resulting SVG is a powerful visual aid for solving ratio problems.'
	)

export type DoubleNumberLineProps = z.infer<typeof DoubleNumberLinePropsSchema>

/**
 * This template generates a double number line diagram as a clear and accurate SVG graphic.
 * This visualization tool is excellent for illustrating the relationship between two
 * different quantities that share a constant ratio.
 */
export const generateDoubleNumberLine: WidgetGenerator<typeof DoubleNumberLinePropsSchema> = (_data) => {
	// TODO: Implement double-number-line generation
	return "<svg><!-- DoubleNumberLine implementation --></svg>"
}
