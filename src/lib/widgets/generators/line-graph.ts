import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrMismatchedDataLength = errors.new("series data must have the same length as x-axis categories")

// Factory helpers to avoid schema reuse and $ref generation
function createSeriesSchema() {
	return z
		.object({
			name: z
				.string()
				.describe("The name of this data series, which will appear in the legend (e.g., 'Bullhead City', 'Sedona')."),
			values: z
				.array(z.number())
				.describe(
					"An array of numerical values for this series. The order must correspond to the `xAxis.categories` array."
				),
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex format only (#RGB, #RRGGBB, or #RRGGBBAA)")
				.describe(
					"The color for the line and points of this series in hex format only (e.g., '#000', '#3377dd', '#ff000080')."
				),
			style: z
				.enum(["solid", "dashed", "dotted"])
				.describe(
					"The visual style of the line. 'solid' is a continuous line, 'dashed' and 'dotted' are broken lines."
				),
			pointShape: z.enum(["circle", "square"]).describe("The shape of the marker for each data point."),
			yAxis: z.enum(["left", "right"]).describe("Specifies which Y-axis this series should be plotted against.")
		})
		.strict()
}

function createYAxisSchema() {
	return z
		.object({
			label: z
				.string()
				.nullable()
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
				.describe("The label for the vertical axis (e.g., 'Average temperature (°C)')."),
			min: z.number().describe("The minimum value for the y-axis scale."),
			max: z.number().describe("The maximum value for the y-axis scale."),
			tickInterval: z.number().positive().describe("The numeric interval between labeled tick marks on the y-axis."),
			showGridLines: z.boolean().describe("If true, displays horizontal grid lines for the y-axis.")
		})
		.strict()
}

export const LineGraphPropsSchema = z
	.object({
		type: z.literal("lineGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 500, 600)."),
		height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 400, 350)."),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The main title displayed above the graph. Null for no title."),
		xAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe("The label for the horizontal axis (e.g., 'Month')."),
				categories: z
					.array(z.string())
					.describe("An array of labels for the x-axis categories (e.g., ['Jan', 'Feb', 'Mar']).")
			})
			.strict(),
		yAxis: createYAxisSchema(),
		yAxisRight: z
			.union([createYAxisSchema(), z.null()])
			.describe("Configuration for an optional second Y-axis on the right side. Null for a single-axis graph."),
		series: z.array(createSeriesSchema()).describe("An array of data series to plot on the graph."),
		showLegend: z.boolean().describe("If true, a legend is displayed to identify each data series.")
	})
	.strict()
	.describe(
		"Creates a multi-series line graph for comparing trends across categorical data. Supports multiple lines with distinct styles, data point markers, an optional second Y-axis, and a legend."
	)

export type LineGraphProps = z.infer<typeof LineGraphPropsSchema>

export const generateLineGraph: WidgetGenerator<typeof LineGraphPropsSchema> = (props) => {
	const { width, height, title, xAxis, yAxis, yAxisRight, series, showLegend } = props

	for (const s of series) {
		if (s.values.length !== xAxis.categories.length) {
			logger.error("mismatched data length in line graph", {
				seriesName: s.name,
				valuesCount: s.values.length,
				categoriesCount: xAxis.categories.length
			})
			throw errors.wrap(
				ErrMismatchedDataLength,
				`Series "${s.name}" has ${s.values.length} values, but xAxis has ${xAxis.categories.length} categories.`
			)
		}
	}

	const legendHeight = showLegend ? 40 : 0
	const rightAxisWidth = yAxisRight ? 60 : 0
	const margin = { top: 40, right: 20 + rightAxisWidth, bottom: 50 + legendHeight, left: 60 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0) return `<svg width="${width}" height="${height}"></svg>`

	// Y-axis scaling functions
	const scaleYLeft = chartHeight / (yAxis.max - yAxis.min)
	const toSvgYLeft = (val: number) => height - margin.bottom - (val - yAxis.min) * scaleYLeft
	const toSvgYRight = yAxisRight
		? (val: number) =>
				height - margin.bottom - ((val - yAxisRight.min) / (yAxisRight.max - yAxisRight.min)) * chartHeight
		: () => 0

	// X-axis scaling
	const stepX = chartWidth / (xAxis.categories.length > 1 ? xAxis.categories.length - 1 : 1)
	const toSvgX = (index: number) => margin.left + index * stepX

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title) svg += `<text x="${width / 2}" y="${margin.top / 2}" class="title">${title}</text>`

	// Left Y-axis
	svg += `<g class="axis y-axis-left">`
	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black"/>`
	if (yAxis.label)
		svg += `<text x="${margin.left - 45}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 45}, ${margin.top + chartHeight / 2})">${yAxis.label}</text>`
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = toSvgYLeft(t)
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${t}</text>`
		if (yAxis.showGridLines) {
			svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#ccc" stroke-dasharray="2"/>`
		}
	}
	svg += "</g>"

	// Right Y-axis
	if (yAxisRight) {
		const rightAxisX = width - margin.right
		svg += `<g class="axis y-axis-right">`
		svg += `<line x1="${rightAxisX}" y1="${margin.top}" x2="${rightAxisX}" y2="${height - margin.bottom}" stroke="black"/>`
		if (yAxisRight.label)
			svg += `<text x="${rightAxisX + 45}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${rightAxisX + 45}, ${margin.top + chartHeight / 2})">${yAxisRight.label}</text>`
		for (let t = yAxisRight.min; t <= yAxisRight.max; t += yAxisRight.tickInterval) {
			const y = toSvgYRight(t)
			svg += `<line x1="${rightAxisX}" y1="${y}" x2="${rightAxisX + 5}" y2="${y}" stroke="black"/>`
			svg += `<text x="${rightAxisX + 10}" y="${y + 4}" text-anchor="start">${t}</text>`
		}
		svg += "</g>"
	}

	// X-axis
	svg += `<g class="axis x-axis">`
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black"/>`
	if (xAxis.label)
		svg += `<text x="${margin.left + chartWidth / 2}" y="${height - margin.bottom + 40}" class="axis-label">${xAxis.label}</text>`
	xAxis.categories.forEach((cat, i) => {
		if (cat) {
			const x = toSvgX(i)
			svg += `<line x1="${x}" y1="${height - margin.bottom}" x2="${x}" y2="${height - margin.bottom + 5}" stroke="black"/>`
			svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle">${cat}</text>`
		}
	})
	svg += "</g>"

	// Data Series
	for (const s of series) {
		const toSvgY = s.yAxis === "right" ? toSvgYRight : toSvgYLeft
		const pointsStr = s.values.map((v, i) => `${toSvgX(i)},${toSvgY(v)}`).join(" ")

		let dasharray = ""
		if (s.style === "dashed") dasharray = 'stroke-dasharray="8 4"'
		if (s.style === "dotted") dasharray = 'stroke-dasharray="2 6"'
		svg += `<polyline points="${pointsStr}" fill="none" stroke="${s.color}" stroke-width="2.5" ${dasharray}/>`

		for (const [i, v] of s.values.entries()) {
			const cx = toSvgX(i)
			const cy = toSvgY(v)
			if (s.pointShape === "circle") {
				svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="${s.color}"/>`
			} else if (s.pointShape === "square") {
				svg += `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="${s.color}"/>`
			}
		}
	}

	// Legend
	if (showLegend) {
		let currentX = margin.left
		const legendY = height - legendHeight / 2 - 10
		for (const s of series) {
			let dasharray = ""
			if (s.style === "dashed") dasharray = 'stroke-dasharray="8 4"'
			svg += `<line x1="${currentX}" y1="${legendY}" x2="${currentX + 30}" y2="${legendY}" stroke="${s.color}" stroke-width="2.5" ${dasharray}/>`
			if (s.pointShape === "circle") {
				svg += `<circle cx="${currentX + 15}" cy="${legendY}" r="4" fill="${s.color}"/>`
			} else if (s.pointShape === "square") {
				svg += `<rect x="${currentX + 11}" y="${legendY - 4}" width="8" height="8" fill="${s.color}"/>`
			}
			currentX += 40
			svg += `<text x="${currentX}" y="${legendY + 4}">${s.name}</text>`
			currentX += s.name.length * 8 + 20
		}
	}

	svg += "</svg>"
	return svg
}
