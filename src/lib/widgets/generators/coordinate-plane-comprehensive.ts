import { z } from "zod"
import {
	createAxisOptionsSchema,
	createDistanceSchema,
	createLineSchema,
	createPlotPointSchema,
	createPolygonSchema,
	createPolylineSchema,
	ErrInvalidDimensions,
	generateCoordinatePlaneBase,
	renderDistances,
	renderLines,
	renderPoints,
	renderPolygons,
	renderPolylines
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const CoordinatePlaneComprehensivePropsSchema = z
	.object({
		type: z.literal("coordinatePlane"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total height of the output SVG container in pixels."),
		xAxis: createAxisOptionsSchema().describe("Configuration for the horizontal (X) axis."),
		yAxis: createAxisOptionsSchema().describe("Configuration for the vertical (Y) axis."),
		showQuadrantLabels: z
			.boolean()
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		points: z.array(createPlotPointSchema()).nullable().describe("An optional array of points to plot on the plane."),
		lines: z
			.array(createLineSchema())
			.nullable()
			.describe("An optional array of infinite lines to draw on the plane, defined by their equations."),
		polygons: z
			.array(createPolygonSchema())
			.nullable()
			.describe("An optional array of polygons or polylines to draw on the plane by connecting the defined points."),
		distances: z
			.array(createDistanceSchema())
			.nullable()
			.describe("An optional array of distances to visualize between points."),
		polylines: z
			.array(createPolylineSchema())
			.nullable()
			.describe("An optional array of polylines (function graphs) to draw on the plane.")
	})
	.strict()
	.describe(
		"Generates a complete two-dimensional Cartesian coordinate plane as an SVG graphic. This versatile widget can render a feature-rich plane with configurable axes, grid lines, and quadrant labels. It supports plotting labeled points, drawing polygons by connecting vertices, rendering open polylines (e.g., for piecewise functions), and plotting infinite lines from their slope-intercept equations. This single widget is suitable for a vast range of coordinate geometry problems."
	)

export type CoordinatePlaneComprehensiveProps = z.infer<typeof CoordinatePlaneComprehensivePropsSchema>

// Re-export the error constant for compatibility
export { ErrInvalidDimensions }

/**
 * Generates a versatile Cartesian coordinate plane for plotting points, lines, and polygons.
 * Supports a wide range of coordinate geometry problems with perfect feature parity to the original coordinate-plane.ts.
 *
 * This implementation uses modular components but achieves identical functionality including:
 * - Point ID referencing system for polygons and distances
 * - All three line equation types (slope-intercept, standard, point-slope)
 * - Open/closed polygon support
 * - Full distance triangle visualization
 * - Polyline function plotting
 */
export const generateCoordinatePlaneComprehensive: WidgetGenerator<typeof CoordinatePlaneComprehensivePropsSchema> = (
	props
) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points, lines, polygons, distances, polylines } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points || [])
	let content = ""

	// Render in proper z-order (background to foreground):

	// 1. Polygons (background shapes)
	if (polygons) {
		content += renderPolygons(polygons, base.pointMap, base.toSvgX, base.toSvgY)
	}

	// 2. Distance visualizations (middle layer)
	if (distances) {
		content += renderDistances(distances, base.pointMap, base.toSvgX, base.toSvgY)
	}

	// 3. Lines (middle-front layer)
	if (lines) {
		content += renderLines(lines, xAxis, yAxis, base.toSvgX, base.toSvgY)
	}

	// 4. Polylines/function plots (front layer)
	if (polylines) {
		content += renderPolylines(polylines, base.toSvgX, base.toSvgY)
	}

	// 5. Points (topmost layer - always visible)
	if (points) {
		content += renderPoints(points, base.toSvgX, base.toSvgY)
	}

	return `${base.svg}${content}</svg>`
}
