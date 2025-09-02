import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import {
	createAxisOptionsSchema,
	createLineSchema,
	createPlotPointSchema,
	renderLines,
	renderPoints
} from "@/lib/widgets/utils/canvas-utils"
import { PADDING } from "@/lib/widgets/utils/constants"
import { setupCoordinatePlaneV2 } from "@/lib/widgets/utils/coordinate-plane-v2"
import { theme } from "@/lib/widgets/utils/theme"

export const LineEquationGraphPropsSchema = z
	.object({
		type: z
			.literal("lineEquationGraph")
			.describe("Identifies this as a line equation graph for plotting linear functions and points."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should provide adequate space for the graph."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Often equal to width for square aspect ratio."
			),
		xAxis: createAxisOptionsSchema().describe(
			"Configuration for the horizontal x-axis including range, tick marks, labels, and optional grid lines. Should encompass all relevant x-values."
		),
		yAxis: createAxisOptionsSchema().describe(
			"Configuration for the vertical y-axis including range, tick marks, labels, and optional grid lines. Should encompass all relevant y-values."
		),
		showQuadrantLabels: z
			.boolean()
			.describe(
				"Whether to display Roman numerals (I, II, III, IV) in each quadrant. True helps students identify quadrant locations."
			),
		lines: z
			.array(createLineSchema())
			.describe(
				"Array of lines to plot. Each line can be defined by equation (slope-intercept) or two points. Lines extend to graph boundaries. Empty array for no lines."
			),
		points: z
			.array(createPlotPointSchema())
			.describe(
				"Individual points to highlight on the graph (e.g., intercepts, solutions, key points). Empty array means no special points. Points are rendered on top of lines."
			)
	})
	.strict()
	.describe(
		"Creates a coordinate plane for graphing linear equations and plotting points. Supports multiple lines defined by equations (y = mx + b) or point pairs. Essential for teaching linear functions, slope, intercepts, and systems of equations. Points can mark important locations like intersections or solutions."
	)

export type LineEquationGraphProps = z.infer<typeof LineEquationGraphPropsSchema>

export const generateLineEquationGraph: WidgetGenerator<typeof LineEquationGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, lines, points } = props

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

	// Create point map for ID resolution
	const pointMap = new Map(points.map((pt) => [pt.id, pt]))

	// Render lines (renderLines manages clipping internally)
	renderLines(lines, xAxis, yAxis, baseInfo.toSvgX, baseInfo.toSvgY, canvas)

	// Render unclipped points on the main canvas
	renderPoints(points, baseInfo.toSvgX, baseInfo.toSvgY, canvas)

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
