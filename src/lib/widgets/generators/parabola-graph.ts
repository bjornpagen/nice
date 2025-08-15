import { z } from "zod"
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
			showTickLabels: z.boolean().default(true).describe("Whether to show tick labels on the axis.")
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
				points: z
					.object({
						p1: z.object({ x: z.number(), y: z.number() }),
						p2: z.object({ x: z.number(), y: z.number() }),
						p3: z.object({ x: z.number(), y: z.number() })
					})
					.describe("Three points that define the parabola."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The color of the parabola curve."),
				style: z.enum(["solid", "dashed"]).describe("The line style of the parabola curve.")
			})
			.strict()
	})
	.strict()
	.describe("Creates a coordinate plane and renders a smooth parabola defined by three points.")

export type ParabolaGraphProps = z.infer<typeof ParabolaGraphPropsSchema>

export const generateParabolaGraph: WidgetGenerator<typeof ParabolaGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, parabola } = props

	const margin = { top: 20, right: 20, bottom: 50, left: 60 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0) return `<svg width="${width}" height="${height}"></svg>`

	const toSvgX = (val: number) => margin.left + ((val - xAxis.min) / (xAxis.max - xAxis.min)) * chartWidth
	const toSvgY = (val: number) => height - margin.bottom - ((val - yAxis.min) / (yAxis.max - yAxis.min)) * chartHeight

	// Calculate parabola coefficients from three points
	const { p1, p2, p3 } = parabola.points

	const x1 = p1.x
	const y1 = p1.y
	const x2 = p2.x
	const y2 = p2.y
	const x3 = p3.x
	const y3 = p3.y

	// Check for collinearity or identical x-coordinates which would prevent forming a parabola.
	const denomCheck = (x1 - x2) * (x1 - x3) * (x2 - x3)

	if (Math.abs(denomCheck) < 1e-10) {
		// Points are collinear or too close, can't form a parabola
		return `<svg width="${width}" height="${height}"></svg>`
	}

	// FIX: Replaced complex Cramer's rule with a more direct and numerically stable calculation for the parabola's coefficients (y = ax^2 + bx + c).
	// This ensures accurate rendering by minimizing floating-point errors.
	const a = y1 / ((x1 - x2) * (x1 - x3)) + y2 / ((x2 - x1) * (x2 - x3)) + y3 / ((x3 - x1) * (x3 - x2))
	const b = (y1 - y2) / (x1 - x2) - a * (x1 + x2)
	const c = y1 - a * x1 * x1 - b * x1

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += "<style>.axis-label { font-size: 14px; text-anchor: middle; }</style>"

	// --- Standalone Coordinate Plane Rendering ---
	// Grid Lines
	if (yAxis.showGridLines) {
		for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
			const y = toSvgY(t)
			svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e0e0e0"/>`
		}
	}
	// Axes
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black"/>` // X-axis
	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black"/>` // Y-axis
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

	// Parabola Curve
	const steps = 200 // High resolution for a smooth appearance
	let pointsStr = ""
	for (let i = 0; i <= steps; i++) {
		const x = xAxis.min + (i / steps) * (xAxis.max - xAxis.min)
		const y = a * x * x + b * x + c
		pointsStr += `${toSvgX(x)},${toSvgY(y)} `
	}
	const dash = parabola.style === "dashed" ? ' stroke-dasharray="8 6"' : ""
	svg += `<polyline points="${pointsStr.trim()}" fill="none" stroke="${parabola.color}" stroke-width="2.5" ${dash}/>`

	svg += "</svg>"
	return svg
}
