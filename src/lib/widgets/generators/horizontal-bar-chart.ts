import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, includeText, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

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

	if (chartData.length === 0) {
		logger.error("invalid data for horizontal bar chart", { dataLength: chartData.length })
		throw errors.wrap(ErrInvalidDimensions, "chart data must not be empty")
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		null, // No title for this widget
		{
			label: xAxis.label,
			min: xAxis.min,
			max: xAxis.max,
			tickInterval: xAxis.tickInterval,
			showGridLines: true,
			showTickLabels: true
		},
		{
			label: "", // No Y-axis label for horizontal bar charts
			categories: chartData.map((d) => abbreviateMonth(d.category)),
			showGridLines: false,
			showTickLabels: true,
			tickInterval: 1,
			min: 0,
			max: chartData.length
		}
	)

	// Override grid lines with custom color
	let customAxisContent = ""
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		if (t === 0) continue
		const x = base.toSvgX(t)
		customAxisContent += `<line x1="${x}" y1="${base.chartArea.top}" x2="${x}" y2="${base.chartArea.top + base.chartArea.height}" stroke="${gridColor}" stroke-width="1"/>`
	}

	// Bar rendering
	let bars = ""
	let bandWidth = base.bandWidth
	if (bandWidth === undefined) {
		logger.error("bandWidth missing for categorical y-axis in horizontal bar chart", { length: chartData.length })
		throw errors.wrap(ErrInvalidDimensions, "categorical y-axis requires defined bandWidth")
	}
	const barPadding = 0.4
	const innerBarHeight = bandWidth * (1 - barPadding)

	// For horizontal bars, Y-axis is categorical, so we need manual Y positioning
	const barHeight = base.chartArea.height / chartData.length

	chartData.forEach((d, i) => {
		const yCenter = base.chartArea.top + (i + 0.5) * barHeight
		const barY = yCenter - innerBarHeight / 2
		const barWidth = ((d.value - xAxis.min) / (xAxis.max - xAxis.min)) * base.chartArea.width
		const barX = base.chartArea.left

		includePointX(base.ext, barX)
		includePointX(base.ext, barX + barWidth)

		bars += `<rect x="${barX}" y="${barY}" width="${barWidth}" height="${innerBarHeight}" fill="${d.color}"/>`

		// Value label
		const valueLabelX = barX + barWidth + 5
		bars += `<text x="${valueLabelX}" y="${yCenter}" class="value-label" text-anchor="start" dominant-baseline="middle">${abbreviateMonth(d.label)}</text>`
		includeText(base.ext, valueLabelX, abbreviateMonth(d.label), "start", 7)
	})

	let svgBody = base.svgBody
	svgBody += customAxisContent
	svgBody += wrapInClippedGroup(base.clipId, bars)

	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, height, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.serif}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
