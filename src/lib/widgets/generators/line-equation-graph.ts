import { z } from "zod"
import {
	createAxisOptionsSchema,
	createLineSchema,
	createPlotPointSchema,
	generateCoordinatePlaneBase,
	renderLines,
	renderPoints
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, wrapInClippedGroup } from "@/lib/widgets/utils/layout"

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
	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)
	let content = ""

	// 2. Render elements in order, passing the extents object to each helper
	// Render lines first (background) - clip to prevent extending beyond chart bounds
	const lineContent = renderLines(lines, xAxis, yAxis, base.toSvgX, base.toSvgY, base.ext)
	content += wrapInClippedGroup("chartArea", lineContent)

	// Render points last (foreground)
	content += renderPoints(points, base.toSvgX, base.toSvgY, base.ext)

	// 3. Compute final width and assemble the complete SVG
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, height, PADDING)
	let finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	finalSvg += base.svgBody
	finalSvg += content
	finalSvg += `</svg>`

	return finalSvg
}
