import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data for a single category's count (e.g., yearly elk count)
const PopulationBarDataPointSchema = z
	.object({
		label: z
			.string()
			.min(1, "bar label cannot be empty")
			.describe(
				"The category label displayed as x-axis tick label for this bar (e.g., '1990', '1995', '2000'). Must be meaningful text."
			),
		value: z.number().min(0).describe("The non-negative value represented by the bar.")
	})
	.strict()

// Defines the Y-axis configuration
const YAxisOptionsSchema = z
	.object({
		label: z.string().describe("The title for the vertical axis (e.g., 'Number of elk')."),
		min: z.number().describe("The minimum value shown on the y-axis."),
		max: z.number().describe("The maximum value shown on the y-axis."),
		tickInterval: z.number().positive().describe("The spacing between tick marks and grid lines on the y-axis.")
	})
	.strict()

// The main Zod schema for the populationBarChart function
export const PopulationBarChartPropsSchema = z
	.object({
		type: z
			.literal("populationBarChart")
			.describe("Identifies this as a bar chart styled like the elk population example."),
		width: z
			.number()
			.positive()
			.describe("Total width of the chart in pixels including margins and labels (e.g., 600)."),
		height: z
			.number()
			.positive()
			.describe("Total height of the chart in pixels including title and axis labels (e.g., 400)."),
		xAxisLabel: z.string().describe("The label for the horizontal axis (e.g., 'Year')."),
		yAxis: YAxisOptionsSchema.describe("Configuration for the vertical axis including scale and labels."),
		xAxisVisibleLabels: z
			.array(z.string().min(1, "visible label cannot be empty"))
			.describe(
				"Optional subset of x-axis labels to display when spacing is limited. Each string must be a meaningful label from the data array (e.g., ['1990', '1995', '2000']). If empty, automatic text-width-aware spacing applies."
			),
		data: z
			.array(PopulationBarDataPointSchema)
			.describe(
				"Complete array of ALL data points to display. Each point must have a meaningful label for x-axis tick labeling. Order determines left-to-right positioning."
			),
		barColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("CSS color for the bars (e.g., '#208388')."),
		gridColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("CSS color for the horizontal grid lines (e.g., '#cccccc').")
	})
	.strict()
	.describe(
		"Creates a vertical bar chart specifically styled to match the provided elk population graph. Features include solid horizontal grid lines, bold axis labels, and specific tick mark styling."
	)

export type PopulationBarChartProps = z.infer<typeof PopulationBarChartPropsSchema>

/**
 * Generates a vertical bar chart styled to replicate the provided elk population graph.
 */
export const generatePopulationBarChart: WidgetGenerator<typeof PopulationBarChartPropsSchema> = (data) => {
	const { width, height, xAxisLabel, yAxis, data: chartData, barColor, gridColor, xAxisVisibleLabels } = data

	if (chartData.length === 0) {
		logger.error("invalid data for population bar chart", { dataLength: chartData.length })
		throw errors.wrap(ErrInvalidDimensions, "chart data must not be empty")
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		null, // No title for this widget
		{
			xScaleType: "categoryBand", // Set the scale type
			label: xAxisLabel,
			categories: chartData.map((d) => abbreviateMonth(d.label)), // This is now type-checked
			showGridLines: false,
			showTickLabels: true
		},
		{
			label: yAxis.label,
			min: yAxis.min,
			max: yAxis.max,
			tickInterval: yAxis.tickInterval,
			showGridLines: true,
			showTickLabels: true
		}
	)

	// Override grid lines with custom color
	let customAxisContent = ""
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		if (t === 0) continue
		const y = base.toSvgY(t)
		customAxisContent += `<line x1="${base.chartArea.left}" y1="${y}" x2="${base.chartArea.left + base.chartArea.width}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`
	}

	// Bar rendering
	let bars = ""
	let bandWidth = base.bandWidth
	if (bandWidth === undefined) {
		logger.error("bandWidth missing for categorical x-axis in population bar chart", { length: chartData.length })
		throw errors.wrap(ErrInvalidDimensions, "categorical x-axis requires defined bandWidth")
	}
	const barPadding = 0.3
	const innerBarWidth = bandWidth * (1 - barPadding)

	// Handle visible labels logic
	const visibleLabelSet = new Set<string>(xAxisVisibleLabels)
	const useAutoThinning = xAxisVisibleLabels.length === 0

	chartData.forEach((d, i) => {
		const xCenter = base.toSvgX(i)
		const barX = xCenter - innerBarWidth / 2
		const barHeight = (d.value - yAxis.min) / (yAxis.max - yAxis.min) * base.chartArea.height
		const y = base.chartArea.top + base.chartArea.height - barHeight

		includePointX(base.ext, barX)
		includePointX(base.ext, barX + innerBarWidth)

		bars += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="${barColor}"/>`
	})

	let svgBody = base.svgBody
	svgBody += customAxisContent
	svgBody += wrapInClippedGroup(base.clipId, bars)

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
