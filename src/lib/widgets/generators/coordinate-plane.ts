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
	color: z.string().default("#4285F4").describe("The color of the point, as a CSS color string.")
})

// Defines a polygon to be drawn by connecting a series of points
const PolygonSchema = z.object({
	vertices: z
		.array(z.string())
		.min(3)
		.describe("An array of point `id` strings, in the order they should be connected to form a closed shape."),
	fillColor: z
		.string()
		.default("rgba(66, 133, 244, 0.3)")
		.describe("The fill color of the polygon, as a CSS color string (e.g., with alpha for transparency)."),
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
		polygons: z
			.array(PolygonSchema)
			.optional()
			.describe("An optional array of polygons to draw on the plane by connecting the defined points.")
	})
	.describe(
		"This is a powerful and versatile template designed to generate a complete, standards-compliant, two-dimensional Cartesian coordinate plane as an SVG graphic. It replaces the `coordinatePlaneWithPoints` widget and handles all use cases, from plotting simple points to drawing complex polygons. The resulting SVG is embedded within an HTML <div>, ensuring it is scalable and accessible. The generator constructs a full coordinate system with highly configurable features for axes, grid lines, quadrant labels, point plotting, and polygon drawing. This single template is sufficient to generate all diagrams found in the examples, from simple quadrant identification questions to complex problems involving the area and perimeter of polygons defined by coordinates."
	)

export type CoordinatePlaneProps = z.infer<typeof CoordinatePlanePropsSchema>

/**
 * This is a powerful and versatile template designed to generate a complete, standards-compliant,
 * two-dimensional Cartesian coordinate plane as an SVG graphic. The resulting SVG is embedded
 * within an HTML <div>, ensuring it is scalable, accessible, and ready for integration.
 */
export const generateCoordinatePlane: WidgetGenerator<typeof CoordinatePlanePropsSchema> = (_data) => {
	// TODO: Implement coordinate-plane generation
	return "<svg><!-- CoordinatePlane implementation --></svg>"
}
