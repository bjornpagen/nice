import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the data and state for a single bar in the chart
const BarDataSchema = z.object({
	label: z.string().describe("The label for this category, displayed on the X-axis."),
	value: z.number().describe("The numerical value of the bar, determining its height."),
	state: z
		.enum(["normal", "unknown"])
		.default("normal")
		.describe('The visual state of the bar. "unknown" bars are styled as placeholders.')
})

// The main Zod schema for the barChart function
export const BarChartPropsSchema = z
	.object({
		width: z.number().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(300).describe("The total height of the output SVG container in pixels."),
		title: z.string().optional().describe("An optional title displayed above the chart."),
		xAxisLabel: z.string().optional().describe("An optional label for the horizontal category axis."),
		yAxis: z.object({
			label: z.string().optional().describe("An optional label for the vertical value axis."),
			min: z.number().default(0).describe("The minimum value for the Y-axis scale."),
			max: z
				.number()
				.optional()
				.describe("The maximum value for the Y-axis scale. If omitted, it will be calculated automatically."),
			tickInterval: z.number().describe("The numeric interval between labeled tick marks on the Y-axis.")
		}),
		data: z.array(BarDataSchema).describe("An array of bar data objects, one for each category."),
		barColor: z.string().default("#4285F4").describe('The fill color for bars in the "normal" state.')
	})
	.describe(
		'This template generates a standard vertical bar chart as an SVG graphic. Bar charts are used to compare numerical values across a set of discrete categories. The output is highly customizable and suitable for questions involving data comparison or finding missing values. The generator will construct a complete Cartesian coordinate system with a vertical (Y) axis for numerical values and a horizontal (X) axis for categories. Both axes are configurable with titles (e.g., "Number of puppets," "Puppeteer"). The Y-axis will have labeled tick marks and optional horizontal grid lines to help read values. For each category provided, a rectangular bar is rendered. The height of the bar corresponds to its numerical value. A key feature of this template is its ability to render a bar in a distinct "unknown" or "placeholder" state. This is ideal for "missing value given the mean" problems, where the bar can be rendered as a dashed outline or a different color to indicate that its value is what the student needs to find. Regular bars have a standard fill color. All bars are clearly labeled with their category name on the X-axis.'
	)

export type BarChartProps = z.infer<typeof BarChartPropsSchema>

/**
 * This template generates a standard vertical bar chart as an SVG graphic.
 * Bar charts are used to compare numerical values across a set of discrete categories.
 * Supports rendering bars in an "unknown" state for missing value problems.
 */
export const generateBarChart: WidgetGenerator<typeof BarChartPropsSchema> = (_data) => {
	// TODO: Implement bar chart generation
	return "<svg><!-- Bar chart implementation --></svg>"
}
