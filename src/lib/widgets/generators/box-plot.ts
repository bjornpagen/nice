import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidRange = errors.new("axis min must be less than axis max")

// The main Zod schema for the boxPlot function
export const BoxPlotPropsSchema = z
	.object({
		width: z.number().optional().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(120).describe("The total height of the output SVG container in pixels."),
		axis: z
			.object({
				min: z.number().describe("The minimum value displayed on the axis scale."),
				max: z.number().describe("The maximum value displayed on the axis scale."),
				label: z.string().optional().describe('An optional title for the horizontal axis (e.g., "Number of cookies").'),
				tickLabels: z
					.array(z.number())
					.optional()
					.describe("An optional array of numbers to display as tick labels on the axis.")
			})
			.describe("Configuration for the horizontal number line."),
		summary: z
			.object({
				min: z.number().describe("The minimum value of the data set (left whisker endpoint)."),
				q1: z.number().describe("The first quartile (left edge of the box)."),
				median: z.number().describe("The median value (line inside the box)."),
				q3: z.number().describe("The third quartile (right edge of the box)."),
				max: z.number().describe("The maximum value of the data set (right whisker endpoint).")
			})
			.describe("The five-number summary used to draw the plot."),
		boxColor: z.string().optional().default("#E3F2FD").describe("A CSS color string for the fill of the box."),
		medianColor: z.string().optional().default("#1976D2").describe("A CSS color string for the median line.")
	})
	.describe(
		'This template generates a standard horizontal box-and-whisker plot as an SVG graphic. This type of plot is a powerful tool for summarizing the distribution of a numerical data set through its five-number summary: minimum, first quartile (Q1), median, third quartile (Q3), and maximum. The generator will render a horizontal number line with labeled tick marks to provide scale. Above this axis, the box plot is constructed. A central rectangle (the "box") is drawn, with its left edge at the first quartile (Q1) and its right edge at the third quartile (Q3). The length of this box thus represents the Interquartile Range (IQR). A vertical line is drawn inside the box to mark the median (the 50th percentile). From the left side of the box, a horizontal line (the "whisker") extends to the minimum value of the data set. From the right side of the box, another whisker extends to the maximum value. These whiskers can be capped with small vertical lines. The entire plot provides a concise visual summary of the data\'s center (median), spread (IQR and range), and skewness. The generator allows for customization of colors for the box and median line to enhance readability.'
	)

export type BoxPlotProps = z.infer<typeof BoxPlotPropsSchema>

/**
 * This template generates a standard horizontal box-and-whisker plot as an SVG graphic.
 * This type of plot is a powerful tool for summarizing the distribution of a numerical
 * data set through its five-number summary.
 */
export const generateBoxPlot: WidgetGenerator<typeof BoxPlotPropsSchema> = (data) => {
	const { width, height, axis, summary, boxColor, medianColor } = data
	const margin = { top: 20, right: 20, bottom: 65, left: 20 }
	const plotHeight = height - margin.top - margin.bottom
	const chartWidth = width - margin.left - margin.right
	const yCenter = margin.top + plotHeight / 2

	if (axis.min >= axis.max) {
		throw errors.wrap(ErrInvalidRange, `axis.min (${axis.min}) must be less than axis.max (${axis.max})`)
	}

	const scale = chartWidth / (axis.max - axis.min)
	const toSvgX = (val: number) => margin.left + (val - axis.min) * scale

	const minPos = toSvgX(summary.min)
	const q1Pos = toSvgX(summary.q1)
	const medianPos = toSvgX(summary.median)
	const q3Pos = toSvgX(summary.q3)
	const maxPos = toSvgX(summary.max)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	const axisY = margin.top + plotHeight + 20
	svg += `<line x1="${margin.left}" y1="${axisY}" x2="${width - margin.right}" y2="${axisY}" stroke="black"/>`
	if (axis.label) {
		svg += `<text x="${width / 2}" y="${height - 5}" fill="black" text-anchor="middle" font-size="14">${axis.label}</text>`
	}
	// Use tickLabels if provided, otherwise generate from min/max/interval if possible
	const ticks = axis.tickLabels ?? []
	for (const t of ticks) {
		const pos = toSvgX(t)
		svg += `<line x1="${pos}" y1="${axisY - 5}" x2="${pos}" y2="${axisY + 5}" stroke="black"/>`
		svg += `<text x="${pos}" y="${axisY + 20}" fill="black" text-anchor="middle">${t}</text>`
	}

	// Box plot elements
	// Whiskers
	svg += `<line x1="${minPos}" y1="${yCenter}" x2="${q1Pos}" y2="${yCenter}" stroke="black"/>`
	svg += `<line x1="${q3Pos}" y1="${yCenter}" x2="${maxPos}" y2="${yCenter}" stroke="black"/>`

	svg += `<line x1="${minPos}" y1="${yCenter - 10}" x2="${minPos}" y2="${yCenter + 10}" stroke="black"/>`
	svg += `<line x1="${maxPos}" y1="${yCenter - 10}" x2="${maxPos}" y2="${yCenter + 10}" stroke="black"/>`

	svg += `<rect x="${q1Pos}" y="${yCenter - plotHeight / 2}" width="${q3Pos - q1Pos}" height="${plotHeight}" fill="${boxColor}" stroke="black"/>`

	svg += `<line x1="${medianPos}" y1="${yCenter - plotHeight / 2}" x2="${medianPos}" y2="${yCenter + plotHeight / 2}" stroke="${medianColor}" stroke-width="2"/>`

	svg += "</svg>"
	return svg
}
