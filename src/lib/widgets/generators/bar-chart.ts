import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data and state for a single bar in the chart
const BarDataSchema = z
	.object({
		label: z.string().describe("The category name displayed below this bar on the x-axis (e.g., 'January', 'Apples')."),
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
		label: z.string().describe("The title for the vertical axis. Can be empty string if not needed."),
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
		title: z.string().describe("The main title displayed above the chart. Can be empty string for no title."),
		xAxisLabel: z
			.string()
			.describe("The label for the horizontal axis. Can be empty string if categories are self-explanatory."),
		yAxis: YAxisSchema.describe("Configuration for the vertical axis including scale, labels, and tick marks."),
		data: z
			.array(BarDataSchema)
			.describe(
				"Array of bars to display. Each bar represents one category. Order determines left-to-right positioning."
			),
		barColor: z.string().describe("CSS color for normal bars (e.g., '#4472C4', 'steelblue', 'rgba(68,114,196,0.8)').")
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
	const margin = { top: 40, right: 20, bottom: 50, left: 50 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0 || chartData.length === 0) {
		throw errors.wrap(
			ErrInvalidDimensions,
			`chart dimensions must be positive and data must not be empty. width: ${chartWidth}, height: ${chartHeight}, data length: ${chartData.length}`
		)
	}

	const maxValue = yAxis.max
	const scaleY = chartHeight / (maxValue - yAxis.min)
	const barWidth = chartWidth / chartData.length
	const barPadding = 0.2 // 20% of bar width is padding

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; font-weight: bold; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title) svg += `<text x="${width / 2}" y="${margin.top / 2}" class="title">${title}</text>`

	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black"/>` // Y-axis
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black"/>` // X-axis

	// Axis Labels
	if (xAxisLabel)
		svg += `<text x="${margin.left + chartWidth / 2}" y="${height - 10}" class="axis-label">${xAxisLabel}</text>`
	if (yAxis.label)
		svg += `<text x="${margin.left - 30}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 30}, ${margin.top + chartHeight / 2})">${yAxis.label}</text>`

	// Y ticks and grid lines
	for (let t = yAxis.min; t <= maxValue; t += yAxis.tickInterval) {
		const y = height - margin.bottom - (t - yAxis.min) * scaleY
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 4}" fill="black" text-anchor="end">${t}</text>`
		svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#ccc" stroke-dasharray="2"/>`
	}

	// Bars and X-axis labels
	chartData.forEach((d, i) => {
		const barHeight = d.value * scaleY
		const x = margin.left + i * barWidth
		const y = height - margin.bottom - barHeight
		const innerBarWidth = barWidth * (1 - barPadding)
		const xOffset = (barWidth - innerBarWidth) / 2

		if (d.state === "normal") {
			svg += `<rect x="${x + xOffset}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="${barColor}"/>`
		} else {
			svg += `<rect x="${x + xOffset}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="none" stroke="${barColor}" stroke-width="2" stroke-dasharray="4"/>`
		}
		svg += `<text x="${x + barWidth / 2}" y="${height - margin.bottom + 15}" fill="black" text-anchor="middle">${d.label}</text>`
	})

	svg += "</svg>"
	return svg
}
