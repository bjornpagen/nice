import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data and state for a single bar in the chart
const BarDataSchema = z.object({
	label: z.string().describe("The label for this category, displayed on the X-axis."),
	value: z.number().describe("The numerical value of the bar, determining its height."),
	state: z
		.enum(["normal", "unknown"])
		.nullable()
		.transform((val) => val ?? "normal")
		.describe('The visual state of the bar. "unknown" bars are styled as placeholders.')
})

// The main Zod schema for the barChart function
export const BarChartPropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total height of the output SVG container in pixels."),
		title: z.string().nullable().describe("An optional title displayed above the chart."),
		xAxisLabel: z.string().nullable().describe("An optional label for the horizontal category axis."),
		yAxis: z.object({
			label: z.string().nullable().describe("An optional label for the vertical value axis."),
			min: z
				.number()
				.nullable()
				.transform((val) => val ?? 0)
				.describe("The minimum value for the Y-axis scale."),
			max: z
				.number()
				.nullable()
				.describe("The maximum value for the Y-axis scale. If omitted, it will be calculated automatically."),
			tickInterval: z.number().describe("The numeric interval between labeled tick marks on the Y-axis.")
		}),
		data: z.array(BarDataSchema).describe("An array of bar data objects, one for each category."),
		barColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "#4285F4")
			.describe('The fill color for bars in the "normal" state.')
	})
	.describe(
		'This template generates a standard vertical bar chart as an SVG graphic. Bar charts are used to compare numerical values across a set of discrete categories. The output is highly customizable and suitable for questions involving data comparison or finding missing values. The generator will construct a complete Cartesian coordinate system with a vertical (Y) axis for numerical values and a horizontal (X) axis for categories. Both axes are configurable with titles (e.g., "Number of puppets," "Puppeteer"). The Y-axis will have labeled tick marks and optional horizontal grid lines to help read values. For each category provided, a rectangular bar is rendered. The height of the bar corresponds to its numerical value. A key feature of this template is its ability to render a bar in a distinct "unknown" or "placeholder" state. This is ideal for "missing value given the mean" problems, where the bar can be rendered as a dashed outline or a different color to indicate that its value is what the student needs to find. Regular bars have a standard fill color. All bars are clearly labeled with their category name on the X-axis.'
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

	const maxValue = yAxis.max ?? Math.max(...chartData.map((d) => d.value))
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
