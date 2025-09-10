import { z } from "zod"
import type { WidgetGenerator } from "../types"
import { CanvasImpl } from "../../utils/canvas-impl"
import { createAxisOptionsSchema, createPlotPointSchema, renderPoints } from "../../utils/canvas-utils"
import { PADDING } from "../../utils/constants"
import { setupCoordinatePlaneV2 } from "../../utils/coordinate-plane-v2"
import { theme } from "../../utils/theme"

export const PointPlotGraphPropsSchema = z
	.object({
		type: z
			.literal("pointPlotGraph")
			.describe("Identifies this as a point plot graph for displaying individual coordinate points."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should provide adequate plotting space."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Often equal to width for square grid."
			),
		xAxis: createAxisOptionsSchema().describe(
			"Configuration for the horizontal x-axis including range, tick marks, labels, and optional grid lines."
		),
		yAxis: createAxisOptionsSchema().describe(
			"Configuration for the vertical y-axis including range, tick marks, labels, and optional grid lines."
		),
		showQuadrantLabels: z
			.boolean()
			.describe(
				"Whether to display Roman numerals (I, II, III, IV) in each quadrant. Helps students learn quadrant conventions."
			),
		points: z
			.array(createPlotPointSchema())
			.describe(
				"Points to plot on the coordinate plane. Each point has coordinates, optional label, color, and style. Empty array creates blank grid."
			)
	})
	.strict()
	.describe(
		"Creates a coordinate plane specifically for plotting individual points. Each point can be labeled and styled differently. Perfect for teaching coordinate pairs, quadrants, and point plotting. Unlike line or function graphs, this focuses solely on discrete point locations."
	)

export type PointPlotGraphProps = z.infer<typeof PointPlotGraphPropsSchema>

export const generatePointPlotGraph: WidgetGenerator<typeof PointPlotGraphPropsSchema> = async (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points } = props

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

	// Render elements using Canvas API
	renderPoints(points, baseInfo.toSvgX, baseInfo.toSvgY, canvas)

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
