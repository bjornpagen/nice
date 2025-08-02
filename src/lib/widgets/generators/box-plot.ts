import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the boxPlot function
export const BoxPlotPropsSchema = z
	.object({
		width: z.number().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(120).describe("The total height of the output SVG container in pixels."),
		axis: z
			.object({
				min: z.number().describe("The minimum value displayed on the axis scale."),
				max: z.number().describe("The maximum value displayed on the axis scale."),
				label: z.string().optional().describe('An optional title for the horizontal axis (e.g., "Number of cookies").'),
				tickLabels: z
					.array(z.number())
					.optional()
					.describe("An optional array of numbers to display as tick labels on the axis.")
			})
			.describe("Configuration for the horizontal number line."),
		summary: z
			.object({
				min: z.number().describe("The minimum value of the data set (left whisker endpoint)."),
				q1: z.number().describe("The first quartile (left edge of the box)."),
				median: z.number().describe("The median value (line inside the box)."),
				q3: z.number().describe("The third quartile (right edge of the box)."),
				max: z.number().describe("The maximum value of the data set (right whisker endpoint).")
			})
			.describe("The five-number summary used to draw the plot."),
		boxColor: z.string().default("#cce5ff").describe("A CSS color string for the fill of the box."),
		medianColor: z.string().default("#ff0000").describe("A CSS color string for the median line.")
	})
	.describe(
		'This template generates a standard horizontal box-and-whisker plot as an SVG graphic. This type of plot is a powerful tool for summarizing the distribution of a numerical data set through its five-number summary: minimum, first quartile (Q1), median, third quartile (Q3), and maximum. The generator will render a horizontal number line with labeled tick marks to provide scale. Above this axis, the box plot is constructed. A central rectangle (the "box") is drawn, with its left edge at the first quartile (Q1) and its right edge at the third quartile (Q3). The length of this box thus represents the Interquartile Range (IQR). A vertical line is drawn inside the box to mark the median (the 50th percentile). From the left side of the box, a horizontal line (the "whisker") extends to the minimum value of the data set. From the right side of the box, another whisker extends to the maximum value. These whiskers can be capped with small vertical lines. The entire plot provides a concise visual summary of the data\'s center (median), spread (IQR and range), and skewness. The generator allows for customization of colors for the box and median line to enhance readability.'
	)

export type BoxPlotProps = z.infer<typeof BoxPlotPropsSchema>

/**
 * This template generates a standard horizontal box-and-whisker plot as an SVG graphic.
 * This type of plot is a powerful tool for summarizing the distribution of a numerical
 * data set through its five-number summary.
 */
export const generateBoxPlot: WidgetGenerator<typeof BoxPlotPropsSchema> = (_data) => {
	// TODO: Implement box plot generation
	return "<svg><!-- Box plot implementation --></svg>"
}
