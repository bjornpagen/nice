import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import {
	calculateRightYAxisLayout,
	calculateTextAwareLabelSelection,
	calculateTitleLayout,
	calculateXAxisLayout,
	calculateYAxisLayout,
	computeDynamicWidth,
	includeText,
	initExtents
} from "@/lib/widgets/utils/layout"
import { renderRotatedWrappedYAxisLabel, renderWrappedText } from "@/lib/widgets/utils/text"

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
			label: z.string().describe("The label for the vertical axis (e.g., 'Average temperature (°C)')."),
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
		width: z.number().min(300).describe("Total width of the SVG in pixels (e.g., 500, 600)."),
		height: z.number().min(300).describe("Total height of the SVG in pixels (e.g., 400, 350)."),
		title: z.string().describe("The main title displayed above the graph."),
		xAxis: z
			.object({
				label: z.string().describe("The label for the horizontal axis (e.g., 'Month')."),
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

	const legendItemHeight = 18
	const legendHeight = showLegend ? series.length * legendItemHeight + 12 : 0
	const { leftMargin, yAxisLabelX } = calculateYAxisLayout(yAxis)
	const { rightMargin, rightYAxisLabelX } = calculateRightYAxisLayout(yAxisRight)
	const { bottomMargin: xAxisBottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	const { titleY, topMargin } = calculateTitleLayout(title, width - 60)
	const margin = { top: topMargin, right: rightMargin, bottom: xAxisBottomMargin + legendHeight, left: leftMargin }
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

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	svg += renderWrappedText(abbreviateMonth(title), width / 2, titleY, "title", "1.1em", width - 60, 8)
	includeText(ext, width / 2, abbreviateMonth(title), "middle", 7)

	// Left Y-axis
	svg += `<g class="axis y-axis-left">`
	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black"/>`
	{
		const yCenter = margin.top + chartHeight / 2
		svg += renderRotatedWrappedYAxisLabel(abbreviateMonth(yAxis.label), yAxisLabelX, yCenter, chartHeight)
		includeText(ext, yAxisLabelX, abbreviateMonth(yAxis.label), "middle", 7)
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = toSvgYLeft(t)
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, String(t), "end", 7)
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
		svg += `<text x="${rightAxisX + rightYAxisLabelX}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${rightAxisX + rightYAxisLabelX}, ${margin.top + chartHeight / 2})">${abbreviateMonth(yAxisRight.label)}</text>`
		includeText(ext, rightAxisX + rightYAxisLabelX, abbreviateMonth(yAxisRight.label), "middle", 7)
		for (let t = yAxisRight.min; t <= yAxisRight.max; t += yAxisRight.tickInterval) {
			const y = toSvgYRight(t)
			svg += `<line x1="${rightAxisX}" y1="${y}" x2="${rightAxisX + 5}" y2="${y}" stroke="black"/>`
			svg += `<text x="${rightAxisX + 10}" y="${y + 4}" text-anchor="start">${t}</text>`
			includeText(ext, rightAxisX + 10, String(t), "start", 7)
		}
		svg += "</g>"
	}

	// X-axis with label thinning
	svg += `<g class="axis x-axis">`
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black"/>`
	svg += `<text x="${margin.left + chartWidth / 2}" y="${height - margin.bottom + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxis.label)}</text>`
	includeText(ext, margin.left + chartWidth / 2, abbreviateMonth(xAxis.label), "middle", 7)
	{
		// Text-width-aware label selection for better spacing
		const positions = xAxis.categories.map((_, i) => toSvgX(i))
		const abbreviatedLabels = xAxis.categories.map((cat) => abbreviateMonth(cat))
		const selected = calculateTextAwareLabelSelection(abbreviatedLabels, positions, chartWidth)

		xAxis.categories.forEach((cat, i) => {
			if (!cat) return
			const x = toSvgX(i)
			svg += `<line x1="${x}" y1="${height - margin.bottom}" x2="${x}" y2="${height - margin.bottom + 5}" stroke="black"/>`
			if (selected.has(i)) {
				const abbreviatedCat = abbreviateMonth(cat)
				svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle">${abbreviatedCat}</text>`
				includeText(ext, x, abbreviatedCat, "middle", 7)
			}
		})
	}
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

	// Legend (stacked vertically below chart, centered)
	if (showLegend) {
		const legendLineLength = 30
		const legendGapX = 8
		const estimateTextWidth = (text: string) => text.length * 7
		const maxTextWidth = Math.max(...series.map((s) => estimateTextWidth(s.name)))
		const legendBoxWidth = legendLineLength + 12 + legendGapX + maxTextWidth

		let legendStartX = (width - legendBoxWidth) / 2
		if (legendStartX < 10) legendStartX = 10

		const xAxisY = height - margin.bottom
		const axisLabelY = xAxis.label ? xAxisY + 36 : xAxisY + 18
		let legendStartY = Math.max(axisLabelY + 8, height - 10 - series.length * legendItemHeight)

		series.forEach((s, idx) => {
			const y = legendStartY + idx * legendItemHeight
			const x1 = legendStartX
			const x2 = legendStartX + legendLineLength
			const markerCx = x1 + legendLineLength / 2
			const textX = x2 + legendGapX + 12

			let dash = ""
			if (s.style === "dashed") dash = ' stroke-dasharray="8 4"'
			if (s.style === "dotted") dash = ' stroke-dasharray="2 6"'
			svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${s.color}" stroke-width="2.5"${dash}/>`
			if (s.pointShape === "circle") {
				svg += `<circle cx="${markerCx}" cy="${y}" r="4" fill="${s.color}"/>`
			} else if (s.pointShape === "square") {
				svg += `<rect x="${markerCx - 4}" y="${y - 4}" width="8" height="8" fill="${s.color}"/>`
			}
			svg += `<text x="${textX}" y="${y + 4}">${s.name}</text>`
			includeText(ext, textX, s.name, "start", 7)
		})
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
