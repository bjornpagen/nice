import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import {
	calculateTextAwareLabelSelection,
	calculateTitleLayout,
	calculateXAxisLayout,
	calculateYAxisLayout,
	computeDynamicWidth,
	includePointX,
	includeText,
	initExtents
} from "@/lib/widgets/utils/layout"
import { renderRotatedWrappedYAxisLabel, renderWrappedText } from "@/lib/widgets/utils/text"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data and state for a single bar in the chart
const BarDataSchema = z
	.object({
		label: z
			.string()
			.describe(
				"The category name displayed below this bar on the x-axis (e.g., 'January', 'Apples'). Use empty string \"\" to hide label."
			),
		value: z.number().describe("The numerical value determining the bar's height. Can be positive or negative."),
		state: z
			.enum(["normal", "unknown"])
			.describe(
				"Visual state of the bar. 'normal' shows a solid bar with the actual value. 'unknown' shows a patterned bar."
			)
	})
	.strict()

// Define Y-axis schema separately
const YAxisSchema = z
	.object({
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The title for the vertical axis (e.g., 'Sales ($)', 'Count', null). Null shows no label."),
		min: z.number().describe("The minimum value shown on the y-axis. Must be less than max."),
		max: z.number().describe("The maximum value shown on the y-axis. Must be greater than min."),
		tickInterval: z.number().describe("The spacing between tick marks on the y-axis. Should evenly divide (max - min).")
	})
	.strict()

// The main Zod schema for the barChart function
export const BarChartPropsSchema = z
	.object({
		type: z
			.literal("barChart")
			.describe("Identifies this as a bar chart widget for comparing categorical data with vertical bars."),
		width: z
			.number()
			.positive()
			.describe("Total width of the chart in pixels including margins and labels (e.g., 500)."),
		height: z
			.number()
			.positive()
			.describe("Total height of the chart in pixels including title and axis labels (e.g., 350)."),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"The main title displayed above the chart (e.g., 'Monthly Sales', 'Student Scores', null). Null means no title."
			),
		xAxisLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"The label for the horizontal axis (e.g., 'Months', 'Products', null). Null if categories are self-explanatory."
			),
		yAxis: YAxisSchema.describe("Configuration for the vertical axis including scale, labels, and tick marks."),
		data: z
			.array(BarDataSchema)
			.describe(
				"Array of bars to display. Each bar represents one category. Order determines left-to-right positioning."
			),
		barColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("Hex-only color for normal bars (e.g., '#4472C4', '#1E90FF', '#00000080' for 50% alpha).")
	})
	.strict()
	.describe(
		"Creates a vertical bar chart for comparing values across categories. Supports both known values and 'unknown' placeholders."
	)

export type BarChartProps = z.infer<typeof BarChartPropsSchema>

/**
 * This template generates a standard vertical bar chart as an SVG graphic.
 * Bar charts are used to compare numerical values across a set of discrete categories.
 * Supports rendering bars in an "unknown" state for missing value problems.
 */
export const generateBarChart: WidgetGenerator<typeof BarChartPropsSchema> = (data) => {
	const { width, height, title, xAxisLabel, yAxis, data: chartData, barColor } = data
	
	// MODIFIED: Replace static margin with dynamic layout calculations
	const { titleY, topMargin } = calculateTitleLayout(title ?? undefined, width - 60)
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true)
	const chartHeight = height - topMargin - bottomMargin
	if (chartHeight <= 0) return `<svg width="${width}" height="${height}"></svg>`
	
	const { leftMargin, yAxisLabelX } = calculateYAxisLayout({
		...yAxis,
		label: yAxis.label ?? ""
	}, chartHeight)
	const margin = { top: topMargin, right: 20, bottom: bottomMargin, left: leftMargin }
	const chartWidth = width - margin.left - margin.right
	
	if (chartWidth <= 0 || chartData.length === 0) {
		logger.error("invalid chart dimensions or data for bar chart", {
			chartWidth,
			chartHeight,
			dataLength: chartData.length
		})
		throw errors.wrap(
			ErrInvalidDimensions,
			`chart dimensions must be positive and data must not be empty. width: ${chartWidth}, height: ${chartHeight}, data length: ${chartData.length}`
		)
	}

	const scaleY = chartHeight / (yAxis.max - yAxis.min)
	const barWidth = chartWidth / chartData.length
	const barPadding = 0.2

	const ext = initExtents(width) // NEW: Initialize extents tracking
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += "<style>.axis-label { font-size: 14px; font-weight: bold; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	// MODIFIED: Use wrapped text for title
	if (title !== null) {
		svg += renderWrappedText(abbreviateMonth(title), width / 2, titleY, "title", "1.1em", width - 60, 8)
		includeText(ext, width / 2, abbreviateMonth(title), "middle", 7)
	}

	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black"/>`
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black"/>`

	// MODIFIED: Use dynamic positioning and new renderers
	if (xAxisLabel !== null) {
		const labelX = margin.left + chartWidth / 2
		const labelY = height - margin.bottom + xAxisTitleY
		svg += `<text x="${labelX}" y="${labelY}" class="axis-label">${abbreviateMonth(xAxisLabel)}</text>`
		includeText(ext, labelX, abbreviateMonth(xAxisLabel), "middle", 7)
	}
	if (yAxis.label !== null) {
		const yCenter = margin.top + chartHeight / 2
		svg += renderRotatedWrappedYAxisLabel(abbreviateMonth(yAxis.label), yAxisLabelX, yCenter, chartHeight)
		includeText(ext, yAxisLabelX, abbreviateMonth(yAxis.label), "middle", 7)
	}

	// Y ticks and grid lines
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = height - margin.bottom - (t - yAxis.min) * scaleY
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 4}" fill="black" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, String(t), "end", 7)
		svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#ccc" stroke-dasharray="2"/>`
	}

	// MODIFIED: Bars and text-aware X-axis labels
	const xTickPositions = chartData.map((_, i) => margin.left + i * barWidth + barWidth / 2)
	const xTickLabels = chartData.map((d) => abbreviateMonth(d.label))
	const selectedXLabels = calculateTextAwareLabelSelection(xTickLabels, xTickPositions, chartWidth)

	chartData.forEach((d, i) => {
		const barHeight = d.value * scaleY
		const x = margin.left + i * barWidth
		const y = height - margin.bottom - barHeight
		const innerBarWidth = barWidth * (1 - barPadding)
		const xOffset = (barWidth - innerBarWidth) / 2
		const barX = x + xOffset // New variable for clarity

		// Track the horizontal extent of the bar
		includePointX(ext, barX)
		includePointX(ext, barX + innerBarWidth)

		if (d.state === "normal") {
			svg += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="${barColor}"/>`
		} else {
			svg += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="none" stroke="${barColor}" stroke-width="2" stroke-dasharray="4"/>`
		}
		
			if (d.label !== "" && selectedXLabels.has(i)) {
		const labelX = x + barWidth / 2
		svg += `<text x="${labelX}" y="${height - margin.bottom + 15}" fill="black" text-anchor="middle">${d.label}</text>`
		includeText(ext, labelX, d.label, "middle", 7)
	}
	})

	// NEW: Apply dynamic width at the end
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
