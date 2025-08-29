import { z } from "zod"
import {
	createAxisOptionsSchema,
	createPlotPointSchema,
	createPolylineSchema,
	generateCoordinatePlaneBase,
	renderPoints,
	renderPolylines
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"

export const FunctionPlotGraphPropsSchema = z
	.object({
		type: z
			.literal("functionPlotGraph")
			.describe("Identifies this as a function plot graph widget for displaying mathematical functions and curves."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should accommodate axis labels and provide adequate plotting space."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Often equal to width for square aspect ratio."
			),
		xAxis: createAxisOptionsSchema().describe(
			"Configuration for the horizontal x-axis including domain range, tick marks, labels, and optional grid lines."
		),
		yAxis: createAxisOptionsSchema().describe(
			"Configuration for the vertical y-axis including range, tick marks, labels, and optional grid lines."
		),
		showQuadrantLabels: z
			.boolean()
			.describe(
				"Whether to display Roman numerals (I, II, III, IV) in each quadrant. True helps identify regions for sign analysis."
			),
		polylines: z
			.array(createPolylineSchema())
			.describe(
				"Array of connected line segments representing functions or curves. Each polyline is a sequence of points. Empty array means no functions plotted."
			),
		points: z
			.array(createPlotPointSchema())
			.describe(
				"Individual points to highlight (e.g., intercepts, critical points, intersections). Rendered on top of polylines. Empty array means no special points."
			)
	})
	.strict()
	.describe(
		"Creates a coordinate plane optimized for plotting mathematical functions as connected line segments (polylines). Supports multiple functions, highlighted points, and full axis configuration. Perfect for graphing polynomials, piecewise functions, and any curve that can be approximated by line segments."
	)

export type FunctionPlotGraphProps = z.infer<typeof FunctionPlotGraphPropsSchema>

export const generateFunctionPlotGraph: WidgetGenerator<typeof FunctionPlotGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, polylines, points } = props

	// 1. Call the base generator and get the body content and extents object
	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)
	
	// 2. Separate clipped polylines from unclipped points
	let clippedContent = ""
	let unclippedContent = ""

	// Render polylines in clipped content (background)
	clippedContent += renderPolylines(polylines, base.toSvgX, base.toSvgY, base.ext)

	// Render points in unclipped content (foreground) - for highlighting key points on the functions
	unclippedContent += renderPoints(points, base.toSvgX, base.toSvgY, base.ext)

	// 3. Compute final width and assemble the complete SVG
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, height, PADDING)
	let finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">`
	finalSvg += base.svgBody
	finalSvg += wrapInClippedGroup("chartArea", clippedContent)
	finalSvg += unclippedContent // Add unclipped points
	finalSvg += `</svg>`

	return finalSvg
}
