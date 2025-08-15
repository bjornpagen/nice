import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data and styling for a single bar in the chart
const BarDataSchema = z
	.object({
		category: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The category name displayed on the y-axis (e.g., 'Lamb', 'Beef'). Null hides the label."),
		value: z.number().positive().describe("The numerical value determining the bar's length."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"The text label to display next to the bar, showing its value (e.g., '184.8 m²'). Null hides the label."
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
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe(
						"The label for the horizontal axis (e.g., 'Land use per 100 grams of protein (m²)'). Null shows no label."
					),
				min: z.number().min(0).describe("The minimum value on the x-axis (usually 0)."),
				max: z.number().positive().describe("The maximum value on the x-axis."),
				tickInterval: z.number().positive().describe("The spacing between tick marks on the x-axis.")
			})
			.strict()
			.describe("Configuration for the horizontal value axis."),
		data: z.array(BarDataSchema).describe("Array of data bars to display, from top to bottom."),
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

	const margin = { top: 20, right: 80, bottom: 60, left: 100 }
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
	}

	// Y-axis line
	svg += `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="black" stroke-width="2"/>`

	// X-Axis Label
	if (xAxis.label !== null) {
		svg += `<text x="${chartWidth / 2}" y="${chartHeight + 50}" class="axis-label">${xAxis.label}</text>`
	}

	// Bars, Y-axis categories, and value labels
	chartData.forEach((d, i) => {
		const barLength = d.value * scaleX
		const innerBarHeight = barHeight * (1 - barPadding)
		const yOffset = (barHeight - innerBarHeight) / 2
		const y = i * barHeight + yOffset

		// Bar
		svg += `<rect x="0" y="${y}" width="${barLength}" height="${innerBarHeight}" fill="${d.color}"/>`

		// Y-axis category label
		if (d.category !== null) {
			svg += `<text x="-10" y="${y + innerBarHeight / 2}" class="category-label" text-anchor="end" dominant-baseline="middle">${d.category}</text>`
		}
		// Tick mark for category
		svg += `<line x1="0" y1="${y + innerBarHeight / 2}" x2="-5" y2="${y + innerBarHeight / 2}" stroke="black" stroke-width="1.5"/>`

		// Value label
		if (d.label !== null) {
			svg += `<text x="${barLength + 5}" y="${y + innerBarHeight / 2}" class="value-label" text-anchor="start" dominant-baseline="middle">${d.label}</text>`
		}
	})

	svg += "</g>" // Close chartBody group
	svg += "</svg>"
	return svg
}
