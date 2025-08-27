import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import {
	calculateXAxisLayout,
	computeDynamicWidth,
	includePointX,
	includeText,
	initExtents
} from "@/lib/widgets/utils/layout"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data and styling for a single bar in the chart
const BarDataSchema = z
	.object({
		category: z
			.string()
			.min(1, "category name cannot be empty")
			.describe(
				"The category name displayed on the y-axis as a tick label (e.g., 'Lamb', 'Beef', 'Chicken'). Must be meaningful text."
			),
		value: z.number().positive().describe("The numerical value determining the bar's length."),
		label: z
			.string()
			.min(1, "value label cannot be empty")
			.describe(
				"The text label displaying the bar's value next to the bar (e.g., '184.8 m²', '45.3 kg'). Must show the actual value with units."
			),
		color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("CSS color for this specific bar.")
	})
	.strict()

// The main Zod schema for the horizontalBarChart function
export const HorizontalBarChartPropsSchema = z
	.object({
		type: z.literal("horizontalBarChart"),
		width: z.number().positive().describe("Total width of the chart in pixels (e.g., 600)."),
		height: z.number().positive().describe("Total height of the chart in pixels (e.g., 400)."),
		xAxis: z
			.object({
				label: z
					.string()
					.describe("The label for the horizontal axis (e.g., 'Land use per 100 grams of protein (m²)')."),
				min: z.number().min(0).describe("The minimum value on the x-axis (usually 0)."),
				max: z.number().positive().describe("The maximum value on the x-axis."),
				tickInterval: z.number().positive().describe("The spacing between tick marks on the x-axis.")
			})
			.strict()
			.describe("Configuration for the horizontal value axis."),
		data: z
			.array(BarDataSchema)
			.describe(
				"Complete array of ALL data bars to display, ordered from top to bottom. Each bar must have a meaningful category name and value label."
			),
		gridColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for the vertical grid lines.")
	})
	.strict()
	.describe(
		"Creates a horizontal bar chart styled to match the land use example, with individual bar colors, value labels, and a serif font."
	)

export type HorizontalBarChartProps = z.infer<typeof HorizontalBarChartPropsSchema>

/**
 * Generates a horizontal bar chart styled to replicate the provided land use graph.
 */
export const generateHorizontalBarChart: WidgetGenerator<typeof HorizontalBarChartPropsSchema> = (data) => {
	const { width, height, xAxis, data: chartData, gridColor } = data

	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	const margin = { top: PADDING, right: 80, bottom: bottomMargin, left: 100 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartWidth <= 0 || chartHeight <= 0 || chartData.length === 0) {
		logger.error("invalid chart dimensions or data for horizontal bar chart", {
			chartWidth,
			chartHeight,
			dataLength: chartData.length
		})
		throw errors.wrap(ErrInvalidDimensions, "chart dimensions must be positive and data must not be empty.")
	}

	const scaleX = chartWidth / (xAxis.max - xAxis.min)
	const barHeight = chartHeight / chartData.length
	const barPadding = 0.4 // 40% of bar height is padding

	const ext = initExtents(width) // NEW: Initialize extents tracking
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="serif">`
	svg +=
		"<style>.axis-label { font-size: 1.1em; font-weight: bold; text-anchor: middle; } .tick-label { font-size: 1.1em; } .category-label { font-size: 1.1em; } .value-label { font-size: 1.1em; } </style>"

	const chartBody = `<g transform="translate(${margin.left},${margin.top})">`
	svg += chartBody

	// X-axis line and ticks
	svg += `<line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="black" stroke-width="2"/>`
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		const x = (t - xAxis.min) * scaleX
		svg += `<line x1="${x}" y1="0" x2="${x}" y2="${chartHeight}" stroke="${gridColor}" stroke-width="1.5"/>`
		svg += `<line x1="${x}" y1="${chartHeight}" x2="${x}" y2="${chartHeight + 5}" stroke="black" stroke-width="1.5"/>`
		svg += `<text x="${x}" y="${chartHeight + 20}" class="tick-label" text-anchor="middle">${t}</text>`
		includeText(ext, margin.left + x, String(t), "middle") // NEW: Track extents
	}

	// Y-axis line
	svg += `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="black" stroke-width="2"/>`

	// X-Axis Label
	const xAxisLabelX = margin.left + chartWidth / 2
	svg += `<text x="${chartWidth / 2}" y="${chartHeight + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxis.label)}</text>`
	includeText(ext, xAxisLabelX, abbreviateMonth(xAxis.label), "middle") // NEW: Track extents

	// Bars, Y-axis categories, and value labels
	chartData.forEach((d, i) => {
		const barLength = d.value * scaleX
		const innerBarHeight = barHeight * (1 - barPadding)
		const yOffset = (barHeight - innerBarHeight) / 2
		const y = i * barHeight + yOffset

		// Track the bar from its start (0) to its end (barLength) in chart coordinates
		includePointX(ext, margin.left)
		includePointX(ext, margin.left + barLength)

		// Bar
		svg += `<rect x="0" y="${y}" width="${barLength}" height="${innerBarHeight}" fill="${d.color}"/>`

		// Y-axis category label
		const categoryLabelX = -10
		svg += `<text x="${categoryLabelX}" y="${y + innerBarHeight / 2}" class="category-label" text-anchor="end" dominant-baseline="middle">${abbreviateMonth(d.category)}</text>`
		includeText(ext, margin.left + categoryLabelX, abbreviateMonth(d.category), "end") // NEW: Track extents
		
		// Tick mark for category
		svg += `<line x1="0" y1="${y + innerBarHeight / 2}" x2="-5" y2="${y + innerBarHeight / 2}" stroke="black" stroke-width="1.5"/>`

		// Value label
		const valueLabelX = barLength + 5
		svg += `<text x="${valueLabelX}" y="${y + innerBarHeight / 2}" class="value-label" text-anchor="start" dominant-baseline="middle">${abbreviateMonth(d.label)}</text>`
		includeText(ext, margin.left + valueLabelX, abbreviateMonth(d.label), "start") // NEW: Track extents
	})

	svg += "</g>" // Close chartBody group
	
	// NEW: Apply dynamic width at the end
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	
	svg += "</svg>"
	return svg
}
