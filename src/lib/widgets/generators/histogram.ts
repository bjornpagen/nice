import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import {
	calculateTextAwareLabelSelection,
	calculateTitleLayout,
	calculateXAxisLayout,
	calculateYAxisLayoutAxisAware,
	computeDynamicWidth,
	includePointX,
	includeRotatedYAxisLabel,
	includeText,
	initExtents
} from "@/lib/widgets/utils/layout"
import { renderRotatedWrappedYAxisLabel, renderWrappedText } from "@/lib/widgets/utils/text"

const Bin = z
	.object({
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
		title: z.string().describe("Title displayed above the histogram (e.g., 'Test Score Distribution', 'Age Groups')."),
		xAxis: z
			.object({
				label: z
					.string()
					.describe(
						"Title for the horizontal axis describing the variable being binned (e.g., 'Score Range', 'Age (years)', 'Size Category')."
					)
			})
			.strict()
			.describe("Configuration for the x-axis showing bin categories."),
		yAxis: z
			.object({
				label: z
					.string()
					.describe(
						"Title for the vertical axis, typically 'Frequency' or 'Count' (e.g., 'Number of Students', 'Frequency', 'Count')."
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
		// The numeric separators marking the boundaries between bars. If there are N bars, there must be N+1 separators.
		separators: z
			.array(z.number())
			.min(2)
			.describe(
				"Complete array of ALL numeric boundary markers for x-axis tick labels. Bars are drawn between consecutive separators. Each separator value becomes a tick label (e.g., [0, 5, 10, 15, 20]). Must be strictly increasing sequence."
			),
		bins: z
			.array(Bin)
			.describe(
				"Array of bins with their frequencies. Order determines left-to-right display. Adjacent bars touch (no gaps) in a histogram."
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
	const { width, height, title, xAxis, yAxis, bins, separators } = data

	// Runtime validation (no refine allowed in schema for structured outputs)
	if (separators.length !== bins.length + 1) {
		logger.error("histogram invalid separators length", { count: separators.length, bins: bins.length })
		throw errors.new("histogram: separators length must equal bins length + 1")
	}
	for (let i = 1; i < separators.length; i++) {
		const current = separators[i]
		const prev = separators[i - 1]
		if (current === undefined || prev === undefined) {
			logger.error("histogram separators index out of range", { index: i })
			throw errors.new("histogram: separators index out of range")
		}
		if (!(current > prev)) {
			logger.error("histogram separators not strictly increasing", { index: i, prev, current })
			throw errors.new("histogram: separators must be strictly increasing")
		}
	}
	// Create a mock yAxis with min for the layout calculation (histogram y-axis always starts at 0)
	const mockYAxis = { ...yAxis, min: 0 }
	
	// Calculate vertical margins first to determine chartHeight
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	const { titleY, topMargin } = calculateTitleLayout(title, width - 60)
	const marginWithoutLeft = { top: topMargin, right: 20, bottom: bottomMargin }
	
	// Calculate chartHeight based on vertical margins
	const chartHeight = height - marginWithoutLeft.top - marginWithoutLeft.bottom
	
	if (chartHeight <= 0 || bins.length === 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}
	
	// Now calculate Y-axis layout using the determined chartHeight
	const { leftMargin, yAxisLabelX } = calculateYAxisLayoutAxisAware(
		mockYAxis,
		{ min: separators[0] ?? 0, max: separators[separators.length - 1] ?? 1 },
		width,
		chartHeight,
		marginWithoutLeft,
		{ axisPlacement: "leftEdge", axisTitleFontPx: 16 }
	)
	const margin = { ...marginWithoutLeft, left: leftMargin }
	
	// Calculate chartWidth with the final left margin
	const chartWidth = width - margin.left - margin.right
	if (chartWidth <= 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	const maxFreq = yAxis.max
	const scaleY = chartHeight / maxFreq
	const binWidth = chartWidth / bins.length
	const _averageCharWidthPx = 7

	const ext = initExtents(width)
	let svgBody = "<style>.axis-label { font-size: 14px; font-weight: bold; text-anchor: middle; } .title { font-size: 16px; font-weight: bold; text-anchor: middle; } .x-tick { font-size: 11px; }</style>"

	const maxTextWidth = width - 60
	svgBody += renderWrappedText(abbreviateMonth(title), width / 2, titleY, "title", "1.1em", maxTextWidth, 8)
	includeText(ext, width / 2, abbreviateMonth(title), "middle", 7)

	svgBody += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#333333"/>` // Y-axis
	svgBody += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#333333"/>` // X-axis

	// Axis Labels
	svgBody += `<text x="${margin.left + chartWidth / 2}" y="${height - margin.bottom + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxis.label)}</text>`
	includeText(ext, margin.left + chartWidth / 2, abbreviateMonth(xAxis.label), "middle", 7)
	svgBody += renderRotatedWrappedYAxisLabel(
		abbreviateMonth(yAxis.label),
		yAxisLabelX,
		margin.top + chartHeight / 2,
		chartHeight
	)
	includeRotatedYAxisLabel(ext, yAxisLabelX, abbreviateMonth(yAxis.label), chartHeight)

	// Y ticks and labels
	const yTickInterval = yAxis.tickInterval
	for (let t = 0; t <= maxFreq; t += yTickInterval) {
		const y = height - margin.bottom - t * scaleY
		svgBody += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="#333333"/>`
		svgBody += `<text x="${margin.left - 10}" y="${y + 4}" fill="#333333" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, String(t), "end", 7) // MODIFICATION: Add this line
	}

	// Bins
	bins.forEach((b, i) => {
		const barHeight = b.frequency * scaleY
		const x = margin.left + i * binWidth
		const y = height - margin.bottom - barHeight
		
		// Track the horizontal extent of the bar
		includePointX(ext, x)
		includePointX(ext, x + binWidth)
		
		svgBody += `<rect x="${x}" y="${y}" width="${binWidth}" height="${barHeight}" fill="#6495ED" stroke="#333333"/>`
	})

	// Compute boundary tick labels from numeric separators
	// X-axis ticks with text-width-aware label selection
	const tickPositions = separators.map((_, i) => margin.left + i * binWidth)
	const tickLabels = separators.map((sep) => String(sep))
	const selected = calculateTextAwareLabelSelection(tickLabels, tickPositions, chartWidth)

	// Render non-rotated x-axis labels centered at separators
	separators.forEach((sep, i) => {
		if (!selected.has(i)) return
		const labelX = margin.left + i * binWidth
		const labelY = height - margin.bottom + 28
		svgBody += `<text class="x-tick" x="${labelX}" y="${labelY}" fill="#333333" text-anchor="middle">${sep}</text>`
		// Track the x-axis tick label
		includeText(ext, labelX, String(sep), "middle", 6)
	})

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
