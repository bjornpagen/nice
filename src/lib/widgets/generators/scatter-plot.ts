import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single data point on the scatter plot
const ScatterPointSchema = z.object({
	x: z.number().describe("The value of the point on the horizontal (X) axis."),
	y: z.number().describe("The value of the point on the vertical (Y) axis."),
	label: z.string().nullable().describe("An optional text label to display near the point.")
})

// Defines the properties of an axis (X or Y)
const AxisSchema = z.object({
	label: z.string().describe('The text title for the axis (e.g., "Driver Age").'),
	min: z.number().describe("The minimum value displayed on the axis."),
	max: z.number().describe("The maximum value displayed on the axis."),
	tickInterval: z.number().describe("The numeric interval between tick marks on the axis."),
	gridLines: z
		.boolean()
		.nullable()
		.transform((val) => val ?? false)
		.describe("If true, display grid lines for this axis.")
})

// Defines a linear trend line using slope and y-intercept
const LinearTrendLineSchema = z.object({
	type: z.literal("linear").describe("Specifies a straight line."),
	slope: z.number().describe("The slope of the line (rise over run)."),
	yIntercept: z.number().describe("The y-value where the line crosses the Y-axis.")
})

// Defines a nonlinear (quadratic) trend curve
const QuadraticTrendLineSchema = z.object({
	type: z.literal("quadratic").describe("Specifies a parabolic curve."),
	a: z.number().describe("The coefficient for the x^2 term in y = ax^2 + bx + c."),
	b: z.number().describe("The coefficient for the x term in y = ax^2 + bx + c."),
	c: z.number().describe("The constant term (y-intercept) in y = ax^2 + bx + c.")
})

// Defines the visual styling and labeling for any trend line
const TrendLineStyleSchema = z.object({
	id: z.string().describe('A unique identifier for the line (e.g., "line-a").'),
	label: z.string().nullable().describe('An optional label to display next to the line (e.g., "A", "B").'),
	color: z
		.string()
		.nullable()
		.transform((val) => val ?? "#EA4335")
		.describe('The color of the line, as a CSS color string (e.g., "red", "#FF0000").'),
	style: z
		.enum(["solid", "dashed"])
		.nullable()
		.transform((val) => val ?? "solid")
		.describe("The style of the line."),
	data: z
		.union([LinearTrendLineSchema, QuadraticTrendLineSchema])
		.describe("The mathematical definition of the line or curve.")
})

// The main Zod schema for the scatterPlot function
export const ScatterPlotPropsSchema = z
	.object({
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
		title: z.string().nullable().describe("An optional title displayed above or below the plot."),
		xAxis: AxisSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: AxisSchema.describe("Configuration for the vertical (Y) axis."),
		points: z.array(ScatterPointSchema).describe("An array of data points to be plotted."),
		trendLines: z
			.array(TrendLineStyleSchema)
			.nullable()
			.describe("An optional array of one or more trend lines or curves to overlay on the plot.")
	})
	.describe(
		"This template generates a two-dimensional scatter plot as an SVG graphic. It constructs a full Cartesian coordinate system and plots data points at specified (x, y) coordinates. Its key feature is the ability to render one or more trend lines (linear or nonlinear) to model the relationship between variables. This is ideal for questions about lines of best fit, data modeling, and making predictions."
	)

export type ScatterPlotProps = z.infer<typeof ScatterPlotPropsSchema>

/**
 * Generates a two-dimensional scatter plot to visualize the relationship between two
 * variables, with optional support for overlaying linear or nonlinear trend lines.
 */
export const generateScatterPlot: WidgetGenerator<typeof ScatterPlotPropsSchema> = (data) => {
	const { width, height, title, xAxis, yAxis, points, trendLines } = data
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

	// Trend lines
	if (trendLines) {
		for (const tl of trendLines) {
			const dash = tl.style === "dashed" ? ` stroke-dasharray="5 3"` : ""
			if (tl.data.type === "linear") {
				const { slope, yIntercept } = tl.data
				const y1 = slope * xAxis.min + yIntercept
				const y2 = slope * xAxis.max + yIntercept
				svg += `<line x1="${toSvgX(xAxis.min)}" y1="${toSvgY(y1)}" x2="${toSvgX(xAxis.max)}" y2="${toSvgY(y2)}" stroke="${tl.color}" stroke-width="2"${dash} />`
			} else if (tl.data.type === "quadratic") {
				const { a, b, c } = tl.data
				const steps = 100
				let path = ""
				for (let i = 0; i <= steps; i++) {
					const xVal = xAxis.min + (i / steps) * (xAxis.max - xAxis.min)
					const yVal = a * xVal ** 2 + b * xVal + c
					const px = toSvgX(xVal)
					const py = toSvgY(yVal)
					path += `${i === 0 ? "M" : "L"} ${px} ${py} `
				}
				svg += `<path d="${path}" fill="none" stroke="${tl.color}" stroke-width="2"${dash} />`
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
