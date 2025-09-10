import { z } from "zod"
import type { WidgetGenerator } from "../types"
import { CanvasImpl } from "../../utils/canvas-impl"
import {
	createAxisOptionsSchema,
	createPlotPointSchema,
	createPolylineSchema,
	renderPoints,
	renderPolylines
} from "../../utils/canvas-utils"
import { PADDING } from "../../utils/constants"
import { setupCoordinatePlaneV2 } from "../../utils/coordinate-plane-v2"
import { theme } from "../../utils/theme"

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

export const generateFunctionPlotGraph: WidgetGenerator<typeof FunctionPlotGraphPropsSchema> = async (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, polylines, points } = props

	// 1. Call the base generator and get the body content and extents object
	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	const baseInfo = setupCoordinatePlaneV2(
		{
			width,
			height,
			xAxis: {
				label: xAxis.label,
				min: xAxis.min,
				max: xAxis.max,
				tickInterval: xAxis.tickInterval,
				showGridLines: xAxis.showGridLines
			},
			yAxis: {
				label: yAxis.label,
				min: yAxis.min,
				max: yAxis.max,
				tickInterval: yAxis.tickInterval,
				showGridLines: yAxis.showGridLines
			},
			showQuadrantLabels: showQuadrantLabels
		},
		canvas
	)

	// Render polylines (renderPolylines manages clipping internally)
	renderPolylines(polylines, baseInfo.toSvgX, baseInfo.toSvgY, canvas)

	// Render unclipped points on the main canvas
	renderPoints(points, baseInfo.toSvgX, baseInfo.toSvgY, canvas)

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
