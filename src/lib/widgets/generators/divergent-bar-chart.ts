import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { computeLabelSelection } from "@/lib/widgets/utils/labels"
import { initExtents, includeText, computeDynamicWidth } from "@/lib/widgets/utils/layout"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data for a single bar in the chart
const DataPointSchema = z
	.object({
		category: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The label for this category on the x-axis (e.g., '1st', '5th'). Null hides the label."),
		value: z
			.number()
			.describe("The numerical value. Positive values are drawn above the zero line, negative values below.")
	})
	.strict()

// The main Zod schema for the divergentBarChart function
export const DivergentBarChartPropsSchema = z
	.object({
		type: z.literal("divergentBarChart"),
		width: z.number().positive().describe("Total width of the chart in pixels (e.g., 600)."),
		height: z.number().positive().describe("Total height of the chart in pixels (e.g., 400)."),
		xAxisLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The label for the horizontal axis (e.g., 'Century'). Null shows no label."),
		yAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe("The title for the vertical axis (e.g., 'Change in sea level (cm)'). Null shows no label."),
				min: z.number().describe("The minimum value on the y-axis (can be negative)."),
				max: z.number().describe("The maximum value on the y-axis."),
				tickInterval: z.number().positive().describe("The spacing between tick marks on the y-axis.")
			})
			.strict()
			.describe("Configuration for the vertical axis."),
		data: z.array(DataPointSchema).describe("Array of data points to display."),
		positiveBarColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for bars with positive values."),
		negativeBarColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for bars with negative values."),
		gridColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for the horizontal grid lines.")
	})
	.strict()
	.describe(
		"Creates a divergent bar chart where bars can be positive or negative, extending from a central zero line. Styled to match the sea level change example."
	)

export type DivergentBarChartProps = z.infer<typeof DivergentBarChartPropsSchema>

/**
 * Generates a divergent bar chart styled to replicate the provided sea level change graph.
 */
export const generateDivergentBarChart: WidgetGenerator<typeof DivergentBarChartPropsSchema> = (data) => {
	const { width, height, xAxisLabel, yAxis, data: chartData, positiveBarColor, negativeBarColor, gridColor } = data

	const margin = { top: 20, right: 20, bottom: 60, left: 80 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0 || chartData.length === 0 || yAxis.min >= yAxis.max) {
		logger.error("invalid chart dimensions or data for divergent bar chart", {
			chartWidth,
			chartHeight,
			dataLength: chartData.length,
			yAxis
		})
		throw errors.wrap(
			ErrInvalidDimensions,
			"chart dimensions must be positive, data must not be empty, and y-axis min must be less than max."
		)
	}

	const yRange = yAxis.max - yAxis.min
	const scaleY = chartHeight / yRange
	const barWidth = chartWidth / chartData.length
	const barPadding = 0.4

	// yZero is derivable from yAxis and scale; not needed directly

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg +=
		"<style>.axis-label { font-size: 1.1em; font-weight: bold; text-anchor: middle; } .tick-label { font-size: 1em; font-weight: bold; } </style>"

	const chartBody = `<g transform="translate(${margin.left},${margin.top})">`
	svg += chartBody

	// Y-axis line with ticks and labels
	svg += `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="#333" stroke-width="2"/>`
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = chartHeight - (t - yAxis.min) * scaleY
		// Grid line
		svg += `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`
		// Tick label
		svg += `<text x="-10" y="${y + 5}" class="tick-label" text-anchor="end">${t}</text>`
	}

	// Prominent Zero Line
	const yZeroInChartCoords = chartHeight - (0 - yAxis.min) * scaleY
	svg += `<line x1="0" y1="${yZeroInChartCoords}" x2="${chartWidth}" y2="${yZeroInChartCoords}" stroke="black" stroke-width="2"/>`

	// Axis Labels
	if (xAxisLabel !== null) {
		svg += `<text x="${chartWidth / 2}" y="${chartHeight + 45}" class="axis-label">${xAxisLabel}</text>`
		includeText(ext, chartWidth / 2, xAxisLabel, "middle", 7)
	}
	if (yAxis.label !== null) {
		svg += `<text x="${-chartHeight / 2}" y="-60" class="axis-label" transform="rotate(-90)">${yAxis.label}</text>`
		// approximate at left margin area, include as middle at some x near -60 rotated
		includeText(ext, -60, yAxis.label, "middle", 7)
	}

	// Bars and X-axis labels
	const minLabelSpacingPx = 50
	const allIndices = Array.from({ length: chartData.length }, (_, idx) => idx)
	const candidateIndices = allIndices.filter((idx) => chartData[idx]?.category !== null)
	const selectedLabelIndices = computeLabelSelection(chartData.length, candidateIndices, chartWidth, minLabelSpacingPx)

	chartData.forEach((d, i) => {
		const barAbsHeight = Math.abs(d.value) * scaleY
		const x = i * barWidth
		const innerBarWidth = barWidth * (1 - barPadding)
		const xOffset = (barWidth - innerBarWidth) / 2

		let y: number
		let color: string

		if (d.value >= 0) {
			y = yZeroInChartCoords - barAbsHeight
			color = positiveBarColor
		} else {
			y = yZeroInChartCoords
			color = negativeBarColor
		}

		svg += `<rect x="${x + xOffset}" y="${y}" width="${innerBarWidth}" height="${barAbsHeight}" fill="${color}"/>`

		const labelX = x + barWidth / 2
		if (d.category !== null && selectedLabelIndices.has(i)) {
			svg += `<text x="${labelX}" y="${chartHeight + 25}" class="tick-label" text-anchor="middle">${d.category}</text>`
			includeText(ext, labelX, d.category, "middle", 7)
		}
	})

	// Add right-side border for the chart area
	svg += `<line x1="${chartWidth}" y1="0" x2="${chartWidth}" y2="${chartHeight}" stroke="#333" stroke-width="2"/>`

	svg += "</g>" // Close chartBody group
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
