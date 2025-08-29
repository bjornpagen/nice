import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

function createAxisOptionsSchema() {
	return z
		.object({
			label: z.string(),
			min: z.number(),
			max: z.number(),
			tickInterval: z.number().positive(),
			showGridLines: z.boolean(),
			showTickLabels: z.boolean().describe("Whether to show tick labels on the axis.")
		})
		.strict()
}

export const ParabolaGraphPropsSchema = z
	.object({
		type: z.literal("parabolaGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels."),
		height: z.number().positive().describe("Total height of the SVG in pixels."),
		xAxis: createAxisOptionsSchema(),
		yAxis: createAxisOptionsSchema(),
		parabola: z
			.object({
				vertex: z
					.object({
						x: z.number().positive().describe("x-coordinate of the vertex (must be > 0)"),
						y: z.number().positive().describe("y-coordinate of the vertex (must be > 0)")
					})
					.strict(),
				yIntercept: z
					.number()
					.positive()
					.describe("Positive y-intercept at x = 0 (must be > 0 and less than vertex.y)."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The color of the parabola curve."),
				style: z.enum(["solid", "dashed"]).describe("The line style of the parabola curve.")
			})
			.strict()
	})
	.strict()
	.describe(
		"Creates a coordinate plane and renders a down-facing parabola in the first quadrant, defined by a positive vertex and positive y-intercept."
	)

export type ParabolaGraphProps = z.infer<typeof ParabolaGraphPropsSchema>

export const generateParabolaGraph: WidgetGenerator<typeof ParabolaGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, parabola } = props

	// Vertex-form parabola: y = a (x - h)^2 + k
	const h = parabola.vertex.x
	const k = parabola.vertex.y
	const y0 = parabola.yIntercept

	// Runtime validation: enforce first-quadrant, down-facing configuration
	if (!(h > 0 && k > 0 && y0 > 0)) {
		logger.error("invalid parabola parameters", { vertexX: h, vertexY: k, yIntercept: y0 })
		throw errors.new("invalid parabola parameters")
	}
	if (!(y0 < k)) {
		logger.error("y intercept must be less than vertex y", { vertexY: k, yIntercept: y0 })
		throw errors.new("invalid parabola parameters")
	}

	// a must be negative (down-facing)
	const a = (y0 - k) / (h * h)
	if (!(a < 0)) {
		logger.error("invalid parabola shape", { a, vertexX: h, vertexY: k, yIntercept: y0 })
		throw errors.new("invalid parabola shape")
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		null, // No title for this widget
		{
			label: xAxis.label,
			min: xAxis.min,
			max: xAxis.max,
			tickInterval: xAxis.tickInterval,
			showGridLines: false,
			showTickLabels: xAxis.showTickLabels
		},
		{
			label: yAxis.label,
			min: yAxis.min,
			max: yAxis.max,
			tickInterval: yAxis.tickInterval,
			showGridLines: yAxis.showGridLines,
			showTickLabels: yAxis.showTickLabels
		}
	)

	// Parabola curve content - clip to first quadrant (x >= 0, y >= 0)
	let parabolaContent = ""
	const steps = 200
	let pointsStr = ""
	for (let i = 0; i <= steps; i++) {
		const x = xAxis.min + (i / steps) * (xAxis.max - xAxis.min)
		const y = a * (x - h) * (x - h) + k
		if (x >= 0 && y >= 0) {
			// Track the x-extent of the parabola point
			includePointX(base.ext, base.toSvgX(x))
			pointsStr += `${base.toSvgX(x)},${base.toSvgY(y)} `
		}
	}
	const dash = parabola.style === "dashed" ? ' stroke-dasharray="8 6"' : ""
	parabolaContent += `<polyline points="${pointsStr.trim()}" fill="none" stroke="${parabola.color}" stroke-width="2.5" ${dash}/>`

	let svgBody = base.svgBody
	svgBody += wrapInClippedGroup(base.clipId, parabolaContent)

	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, height, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="12">` +
		svgBody +
		`</svg>`
	return finalSvg
}
