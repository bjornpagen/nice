import * as errors from "@superbuilders/errors"
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

// Factory function for common point schema used for free-form line definitions
const createBarePointSchema = () =>
	z
		.object({
			x: z.number().describe("The value on the horizontal (X) axis for this coordinate."),
			y: z.number().describe("The value on the vertical (Y) axis for this coordinate.")
		})
		.strict()
		.describe("A 2D coordinate used in line definitions.")

// Factory function for optional styling settings applied to any rendered line
const createLineStyleSchema = () =>
	z
		.object({
			color: z
				.string()
				.nullable()
				.describe(
					"Optional CSS color (named color, hex, rgb[a], or hsl[a]) used as the stroke color for this line. Defaults to a distinct accent if omitted."
				),
			strokeWidth: z
				.number()
				.positive()
				.nullable()
				.describe("Optional stroke width in pixels. Defaults to 2 if omitted."),
			dash: z
				.boolean()
				.nullable()
				.describe("If true, renders the line with a dashed pattern. If false or null, renders a solid line.")
		})
		.strict()
		.describe("Optional per-line styling attributes.")

// A line defined by two distinct points. Rendered across the entire chart domain.
const LineTwoPointsSchema = z
	.object({
		type: z.literal("twoPoints").describe("This line is defined by two points a and b."),
		a: createBarePointSchema().describe("The first coordinate that lies on the line."),
		b: createBarePointSchema().describe("The second coordinate that lies on the line. Must not be identical to 'a'."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("Optional short label to render near the line (e.g., 'A', 'B', 'C')."),
		style: createLineStyleSchema().nullable().describe("Optional styling overrides for this line.")
	})
	.strict()
	.describe(
		"Render an infinite line that passes through points 'a' and 'b', clipped to the plot area. Vertical lines (a.x === b.x) are supported."
	)

// A line that is computed as the best fit for the provided scatter points
const LineBestFitSchema = z
	.object({
		type: z.literal("bestFit").describe("This line is computed from the scatter plot points."),
		method: z
			.enum(["linear", "quadratic"]) // quadratic uses a polynomial curve
			.describe(
				"The best-fit method. 'linear' renders a straight line; 'quadratic' renders a second-degree polynomial curve."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("Optional short label to render near the computed line."),
		style: createLineStyleSchema().nullable().describe("Optional styling overrides for the computed line.")
	})
	.strict()
	.describe("A computed best-fit line (linear) or curve (quadratic) derived from the data points.")

const LineSpecSchema = z
	.discriminatedUnion("type", [LineBestFitSchema, LineTwoPointsSchema])
	.describe(
		"A line overlay specification. Either a computed 'bestFit' (linear or quadratic) or a free-form 'twoPoints' line defined by two coordinates."
	)

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
		lines: z
			.array(LineSpecSchema)
			.nullable()
			.transform((val) => val ?? [])
			.describe(
				"Optional overlays to render on top of the scatter plot: computed best-fit lines/curves or user-specified lines defined by two points."
			)
	})
	.strict()
	.describe(
		"Generate a two-dimensional scatter plot as an SVG graphic with optional line overlays. Lines can be computed best-fit (linear or quadratic) or explicit lines defined by two points."
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

type LineStyle = z.infer<ReturnType<typeof createLineStyleSchema>>

export const generateScatterPlot: WidgetGenerator<typeof ScatterPlotPropsSchema> = (data) => {
	const { width, height, title, xAxis, yAxis, points, lines } = data

	// Validation logic moved from schema
	const hasLinear = lines.some((l) => l.type === "bestFit" && l.method === "linear")
	const hasQuadratic = lines.some((l) => l.type === "bestFit" && l.method === "quadratic")
	if (hasLinear && points.length < 2) {
		throw errors.new("linear best fit requires at least 2 points")
	}
	if (hasQuadratic && points.length < 3) {
		throw errors.new("quadratic best fit requires at least 3 points")
	}
	// Validate twoPoints lines have different endpoints
	for (const line of lines) {
		if (line.type === "twoPoints" && line.a.x === line.b.x && line.a.y === line.b.y) {
			throw errors.new("line endpoints must differ")
		}
	}
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

	const clamp = (value: number, min: number, max: number) => {
		if (value < min) return min
		if (value > max) return max
		return value
	}

	const styleAttrs = (style: LineStyle | null): string => {
		const color = style?.color ?? "#EA4335"
		const strokeWidth = style?.strokeWidth ?? 2
		const dash = style?.dash ? ` stroke-dasharray="5 5"` : ""
		return ` stroke="${color}" stroke-width="${strokeWidth}"${dash}`
	}

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

	// Render line overlays (computed or explicit)
	for (const line of lines) {
		if (line.type === "bestFit") {
			if (line.method === "linear") {
				const coeff = computeLinearRegression(points)
				if (coeff) {
					const y1 = coeff.slope * xAxis.min + coeff.yIntercept
					const y2 = coeff.slope * xAxis.max + coeff.yIntercept
					svg += `<line x1="${toSvgX(xAxis.min)}" y1="${toSvgY(y1)}" x2="${toSvgX(xAxis.max)}" y2="${toSvgY(y2)}"${styleAttrs(
						line.style
					)} />`
					if (line.label) {
						const labelX = toSvgX(xAxis.max) - 5
						const labelY = toSvgY(y2)
						svg += `<text x="${labelX}" y="${labelY - 6}" text-anchor="end" fill="black">${line.label}</text>`
					}
				}
			}
			if (line.method === "quadratic") {
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
					svg += `<path d="${path}" fill="none"${styleAttrs(line.style)} />`
					if (line.label) {
						const yRight = coeff.a * xAxis.max ** 2 + coeff.b * xAxis.max + coeff.c
						const labelX = toSvgX(xAxis.max) - 5
						const labelY = toSvgY(clamp(yRight, yAxis.min, yAxis.max))
						svg += `<text x="${labelX}" y="${labelY - 6}" text-anchor="end" fill="black">${line.label}</text>`
					}
				}
			}
		} else if (line.type === "twoPoints") {
			const { a, b } = line
			if (a.x === b.x) {
				// vertical line across full y-domain
				svg += `<line x1="${toSvgX(a.x)}" y1="${toSvgY(yAxis.min)}" x2="${toSvgX(a.x)}" y2="${toSvgY(yAxis.max)}"${styleAttrs(
					line.style
				)} />`
				if (line.label) {
					const labelX = toSvgX(a.x) + 6
					const labelY = toSvgY(yAxis.max) + 14
					svg += `<text x="${labelX}" y="${labelY}" fill="black">${line.label}</text>`
				}
			} else {
				const slope = (b.y - a.y) / (b.x - a.x)
				const intercept = a.y - slope * a.x
				const yAtMin = slope * xAxis.min + intercept
				const yAtMax = slope * xAxis.max + intercept
				svg += `<line x1="${toSvgX(xAxis.min)}" y1="${toSvgY(yAtMin)}" x2="${toSvgX(xAxis.max)}" y2="${toSvgY(yAtMax)}"${styleAttrs(
					line.style
				)} />`
				if (line.label) {
					const labelX = toSvgX(xAxis.max) - 5
					const labelY = toSvgY(yAtMax)
					svg += `<text x="${labelX}" y="${labelY - 6}" text-anchor="end" fill="black">${line.label}</text>`
				}
			}
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
