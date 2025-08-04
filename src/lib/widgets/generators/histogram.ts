import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single bar (bin) in the histogram
const HistogramBinSchema = z.object({
	label: z.string().describe('The label for the bin, displayed on the X-axis (e.g., "0-10", "10-20").'),
	frequency: z.number().int().min(0).describe("The count of data points in this bin, which determines the bar height.")
})

// Defines the properties of an axis
const HistogramAxisSchema = z.object({
	label: z.string().describe('The text title for the axis (e.g., "Number of Guests" or "Frequency").'),
	max: z
		.number()
		.int()
		.optional()
		.describe("An optional maximum value for the Y-axis scale. If not provided, it will be calculated automatically."),
	tickInterval: z.number().optional().describe("An optional numeric interval for tick marks on the Y-axis.")
})

// The main Zod schema for the histogram function
export const HistogramPropsSchema = z
	.object({
		width: z.number().optional().default(400).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(300).describe("The total height of the output SVG container in pixels."),
		title: z.string().optional().describe("An optional title displayed above the histogram."),
		xAxis: HistogramAxisSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: HistogramAxisSchema.describe("Configuration for the vertical (Y) axis."),
		bins: z.array(HistogramBinSchema).describe("An array of bin objects, each defining its label and frequency.")
	})
	.describe(
		'This template generates a standards-compliant histogram as an SVG graphic inside a <div>. A histogram is a bar chart that displays the frequency distribution of numerical data by grouping it into a series of consecutive, non-overlapping intervals (or "bins"). The generator constructs a complete Cartesian coordinate system with a horizontal X-axis and a vertical Y-axis. The X-axis represents the data intervals (e.g., "0-10", "10-20") and is labeled accordingly. The Y-axis represents the frequency (count) of data points within each interval and will have labeled tick marks to indicate the scale. Both axes can have titles (e.g., "Number of Guests", "Frequency"). For each specified bin, a rectangular bar is rendered. The width of the bar corresponds to the interval range, and the bars are drawn adjacent to one another to show the continuous nature of the data. The height of each bar is proportional to the frequency of data points falling into that bin. The final output is a clean and accurate visualization, essential for questions about the shape, center, and spread of continuous data.'
	)

export type HistogramProps = z.infer<typeof HistogramPropsSchema>

/**
 * Generates a standard histogram as an SVG graphic.
 * Histograms are used to visualize the distribution of continuous numerical data by dividing it into intervals (bins).
 * Unlike bar charts, histogram bars are adjacent to each other.
 */
export const generateHistogram: WidgetGenerator<typeof HistogramPropsSchema> = (data) => {
	const { width, height, title, xAxis, yAxis, bins } = data
	const margin = { top: 40, right: 20, bottom: 70, left: 50 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0 || bins.length === 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	const maxFreq = yAxis.max ?? Math.max(...bins.map((b) => b.frequency))
	const scaleY = chartHeight / maxFreq
	const binWidth = chartWidth / bins.length

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; font-weight: bold; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title) svg += `<text x="${width / 2}" y="${margin.top / 2}" class="title">${title}</text>`

	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#333333"/>` // Y-axis
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#333333"/>` // X-axis

	// Axis Labels
	svg += `<text x="${margin.left + chartWidth / 2}" y="${height - 20}" class="axis-label">${xAxis.label}</text>`
	svg += `<text x="${margin.left - 35}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 35}, ${margin.top + chartHeight / 2})">${yAxis.label}</text>`

	// Y ticks and labels
	const yTickInterval = yAxis.tickInterval || Math.ceil(maxFreq / 5)
	for (let t = 0; t <= maxFreq; t += yTickInterval) {
		const y = height - margin.bottom - t * scaleY
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#333333"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 4}" fill="#333333" text-anchor="end">${t}</text>`
	}

	// Bins and X-axis labels
	bins.forEach((b, i) => {
		const barHeight = b.frequency * scaleY
		const x = margin.left + i * binWidth
		const y = height - margin.bottom - barHeight
		svg += `<rect x="${x}" y="${y}" width="${binWidth}" height="${barHeight}" fill="#6495ED" stroke="#333333"/>`
		// Label bins at the tick marks between them
		if (i < bins.length) {
			svg += `<text x="${x + binWidth}" y="${height - margin.bottom + 15}" fill="#333333" text-anchor="middle">${b.label.split("-")[1] ?? b.label}</text>`
		}
	})
	// Add first label for the start of the axis
	const firstLabel = bins[0]?.label.split("-")[0]
	if (firstLabel) {
		svg += `<text x="${margin.left}" y="${height - margin.bottom + 15}" fill="#333333" text-anchor="middle">${firstLabel}</text>`
	}

	svg += "</svg>"
	return svg
}
