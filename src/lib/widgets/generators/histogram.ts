import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

const Bin = z
	.object({
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"The range or category label for this bin (e.g., '0-10', '10-20', 'Small', 'Grade A', null). Displayed on x-axis below the bar. Null shows no label."
			),
		frequency: z
			.number()
			.int()
			.min(0)
			.describe(
				"The count/frequency for this bin. Determines bar height. Must be non-negative integer (e.g., 5, 12, 0, 23)."
			)
	})
	.strict()

export const HistogramPropsSchema = z
	.object({
		type: z
			.literal("histogram")
			.describe("Identifies this as a histogram widget for displaying frequency distributions."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the histogram in pixels including margins (e.g., 500, 600, 400). Wider charts prevent label overlap."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the histogram in pixels including title and labels (e.g., 400, 350, 500). Taller charts show frequencies more clearly."
			),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Title displayed above the histogram (e.g., 'Test Score Distribution', 'Age Groups', null). Null means no title. Plaintext only; no markdown or HTML."
			),
		xAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe(
						"Title for the horizontal axis describing the variable being binned (e.g., 'Score Range', 'Age (years)', 'Size Category', null). Null shows no label. Plaintext only; no markdown or HTML."
					)
			})
			.strict()
			.describe("Configuration for the x-axis showing bin categories."),
		yAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe(
						"Title for the vertical axis, typically 'Frequency' or 'Count' (e.g., 'Number of Students', 'Frequency', 'Count', null). Null shows no label. Plaintext only; no markdown or HTML."
					),
				max: z
					.number()
					.int()
					.positive()
					.describe(
						"Maximum value shown on y-axis. Should exceed highest frequency for clarity (e.g., 30, 50, 100). Must be positive integer."
					),
				tickInterval: z
					.number()
					.positive()
					.describe(
						"Spacing between y-axis tick marks (e.g., 5, 10, 2). Should evenly divide max for clean appearance."
					)
			})
			.strict()
			.describe("Configuration for the y-axis showing frequencies."),
		bins: z
			.array(Bin)
			.describe(
				"Array of bins with their frequencies. Order determines left-to-right display. Adjacent bars touch (no gaps) in a histogram. Can be empty for blank chart."
			)
	})
	.strict()
	.describe(
		"Creates a histogram showing frequency distribution of data across bins/intervals. Unlike bar charts, histogram bars touch each other to show continuous data ranges. Essential for statistics education, showing data distributions, and identifying patterns like normal distributions or skewness."
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

	const maxFreq = yAxis.max
	const scaleY = chartHeight / maxFreq
	const binWidth = chartWidth / bins.length

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; font-weight: bold; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title !== null) svg += `<text x="${width / 2}" y="${margin.top / 2}" class="title">${title}</text>`

	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#333333"/>` // Y-axis
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#333333"/>` // X-axis

	// Axis Labels
	if (xAxis.label !== null) {
		svg += `<text x="${margin.left + chartWidth / 2}" y="${height - 20}" class="axis-label">${xAxis.label}</text>`
	}
	if (yAxis.label !== null) {
		svg += `<text x="${margin.left - 35}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 35}, ${margin.top + chartHeight / 2})">${yAxis.label}</text>`
	}

	// Y ticks and labels
	const yTickInterval = yAxis.tickInterval
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
		if (i < bins.length && b.label) {
			svg += `<text x="${x + binWidth}" y="${height - margin.bottom + 15}" fill="#333333" text-anchor="middle">${b.label.split("-")[1] ?? b.label}</text>`
		}
	})
	// Add first label for the start of the axis
	const firstBinLabel = bins[0]?.label
	if (firstBinLabel) {
		const firstLabel = firstBinLabel.split("-")[0]
		if (firstLabel) {
			svg += `<text x="${margin.left}" y="${height - margin.bottom + 15}" fill="#333333" text-anchor="middle">${firstLabel}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
