import { z } from "zod"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

function createAxisOptionsSchema() {
	return z
		.object({
			label: z
				.string()
				.nullable()
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)),
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
				yIntercept: z.number().positive().describe("Positive y-intercept at x = 0 (must be > 0 and less than vertex.y)."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The color of the parabola curve."),
				style: z.enum(["solid", "dashed"]).describe("The line style of the parabola curve.")
			})
			.strict()
	})
	.strict()
	.describe("Creates a coordinate plane and renders a down-facing parabola in the first quadrant, defined by a positive vertex and positive y-intercept.")

export type ParabolaGraphProps = z.infer<typeof ParabolaGraphPropsSchema>

export const generateParabolaGraph: WidgetGenerator<typeof ParabolaGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, parabola } = props

	const margin = { top: 20, right: 20, bottom: 50, left: 60 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0) return `<svg width="${width}" height="${height}"></svg>`

	const toSvgX = (val: number) => margin.left + ((val - xAxis.min) / (xAxis.max - xAxis.min)) * chartWidth
	const toSvgY = (val: number) => height - margin.bottom - ((val - yAxis.min) / (yAxis.max - yAxis.min)) * chartHeight

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

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += "<style>.axis-label { font-size: 14px; text-anchor: middle; }</style>"

	// --- Coordinate Plane Rendering ---
	// Grid Lines
	if (yAxis.showGridLines) {
		for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
			const y = toSvgY(t)
			svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e0e0e0"/>`
		}
	}
	// Axes
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black"/>`
	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black"/>`
	// Ticks
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${height - margin.bottom}" x2="${x}" y2="${height - margin.bottom + 5}" stroke="black"/>`
		if (xAxis.showTickLabels !== false) {
			svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle">${t}</text>`
		}
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = toSvgY(t)
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black"/>`
		if (yAxis.showTickLabels !== false) {
			svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${t}</text>`
		}
	}
	// Labels
	if (xAxis.label)
		svg += `<text x="${margin.left + chartWidth / 2}" y="${height - 15}" class="axis-label">${xAxis.label}</text>`
	if (yAxis.label)
		svg += `<text x="${margin.left - 45}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 45}, ${margin.top + chartHeight / 2})">${yAxis.label}</text>`

	// Parabola Curve - clip to first quadrant (x >= 0, y >= 0)
	const steps = 200
	let pointsStr = ""
	for (let i = 0; i <= steps; i++) {
		const x = xAxis.min + (i / steps) * (xAxis.max - xAxis.min)
		const y = a * (x - h) * (x - h) + k
		if (x >= 0 && y >= 0) {
			pointsStr += `${toSvgX(x)},${toSvgY(y)} `
		}
	}
	const dash = parabola.style === "dashed" ? ' stroke-dasharray="8 6"' : ""
	svg += `<polyline points="${pointsStr.trim()}" fill="none" stroke="${parabola.color}" stroke-width="2.5" ${dash}/>`

	svg += "</svg>"
	return svg
}
