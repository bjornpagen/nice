import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single data point on the scatter plot
const ScatterPointSchema = z.object({
	x: z.number().describe("The value of the point on the horizontal (X) axis."),
	y: z.number().describe("The value of the point on the vertical (Y) axis."),
	label: z.string().optional().describe("An optional text label to display near the point.")
})

// Defines the properties of an axis (X or Y)
const AxisSchema = z.object({
	label: z.string().describe('The text title for the axis (e.g., "Driver Age").'),
	min: z.number().describe("The minimum value displayed on the axis."),
	max: z.number().describe("The maximum value displayed on the axis."),
	tickInterval: z.number().describe("The numeric interval between tick marks on the axis."),
	gridLines: z.boolean().default(false).describe("If true, display grid lines for this axis.")
})

// Defines a linear trend line using slope and y-intercept
const LinearTrendLineSchema = z.object({
	type: z.literal("linear").describe("Specifies a straight line."),
	slope: z.number().describe("The slope of the line (rise over run)."),
	yIntercept: z.number().describe("The y-value where the line crosses the Y-axis.")
})

// Defines a nonlinear (quadratic) trend curve
const QuadraticTrendLineSchema = z.object({
	type: z.literal("quadratic").describe("Specifies a parabolic curve."),
	a: z.number().describe("The coefficient for the x^2 term in y = ax^2 + bx + c."),
	b: z.number().describe("The coefficient for the x term in y = ax^2 + bx + c."),
	c: z.number().describe("The constant term (y-intercept) in y = ax^2 + bx + c.")
})

// Defines the visual styling and labeling for any trend line
const TrendLineStyleSchema = z.object({
	id: z.string().describe('A unique identifier for the line (e.g., "line-a").'),
	label: z.string().optional().describe('An optional label to display next to the line (e.g., "A", "B").'),
	color: z
		.string()
		.default("#D9534F")
		.describe('The color of the line, as a CSS color string (e.g., "red", "#FF0000").'),
	style: z.enum(["solid", "dashed"]).default("solid").describe("The style of the line."),
	data: z
		.union([LinearTrendLineSchema, QuadraticTrendLineSchema])
		.describe("The mathematical definition of the line or curve.")
})

// The main Zod schema for the scatterPlot function
export const ScatterPlotPropsSchema = z
	.object({
		width: z.number().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(400).describe("The total height of the output SVG container in pixels."),
		title: z.string().optional().describe("An optional title displayed above or below the plot."),
		xAxis: AxisSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: AxisSchema.describe("Configuration for the vertical (Y) axis."),
		points: z.array(ScatterPointSchema).describe("An array of data points to be plotted."),
		trendLines: z
			.array(TrendLineStyleSchema)
			.optional()
			.describe("An optional array of one or more trend lines or curves to overlay on the plot.")
	})
	.describe(
		"This template generates a two-dimensional scatter plot as an SVG graphic. It constructs a full Cartesian coordinate system and plots data points at specified (x, y) coordinates. Its key feature is the ability to render one or more trend lines (linear or nonlinear) to model the relationship between variables. This is ideal for questions about lines of best fit, data modeling, and making predictions."
	)

export type ScatterPlotProps = z.infer<typeof ScatterPlotPropsSchema>

/**
 * This template generates a two-dimensional scatter plot as an SVG graphic, with support for overlaying trend lines.
 */
export const generateScatterPlot: WidgetGenerator<typeof ScatterPlotPropsSchema> = (_data) => {
	// TODO: Implement scatter-plot generation
	return "<svg><!-- ScatterPlot implementation --></svg>"
}
