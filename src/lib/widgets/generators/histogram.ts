import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single bar (bin) in the histogram
const HistogramBinSchema = z.object({
	label: z.string().describe('The label for the bin, displayed on the X-axis (e.g., "0-10", "10-20").'),
	frequency: z.number().int().min(0).describe("The count of data points in this bin, which determines the bar height.")
})

// Defines the properties of an axis
const HistogramAxisSchema = z.object({
	label: z.string().describe('The text title for the axis (e.g., "Number of Guests" or "Frequency").'),
	max: z
		.number()
		.int()
		.optional()
		.describe("An optional maximum value for the Y-axis scale. If not provided, it will be inferred from the data."),
	tickInterval: z.number().optional().describe("An optional numeric interval for tick marks on the Y-axis.")
})

// The main Zod schema for the histogram function
export const HistogramPropsSchema = z
	.object({
		width: z.number().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(300).describe("The total height of the output SVG container in pixels."),
		title: z.string().optional().describe("An optional title displayed above the histogram."),
		xAxis: HistogramAxisSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: HistogramAxisSchema.describe("Configuration for the vertical (Y) axis."),
		bins: z.array(HistogramBinSchema).describe("An array of bin objects, each defining its label and frequency.")
	})
	.describe(
		'This template generates a standards-compliant histogram as an SVG graphic inside a <div>. A histogram is a bar chart that displays the frequency distribution of numerical data by grouping it into a series of consecutive, non-overlapping intervals (or "bins"). The generator constructs a complete Cartesian coordinate system with a horizontal X-axis and a vertical Y-axis. The X-axis represents the data intervals (e.g., "0-10", "10-20") and is labeled accordingly. The Y-axis represents the frequency (count) of data points within each interval and will have labeled tick marks to indicate the scale. Both axes can have titles (e.g., "Number of Guests", "Frequency"). For each specified bin, a rectangular bar is rendered. The width of the bar corresponds to the interval range, and the bars are drawn adjacent to one another to show the continuous nature of the data. The height of each bar is proportional to the frequency of data points falling into that bin. The final output is a clean and accurate visualization, essential for questions about the shape, center, and spread of continuous data.'
	)

export type HistogramProps = z.infer<typeof HistogramPropsSchema>

/**
 * Generates a standard histogram as an SVG graphic.
 * Histograms are used to visualize the distribution of continuous numerical data by dividing it into intervals (bins).
 * Unlike bar charts, histogram bars are adjacent to each other.
 */
export const generateHistogram: WidgetGenerator<typeof HistogramPropsSchema> = (_data) => {
	// TODO: Implement histogram generation
	return "<svg><!-- Histogram implementation --></svg>"
}
