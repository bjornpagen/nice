import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties of an axis (X or Y)
const AxisSchema = z.object({
	label: z
		.string()
		.optional()
		.describe('The text title for the axis (e.g., "Number of Days"). If omitted, a simple "x" or "y" may be used.'),
	min: z.number().describe("The minimum value displayed on the axis."),
	max: z.number().describe("The maximum value displayed on the axis."),
	tickInterval: z.number().describe("The numeric interval between labeled tick marks on the axis."),
	showGridLines: z.boolean().default(true).describe("If true, display grid lines for this axis.")
})

// Defines a single point to be plotted on the coordinate plane
const PointSchema = z.object({
	id: z.string().describe("A unique identifier for this point, used to reference it when creating polygons."),
	x: z.number().describe("The value of the point on the horizontal (X) axis."),
	y: z.number().describe("The value of the point on the vertical (Y) axis."),
	label: z.string().optional().describe('An optional text label to display near the point (e.g., "A", "(m, n)").'),
	color: z.string().default("#4285F4").describe("The color of the point, as a CSS color string."),
	style: z.enum(["open", "closed"]).default("closed").describe("Visual style for the point marker.")
})

// Defines a linear trend line using slope and y-intercept
const SlopeInterceptLineSchema = z.object({
	type: z.literal("slopeIntercept").describe("Specifies a straight line in y = mx + b form."),
	slope: z.number().describe("The slope of the line (m)."),
	yIntercept: z.number().describe("The y-value where the line crosses the Y-axis (b).")
})

// Defines a straight line to be plotted on the plane
const LineSchema = z.object({
	id: z.string().describe('A unique identifier for the line (e.g., "line-a").'),
	equation: SlopeInterceptLineSchema.describe("The mathematical definition of the line."),
	color: z
		.string()
		.default("#D9534F")
		.describe('The color of the line, as a CSS color string (e.g., "red", "#FF0000").'),
	style: z.enum(["solid", "dashed"]).default("solid").describe("The style of the line.")
})

// Defines a polygon or polyline to be drawn by connecting a series of points
const PolygonSchema = z.object({
	vertices: z
		.array(z.string())
		.min(2)
		.describe(
			"An array of point `id` strings, in the order they should be connected. Requires at least 2 points for a line, 3 for a polygon."
		),
	isClosed: z
		.boolean()
		.default(true)
		.describe(
			"If true, connects the last vertex to the first to form a closed shape. If false, renders an open polyline."
		),
	fillColor: z
		.string()
		.default("rgba(66, 133, 244, 0.3)")
		.describe(
			"The fill color of the polygon, as a CSS color string (e.g., with alpha for transparency). Only applies if isClosed is true."
		),
	strokeColor: z.string().default("rgba(66, 133, 244, 1)").describe("The border color of the polygon."),
	label: z.string().optional().describe("An optional label for the polygon itself.")
})

// The main Zod schema for the coordinatePlane function
export const CoordinatePlanePropsSchema = z
	.object({
		width: z.number().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(400).describe("The total height of the output SVG container in pixels."),
		xAxis: AxisSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: AxisSchema.describe("Configuration for the vertical (Y) axis."),
		showQuadrantLabels: z
			.boolean()
			.default(false)
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		points: z.array(PointSchema).optional().describe("An optional array of points to plot on the plane."),
		lines: z
			.array(LineSchema)
			.optional()
			.describe("An optional array of infinite lines to draw on the plane, defined by their equations."),
		polygons: z
			.array(PolygonSchema)
			.optional()
			.describe("An optional array of polygons or polylines to draw on the plane by connecting the defined points.")
	})
	.describe(
		"Generates a complete two-dimensional Cartesian coordinate plane as an SVG graphic. This versatile widget can render a feature-rich plane with configurable axes, grid lines, and quadrant labels. It supports plotting labeled points, drawing polygons by connecting vertices, rendering open polylines (e.g., for piecewise functions), and plotting infinite lines from their slope-intercept equations. This single widget is suitable for a vast range of coordinate geometry problems."
	)

export type CoordinatePlaneProps = z.infer<typeof CoordinatePlanePropsSchema>

/**
 * Generates a versatile Cartesian coordinate plane for plotting points, lines, and polygons.
 * Supports a wide range of coordinate geometry problems.
 */
export const generateCoordinatePlane: WidgetGenerator<typeof CoordinatePlanePropsSchema> = (_data) => {
	// TODO: Implement coordinate-plane generation
	return "<svg><!-- CoordinatePlane implementation --></svg>"
}
