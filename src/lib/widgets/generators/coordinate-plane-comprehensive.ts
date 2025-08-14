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
		type: z
			.literal("coordinatePlane")
			.describe("Identifies this as a comprehensive coordinate plane widget with full geometric features."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the coordinate plane in pixels including axes and labels (e.g., 500, 600, 400). Larger values provide more plotting space."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the coordinate plane in pixels including axes and labels (e.g., 500, 600, 400). Usually equal to width for square aspect ratio."
			),
		xAxis: createAxisOptionsSchema().describe(
			"Configuration for the horizontal x-axis including range, tick marks, and grid lines. Defines the visible domain of the plane."
		),
		yAxis: createAxisOptionsSchema().describe(
			"Configuration for the vertical y-axis including range, tick marks, and grid lines. Defines the visible range of the plane."
		),
		showQuadrantLabels: z
			.boolean()
			.describe(
				"Whether to display Roman numeral labels (I, II, III, IV) in each quadrant. True helps students identify quadrant locations."
			),
		points: z
			.array(createPlotPointSchema())
			.describe(
				"Array of individual points to plot. Empty array means no points. Points are rendered last (on top). Each point can have a label and custom style."
			),
		lines: z
			.array(createLineSchema())
			.describe(
				"Array of infinite lines defined by slope-intercept or two points. Empty array means no lines. Lines extend to plane boundaries."
			),
		polygons: z
			.array(createPolygonSchema())
			.describe(
				"Array of closed polygons defined by vertices. Empty array means no polygons. Rendered first (bottom layer) with optional fill colors."
			),
		distances: z
			.array(createDistanceSchema())
			.describe(
				"Array of distance measurements between point pairs. Empty array means no distances. Shows horizontal/vertical legs and diagonal with labels."
			),
		polylines: z
			.array(createPolylineSchema())
			.describe(
				"Array of connected line segments (open paths). Empty array means no polylines. Useful for functions, paths, or partial shapes."
			)
	})
	.strict()
	.describe(
		"Creates a full-featured Cartesian coordinate plane supporting points, lines, polygons, distances, and polylines. Essential for graphing, geometry, and coordinate geometry lessons. Renders elements in layers: polygons (bottom) → distances → lines → polylines → points (top)."
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

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)
	let content = ""

	// Render in proper z-order (background to foreground):

	// 1. Polygons (background shapes)
	if (polygons.length > 0) {
		content += renderPolygons(polygons, base.pointMap, base.toSvgX, base.toSvgY)
	}

	// 2. Distance visualizations (middle layer)
	if (distances.length > 0) {
		content += renderDistances(distances, base.pointMap, base.toSvgX, base.toSvgY)
	}

	// 3. Lines (middle-front layer)
	if (lines.length > 0) {
		content += renderLines(lines, xAxis, yAxis, base.toSvgX, base.toSvgY)
	}

	// 4. Polylines/function plots (front layer)
	if (polylines.length > 0) {
		content += renderPolylines(polylines, base.toSvgX, base.toSvgY)
	}

	// 5. Points (topmost layer - always visible)
	if (points.length > 0) {
		content += renderPoints(points, base.toSvgX, base.toSvgY)
	}

	return `${base.svg}${content}</svg>`
}
