import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

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

	if (bins.length === 0) {
		logger.error("histogram empty bins", { count: bins.length })
		throw errors.new("histogram: bins must not be empty")
	}

	// Calculate tick interval from separators
	const deltas: number[] = []
	for (let i = 1; i < separators.length; i++) {
		const curr = separators[i]
		const prev = separators[i - 1]
		if (curr === undefined || prev === undefined) {
			logger.error("histogram separators index out of range", { index: i })
			throw errors.new("histogram: separators index out of range")
		}
		const d = curr - prev
		deltas.push(d)
	}
	const first = deltas[0] ?? 1
	const nonUniform = deltas.some((d) => Math.abs(d - first) > 1e-9)
	let tickInterval = first
	if (nonUniform) {
		// Use the smallest interval for non-uniform bins
		tickInterval = Math.min(...deltas)
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		title,
		{
			label: xAxis.label,
			min: separators[0] ?? 0,
			max: separators[separators.length - 1] ?? 1,
			tickInterval,
			showGridLines: false,
			showTickLabels: true
		},
		{
			label: yAxis.label,
			min: 0,
			max: yAxis.max,
			tickInterval: yAxis.tickInterval,
			showGridLines: false,
			showTickLabels: true
		}
	)

	// Histogram bars
	let bars = ""
	const binWidth = base.chartArea.width / bins.length

	bins.forEach((b, i) => {
		const barHeight = (b.frequency / yAxis.max) * base.chartArea.height
		const x = base.chartArea.left + i * binWidth
		const y = base.chartArea.top + base.chartArea.height - barHeight

		includePointX(base.ext, x)
		includePointX(base.ext, x + binWidth)

		bars += `<rect x="${x}" y="${y}" width="${binWidth}" height="${barHeight}" fill="${theme.colors.highlightPrimary}" stroke="${theme.colors.axis}"/>`
	})

	let svgBody = base.svgBody
	svgBody += wrapInClippedGroup(base.clipId, bars)

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
