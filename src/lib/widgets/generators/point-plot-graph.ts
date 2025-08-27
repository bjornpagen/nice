import { z } from "zod"
import {
	createAxisOptionsSchema,
	createPlotPointSchema,
	generateCoordinatePlaneBase,
	renderPoints
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { computeDynamicWidth } from "@/lib/widgets/utils/layout"

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

export const generatePointPlotGraph: WidgetGenerator<typeof PointPlotGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points } = props

	// 1. Call the base generator and get the body content and extents object
	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)

	// 2. Render elements in order, passing the extents object to each helper
	let content = renderPoints(points, base.toSvgX, base.toSvgY, base.ext)

	// 3. Compute final width and assemble the complete SVG
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, height, 10)
	let finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	finalSvg += base.svgBody
	finalSvg += content
	finalSvg += `</svg>`

	return finalSvg
}
