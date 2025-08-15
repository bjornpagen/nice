import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single data point on the scatter plot
const ScatterPointSchema = z
	.object({
		x: z
			.number()
			.describe(
				"The x-coordinate value of the data point (e.g., 25, 42.5, -10, 0). Must be within xAxis min/max range."
			),
		y: z
			.number()
			.describe(
				"The y-coordinate value of the data point (e.g., 180, 95.5, -5, 0). Must be within yAxis min/max range."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Optional text label for this point (e.g., 'A', 'Outlier', '(3,4)', null). Null means no label. Positioned near the point."
			)
	})
	.strict()

// Factory function for common point schema used for free-form line definitions
const createBarePointSchema = () =>
	z
		.object({
			x: z
				.number()
				.describe("X-coordinate for line endpoint or reference point (e.g., 0, 50, -20). Used in line definitions."),
			y: z
				.number()
				.describe("Y-coordinate for line endpoint or reference point (e.g., 10, 100, -15). Used in line definitions.")
		})
		.strict()
		.describe("A 2D coordinate used in line definitions.")

// Factory function for styling settings applied to any rendered line
const createLineStyleSchema = () =>
	z
		.object({
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"Hex-only color for the line stroke (e.g., '#FF6B6B', '#1E90FF', '#00000080' for 50% alpha). Should contrast with background and points."
				),
			strokeWidth: z
				.number()
				.positive()
				.describe("Width of the line in pixels (e.g., 2 for standard, 3 for bold, 1 for thin). Typical range: 1-4."),
			dash: z
				.boolean()
				.describe(
					"Whether to render as dashed line. True for dashed pattern, false for solid. Useful for predictions or reference lines."
				)
		})
		.strict()
		.describe("Visual styling for the line.")

// A line defined by two distinct points. Rendered across the entire chart domain.
const LineTwoPointsSchema = z
	.object({
		type: z
			.literal("twoPoints")
			.describe("Line defined by two specific points. Extends infinitely in both directions through these points."),
		a: createBarePointSchema().describe("First point the line passes through. Line extends beyond this point."),
		b: createBarePointSchema().describe(
			"Second point the line passes through. Must be different from point 'a'. Determines line's slope."
		),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the line (e.g., 'y = 2x + 1', 'Line A', 'Model', null). Null means no label. Positioned along the line."
			),
		style: createLineStyleSchema().describe(
			"Visual styling for this specific line. Overrides any default line appearance."
		)
	})
	.strict()
	.describe(
		"Render an infinite line that passes through points 'a' and 'b', clipped to the plot area. Vertical lines (a.x === b.x) are supported."
	)

// A line that is computed as the best fit for the provided scatter points
const LineBestFitSchema = z
	.object({
		type: z.literal("bestFit").describe("Line computed from the scatter plot data using regression analysis."),
		method: z
			.enum(["linear", "quadratic"])
			.describe(
				"Regression type. 'linear' fits a straight line (y = mx + b). 'quadratic' fits a parabola (y = ax² + bx + c)."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the regression line (e.g., 'Best Fit', 'Trend', 'y = 0.5x + 10', null). Null means no label."
			),
		style: createLineStyleSchema().describe(
			"Visual styling for the regression line. Often uses distinct color or dash pattern."
		)
	})
	.strict()
	.describe("A computed best-fit line (linear) or curve (quadratic) derived from the data points.")

// The main Zod schema for the scatterPlot function
export const ScatterPlotPropsSchema = z
	.object({
		type: z
			.literal("scatterPlot")
			.describe("Identifies this as a scatter plot widget for displaying bivariate data relationships."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the plot in pixels including margins and labels (e.g., 600, 700, 500). Larger values show more detail."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the plot in pixels including margins and labels (e.g., 400, 500, 350). Often 2/3 of width for good proportions."
			),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Title displayed above or below the plot (e.g., 'Age vs. Income', 'Temperature Over Time', null). Null means no title. Plaintext only; no markdown or HTML."
			),
		xAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe(
						"Title for the horizontal axis describing the variable (e.g., 'Age (years)', 'Time (hours)', 'Temperature (°C)', null). Null means no label."
					),
				min: z
					.number()
					.describe(
						"Minimum value shown on x-axis (e.g., 0, -10, 1990). Should be ≤ smallest x data value with some padding."
					),
				max: z
					.number()
					.describe(
						"Maximum value shown on x-axis (e.g., 100, 50, 2025). Should be ≥ largest x data value with some padding."
					),
				tickInterval: z
					.number()
					.describe(
						"Spacing between x-axis tick marks (e.g., 10, 5, 0.5). Should evenly divide the range for clean appearance."
					),
				gridLines: z
					.boolean()
					.describe(
						"Whether to show vertical grid lines at each tick mark. True improves readability, false reduces clutter."
					)
			})
			.strict()
			.describe("Configuration for the horizontal axis including scale, labels, and optional grid."),
		yAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe(
						"Title for the vertical axis describing the variable (e.g., 'Income ($1000s)', 'Score', 'Growth (cm)', null). Null means no label."
					),
				min: z
					.number()
					.describe(
						"Minimum value shown on y-axis (e.g., 0, -20, 50). Should be ≤ smallest y data value with some padding."
					),
				max: z
					.number()
					.describe(
						"Maximum value shown on y-axis (e.g., 200, 100, 10). Should be ≥ largest y data value with some padding."
					),
				tickInterval: z
					.number()
					.describe(
						"Spacing between y-axis tick marks (e.g., 20, 10, 2.5). Should evenly divide the range for clean appearance."
					),
				gridLines: z
					.boolean()
					.describe(
						"Whether to show horizontal grid lines at each tick mark. True helps estimate values, false keeps focus on points."
					)
			})
			.strict()
			.describe("Configuration for the vertical axis including scale, labels, and optional grid."),
		points: z
			.array(ScatterPointSchema)
			.describe(
				"Data points to plot. Each point can have an optional label. Empty array creates blank plot for exercises. Order doesn't affect display."
			),
		lines: z
			.array(z.discriminatedUnion("type", [LineBestFitSchema, LineTwoPointsSchema]))
			.describe(
				"Optional lines to overlay on the scatter plot. Can include regression lines, reference lines, or user-defined lines. Empty array means no lines."
			)
	})
	.strict()
	.describe(
		"Creates a scatter plot for exploring relationships between two numerical variables. Supports data points with labels, best-fit lines (linear or quadratic regression), and custom reference lines. Essential for statistics, correlation analysis, and data visualization. The gold standard widget design."
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
		logger.error("linear best fit requires at least 2 points", { pointsLength: points.length })
		throw errors.new("linear best fit requires at least 2 points")
	}
	if (hasQuadratic && points.length < 3) {
		logger.error("quadratic best fit requires at least 3 points", { pointsLength: points.length })
		throw errors.new("quadratic best fit requires at least 3 points")
	}
	// Validate twoPoints lines have different endpoints
	for (const line of lines) {
		if (line.type === "twoPoints" && line.a.x === line.b.x && line.a.y === line.b.y) {
			logger.error("line endpoints must differ", { lineA: line.a, lineB: line.b })
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

	const styleAttrs = (style: LineStyle): string => {
		const dash = style.dash ? ` stroke-dasharray="5 5"` : ""
		return ` stroke="${style.color}" stroke-width="${style.strokeWidth}"${dash}`
	}

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title !== null) svg += `<text x="${width / 2}" y="${pad.top / 2}" class="title">${title}</text>`

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
	// Dynamic x-axis label thinning: render all tick marks but only label every n-th
	// tick so that adjacent labels are at least a minimum pixel distance apart.
	// Keep tick marks and optional grid lines at the configured tickInterval.
	const minLabelSpacingPx = 50 // target minimum spacing between x-axis labels
	const approxTickSpacingPx = scaleX * xAxis.tickInterval
	const labelStepMultiplier =
		approxTickSpacingPx > 0 ? Math.max(1, Math.ceil(minLabelSpacingPx / approxTickSpacingPx)) : 1
	let tickIndex = 0
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${height - pad.bottom}" x2="${x}" y2="${height - pad.bottom + 5}" stroke="black"/>`
		if (tickIndex % labelStepMultiplier === 0) {
			svg += `<text x="${x}" y="${height - pad.bottom + 20}" text-anchor="middle">${t}</text>`
		}
		tickIndex++
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		svg += `<line x1="${pad.left}" y1="${toSvgY(t)}" x2="${pad.left - 5}" y2="${toSvgY(t)}" stroke="black"/><text x="${pad.left - 10}" y="${toSvgY(t) + 4}" text-anchor="end">${t}</text>`
	}
	if (xAxis.label !== null)
		svg += `<text x="${pad.left + chartWidth / 2}" y="${height - 20}" class="axis-label">${xAxis.label}</text>`
	if (yAxis.label !== null)
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
					if (line.label !== null) {
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
					if (line.label !== null) {
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
				if (line.label !== null) {
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
				if (line.label !== null) {
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
		if (p.label !== null) {
			svg += `<text x="${px + 5}" y="${py - 5}" fill="black">${p.label}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
