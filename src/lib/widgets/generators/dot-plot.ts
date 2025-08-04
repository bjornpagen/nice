import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or axis range")

// Defines a single data category and its frequency for the dot plot
const DotPlotDataPointSchema = z.object({
	value: z.number().describe("The numerical value on the horizontal axis."),
	count: z.number().int().min(1).describe("The number of dots to stack vertically above this value.")
})

// The main Zod schema for the dotPlot function
export const DotPlotPropsSchema = z
	.object({
		width: z.number().optional().default(420).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(200).describe("The total height of the output SVG container in pixels."),
		axis: z
			.object({
				label: z.string().optional().describe('An optional title for the horizontal axis (e.g., "Hourly Wages").'),
				min: z.number().describe("The minimum value displayed on the axis."),
				max: z.number().describe("The maximum value displayed on the axis."),
				tickInterval: z.number().describe("The numeric interval between labeled tick marks.")
			})
			.describe("Configuration for the horizontal number line."),
		data: z
			.array(DotPlotDataPointSchema)
			.describe("An array of data points, where each object specifies a value and how many dots to render for it."),
		dotColor: z.string().optional().default("#4285F4").describe("A CSS color string for the dots."),
		dotRadius: z.number().optional().default(5).describe("The radius of each dot in pixels.")
	})
	.describe(
		'This template is designed to generate a clear, accessible, and standards-compliant dot plot as an SVG graphic within an HTML <div>. Dot plots are used to visualize the distribution of a numerical data set, especially when the data consists of discrete values or has been binned. The generator will construct a horizontal number line that serves as the base axis. This axis will be fully configurable, with a specified minimum and maximum value, major tick marks at defined intervals, and corresponding numerical labels beneath each tick. The axis can also have a descriptive title (e.g., "Number of snow days," "Age in years"). Above the horizontal axis, the data points are represented as small, filled circles (dots). For each value on the number line, the generator will stack dots vertically, with each dot representing a single occurrence of that value in the data set. The vertical spacing between dots will be uniform to ensure clarity. The resulting stacks of dots visually represent the frequency of each value, making it easy to identify the shape of the distribution, including peaks (mode), clusters, gaps, and outliers. The final SVG is a self-contained, accurately scaled visual representation of the raw data.'
	)

export type DotPlotProps = z.infer<typeof DotPlotPropsSchema>

/**
 * Generates a clear, accessible, and standards-compliant dot plot as an SVG graphic.
 * Dot plots are used to visualize the distribution of a numerical data set,
 * especially when the data consists of discrete values or has been binned.
 */
export const generateDotPlot: WidgetGenerator<typeof DotPlotPropsSchema> = (data) => {
	const { width, height, axis, data: plotData, dotColor, dotRadius } = data
	const margin = { top: 20, right: 20, bottom: 60, left: 20 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom
	const axisY = height - margin.bottom

	if (chartWidth <= 0 || chartHeight <= 0 || axis.min >= axis.max) {
		throw errors.wrap(ErrInvalidDimensions, `width: ${width}, height: ${height}, axis range: ${axis.min}-${axis.max}`)
	}

	const scale = chartWidth / (axis.max - axis.min)
	const toSvgX = (val: number) => margin.left + (val - axis.min) * scale

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Axis line
	svg += `<line x1="${margin.left}" y1="${axisY}" x2="${width - margin.right}" y2="${axisY}" stroke="black"/>`

	// Axis label
	if (axis.label) {
		svg += `<text x="${width / 2}" y="${height - 15}" fill="black" text-anchor="middle" font-size="14">${axis.label}</text>`
	}

	// Ticks and tick labels
	for (let t = axis.min; t <= axis.max; t += axis.tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${axisY - 5}" x2="${x}" y2="${axisY + 5}" stroke="black"/>`
		svg += `<text x="${x}" y="${axisY + 20}" fill="black" text-anchor="middle">${t}</text>`
	}

	const dotDiameter = dotRadius * 2
	const dotSpacing = 2 // Vertical space between dots
	const baseOffset = 10 // Additional space between axis and first dot
	for (const dp of plotData) {
		const x = toSvgX(dp.value)
		for (let i = 0; i < dp.count; i++) {
			const y = axisY - dotRadius - baseOffset - i * (dotDiameter + dotSpacing)
			svg += `<circle cx="${x}" cy="${y}" r="${dotRadius}" fill="${dotColor}"/>`
		}
	}

	svg += "</svg>"
	return svg
}
