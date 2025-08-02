import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single point to be plotted on the number line
const NumberLinePointSchema = z.object({
	value: z.number().describe("The numerical value where the point is located on the line."),
	label: z
		.string()
		.optional()
		.describe('An optional text label to display next to the point (e.g., "A", "Minnesota").'),
	color: z.string().default("#4285F4").describe("The CSS color of the point."),
	labelPosition: z
		.enum(["above", "below", "left", "right"])
		.optional()
		.describe("Specifies the position of the label relative to the point.")
})

// Defines a custom label for a specific tick mark (e.g., "sea level" at 0)
const SpecialTickLabelSchema = z.object({
	value: z.number().describe("The value on the number line to label."),
	label: z.string().describe("The custom text for the label.")
})

// The main Zod schema for the numberLine function
export const NumberLinePropsSchema = z
	.object({
		width: z.number().default(460).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(100).describe("The total height of the output SVG container in pixels."),
		orientation: z
			.enum(["horizontal", "vertical"])
			.default("horizontal")
			.describe("The orientation of the number line."),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		majorTickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		minorTicksPerInterval: z
			.number()
			.default(0)
			.describe("The number of unlabeled minor ticks to draw between each major tick."),
		points: z
			.array(NumberLinePointSchema)
			.optional()
			.describe("An optional array of point objects to be plotted on the line."),
		specialTickLabels: z
			.array(SpecialTickLabelSchema)
			.optional()
			.describe('Optional custom labels for specific values on the line (e.g., labeling 0 as "sea level").')
	})
	.describe(
		'This is a highly versatile template designed to generate a precise and customizable number line as an SVG graphic. It can be rendered horizontally (for general number comparisons) or vertically (often used for temperature, elevation, or financial contexts). The generator will construct a line representing a specified numerical range (minimum and maximum values). The line will be marked with labeled major tick marks at a configurable interval. It also supports rendering smaller, unlabeled minor tick marks between the major ones to show finer gradations (e.g., quarters, tenths). This is crucial for questions involving fractions and decimals. A key feature is the ability to plot multiple points on the line. Each point is defined by its numerical value and can be styled with a specific color. An accompanying text label (e.g., a letter like "A", a name like "Minnesota", or a value like "−78 °C") can be positioned above, below, or next to each point. Special labels, such as "sea level" or "Zero balance," can be associated with specific values like 0. The final output is a clean, accurately scaled, and accessible SVG graphic ready for embedding in a QTI item, suitable for a wide range of questions from identifying points to comparing rational numbers.'
	)

export type NumberLineProps = z.infer<typeof NumberLinePropsSchema>

/**
 * This is a highly versatile template designed to generate a precise and customizable
 * number line as an SVG graphic. It can be rendered horizontally (for general number
 * comparisons) or vertically (often used for temperature, elevation, or financial contexts).
 */
export const generateNumberLine: WidgetGenerator<typeof NumberLinePropsSchema> = (_data) => {
	// TODO: Implement number-line generation
	return "<svg><!-- NumberLine implementation --></svg>"
}
