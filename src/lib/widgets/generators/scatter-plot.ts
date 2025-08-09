import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single data point on the scatter plot
const ScatterPointSchema = z
	.object({
		x: z.number().describe("The value of the point on the horizontal (X) axis."),
		y: z.number().describe("The value of the point on the vertical (Y) axis."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional text label to display near the point.")
	})
	.strict()

// trend line selection (computed from points)
const TrendLineSchema = z
	.enum(["linear", "quadratic"])
	.nullable()
	.describe("choose a computed trend line type or null for none")

// The main Zod schema for the scatterPlot function
export const ScatterPlotPropsSchema = z
	.object({
		type: z.literal("scatterPlot"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total height of the output SVG container in pixels."),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional title displayed above or below the plot."),
		// INLINED: The AxisSchema definition is now directly inside the xAxis property.
		xAxis: z
			.object({
				label: z.string().describe('The text title for the axis (e.g., "Driver Age").'),
				min: z.number().describe("The minimum value displayed on the axis."),
				max: z.number().describe("The maximum value displayed on the axis."),
				tickInterval: z.number().describe("The numeric interval between tick marks on the axis."),
				gridLines: z.boolean().describe("If true, display grid lines for this axis.")
			})
			.strict()
			.describe("Configuration for the horizontal (X) axis."),
		// INLINED: The AxisSchema definition is now directly inside the yAxis property.
		yAxis: z
			.object({
				label: z.string().describe('The text title for the axis (e.g., "Driver Age").'),
				min: z.number().describe("The minimum value displayed on the axis."),
				max: z.number().describe("The maximum value displayed on the axis."),
				tickInterval: z.number().describe("The numeric interval between tick marks on the axis."),
				gridLines: z.boolean().describe("If true, display grid lines for this axis.")
			})
			.strict()
			.describe("Configuration for the vertical (Y) axis."),
		points: z.array(ScatterPointSchema).describe("An array of data points to be plotted."),
		trendLine: TrendLineSchema
	})
	.strict()
	.describe(
		"this template generates a two-dimensional scatter plot as an svg graphic with optional computed trend line (linear or quadratic) based on the provided points."
	)

export type ScatterPlotProps = z.infer<typeof ScatterPlotPropsSchema>

/**
 * Generates a two-dimensional scatter plot to visualize the relationship between two
 * variables, with optional support for overlaying linear or nonlinear trend lines.
 */
function computeLinearRegression(
	points: ReadonlyArray<{ x: number; y: number }>
): { slope: number; yIntercept: number } | null {
	const count = points.length
	if (count < 2) return null

	let sumX = 0
	let sumY = 0
	let sumXY = 0
	let sumX2 = 0
	for (const p of points) {
		sumX += p.x
		sumY += p.y
		sumXY += p.x * p.y
		sumX2 += p.x * p.x
	}

	const denom = count * sumX2 - sumX * sumX
	if (denom === 0) return null

	const slope = (count * sumXY - sumX * sumY) / denom
	const yIntercept = (sumY - slope * sumX) / count
	return { slope, yIntercept }
}

function computeQuadraticRegression(
	points: ReadonlyArray<{ x: number; y: number }>
): { a: number; b: number; c: number } | null {
	const count = points.length
	if (count < 3) return null

	let Sx = 0
	let Sx2 = 0
	let Sx3 = 0
	let Sx4 = 0
	let Sy = 0
	let Sxy = 0
	let Sx2y = 0
	for (const p of points) {
		const x = p.x
		const y = p.y
		const x2 = x * x
		Sx += x
		Sx2 += x2
		Sx3 += x2 * x
		Sx4 += x2 * x2
		Sy += y
		Sxy += x * y
		Sx2y += x2 * y
	}

	const det3 = (
		m11: number,
		m12: number,
		m13: number,
		m21: number,
		m22: number,
		m23: number,
		m31: number,
		m32: number,
		m33: number
	): number => m11 * (m22 * m33 - m23 * m32) - m12 * (m21 * m33 - m23 * m31) + m13 * (m21 * m32 - m22 * m31)

	const D = det3(Sx4, Sx3, Sx2, Sx3, Sx2, Sx, Sx2, Sx, count)
	if (D === 0) return null

	const Da = det3(Sx2y, Sx3, Sx2, Sxy, Sx2, Sx, Sy, Sx, count)
	const Db = det3(Sx4, Sx2y, Sx2, Sx3, Sxy, Sx, Sx2, Sy, count)
	const Dc = det3(Sx4, Sx3, Sx2y, Sx3, Sx2, Sxy, Sx2, Sx, Sy)

	return { a: Da / D, b: Db / D, c: Dc / D }
}

export const generateScatterPlot: WidgetGenerator<typeof ScatterPlotPropsSchema> = (data) => {
	const { width, height, title, xAxis, yAxis, points, trendLine } = data
	// Use the same robust coordinate plane logic from generateCoordinatePlane
	const pad = { top: 40, right: 30, bottom: 60, left: 50 }
	const chartWidth = width - pad.left - pad.right
	const chartHeight = height - pad.top - pad.bottom

	if (chartWidth <= 0 || chartHeight <= 0 || xAxis.min >= xAxis.max || yAxis.min >= yAxis.max) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	const scaleX = chartWidth / (xAxis.max - xAxis.min)
	const scaleY = chartHeight / (yAxis.max - yAxis.min)
	const toSvgX = (val: number) => pad.left + (val - xAxis.min) * scaleX
	const toSvgY = (val: number) => height - pad.bottom - (val - yAxis.min) * scaleY

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title) svg += `<text x="${width / 2}" y="${pad.top / 2}" class="title">${title}</text>`

	// Grid lines, Axes, Ticks, Labels
	if (xAxis.gridLines)
		for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
			svg += `<line x1="${toSvgX(t)}" y1="${pad.top}" x2="${toSvgX(t)}" y2="${height - pad.bottom}" stroke="#eee"/>`
		}
	if (yAxis.gridLines)
		for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
			svg += `<line x1="${pad.left}" y1="${toSvgY(t)}" x2="${width - pad.right}" y2="${toSvgY(t)}" stroke="#eee"/>`
		}
	svg += `<line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="black"/>`
	svg += `<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="black"/>`
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		svg += `<line x1="${toSvgX(t)}" y1="${height - pad.bottom}" x2="${toSvgX(t)}" y2="${height - pad.bottom + 5}" stroke="black"/><text x="${toSvgX(t)}" y="${height - pad.bottom + 20}" text-anchor="middle">${t}</text>`
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		svg += `<line x1="${pad.left}" y1="${toSvgY(t)}" x2="${pad.left - 5}" y2="${toSvgY(t)}" stroke="black"/><text x="${pad.left - 10}" y="${toSvgY(t) + 4}" text-anchor="end">${t}</text>`
	}
	if (xAxis.label)
		svg += `<text x="${pad.left + chartWidth / 2}" y="${height - 20}" class="axis-label">${xAxis.label}</text>`
	if (yAxis.label)
		svg += `<text x="${pad.left - 35}" y="${pad.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${pad.left - 35}, ${pad.top + chartHeight / 2})">${yAxis.label}</text>`

	// computed trend line
	if (trendLine === "linear") {
		const coeff = computeLinearRegression(points)
		if (coeff) {
			const y1 = coeff.slope * xAxis.min + coeff.yIntercept
			const y2 = coeff.slope * xAxis.max + coeff.yIntercept
			svg += `<line x1="${toSvgX(xAxis.min)}" y1="${toSvgY(y1)}" x2="${toSvgX(xAxis.max)}" y2="${toSvgY(y2)}" stroke="#EA4335" stroke-width="2" />`
		}
	}
	if (trendLine === "quadratic") {
		const coeff = computeQuadraticRegression(points)
		if (coeff) {
			const steps = 100
			let path = ""
			for (let i = 0; i <= steps; i++) {
				const xVal = xAxis.min + (i / steps) * (xAxis.max - xAxis.min)
				const yVal = coeff.a * xVal ** 2 + coeff.b * xVal + coeff.c
				const px = toSvgX(xVal)
				const py = toSvgY(yVal)
				path += `${i === 0 ? "M" : "L"} ${px} ${py} `
			}
			svg += `<path d="${path}" fill="none" stroke="#EA4335" stroke-width="2" />`
		}
	}

	for (const p of points) {
		const px = toSvgX(p.x)
		const py = toSvgY(p.y)
		svg += `<circle cx="${px}" cy="${py}" r="3.5" fill="black" fill-opacity="0.7"/>`
		if (p.label) {
			svg += `<text x="${px + 5}" y="${py - 5}" fill="black">${p.label}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
