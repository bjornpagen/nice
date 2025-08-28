import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import {
	calculateTextAwareLabelSelection,
	calculateXAxisLayout,
	calculateYAxisLayoutAxisAware,
	computeDynamicWidth,
	includePointX,
	includeRotatedYAxisLabel,
	includeText,
	initExtents
} from "@/lib/widgets/utils/layout"
import { renderRotatedWrappedYAxisLabel } from "@/lib/widgets/utils/text"

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

	// Calculate vertical margins first to determine chartHeight
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	const marginWithoutLeft = { top: PADDING, right: PADDING, bottom: bottomMargin }
	
	// Calculate chartHeight based on vertical margins
	const chartHeight = height - marginWithoutLeft.top - marginWithoutLeft.bottom
	
	if (chartHeight <= 0 || chartData.length === 0) {
		logger.error("invalid chart dimensions or data for population bar chart", {
			chartHeight,
			dataLength: chartData.length
		})
		throw errors.wrap(
			ErrInvalidDimensions,
			`chart height must be positive and data must not be empty. height: ${chartHeight}, data length: ${chartData.length}`
		)
	}
	
	// Now calculate Y-axis layout using the determined chartHeight
	const { leftMargin, yAxisLabelX } = calculateYAxisLayoutAxisAware(
		yAxis,
		{ min: 0, max: chartData.length - 1 }, // Categorical axis
		width,
		chartHeight,
		marginWithoutLeft,
		{ axisPlacement: "leftEdge", axisTitleFontPx: 16 }
	)
	const margin = { ...marginWithoutLeft, left: leftMargin }
	
	// Calculate chartWidth with the final left margin
	const chartWidth = width - margin.left - margin.right
	if (chartWidth <= 0) {
		logger.error("invalid chart width for population bar chart", { chartWidth })
		throw errors.wrap(ErrInvalidDimensions, `chart width must be positive. width: ${chartWidth}`)
	}

	const maxValue = yAxis.max
	const scaleY = chartHeight / (maxValue - yAxis.min)
	const barWidth = chartWidth / chartData.length
	const barPadding = 0.3 // Visually closer to the example image

	const ext = initExtents(width)
	let svgBody = "<style>.axis-label { font-size: 1.1em; font-weight: bold; text-anchor: middle; } .tick-label { font-size: 1em; font-weight: bold; } </style>"

	// Main SVG Body
	const chartBody = `<g transform="translate(${margin.left},${margin.top})">`
	svgBody += chartBody

	// Y-axis line
	svgBody += `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="black" stroke-width="2"/>`
	// X-axis line
	svgBody += `<line x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}" stroke="black" stroke-width="2"/>`

	// Axis Labels (x-axis inside group; y-axis will be rendered in global coordinates later)
	svgBody += `<text x="${chartWidth / 2}" y="${chartHeight + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxisLabel)}</text>`

	// Y ticks and SOLID grid lines
	for (let t = yAxis.min; t <= maxValue; t += yAxis.tickInterval) {
		const y = chartHeight - (t - yAxis.min) * scaleY
		// Grid line
		svgBody += `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`
		// Tick label
		svgBody += `<text x="-10" y="${y + 5}" class="tick-label" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, String(t), "end", 7) // MODIFICATION: Add this line
	}

	// Compute bar centers and text-aware label selection for auto thinning
	const barCenters = chartData.map((_, i) => i * barWidth + barWidth / 2)
	const candidateLabels = chartData.map((d) => abbreviateMonth(d.label))
	const selectedTextAware = calculateTextAwareLabelSelection(candidateLabels, barCenters, chartWidth)
	const visibleLabelSet = new Set<string>(xAxisVisibleLabels)

	chartData.forEach((d, i) => {
		const barHeight = d.value * scaleY
		const x = i * barWidth
		const y = chartHeight - barHeight
		const innerBarWidth = barWidth * (1 - barPadding)
		const xOffset = (barWidth - innerBarWidth) / 2
		const barX = x + xOffset

		// Track the horizontal extent of the bar
		includePointX(ext, margin.left + barX)
		includePointX(ext, margin.left + barX + innerBarWidth)

		// Bar
		svgBody += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="${barColor}"/>`

		const labelX = x + barWidth / 2

		// X-axis tick mark
		svgBody += `<line x1="${labelX}" y1="${chartHeight}" x2="${labelX}" y2="${chartHeight + 5}" stroke="black" stroke-width="1.5"/>`

		// X-axis label (conditionally rendered)
		const useAutoThinning = xAxisVisibleLabels.length === 0
		const labelText = d.label
		const shouldShowLabel = useAutoThinning ? selectedTextAware.has(i) : visibleLabelSet.has(labelText)
		if (shouldShowLabel) {
			svgBody += `<text x="${labelX}" y="${chartHeight + 20}" class="tick-label" text-anchor="middle">${abbreviateMonth(labelText)}</text>`
			// Track the x-axis tick label
			includeText(ext, margin.left + labelX, abbreviateMonth(labelText), "middle", 7)
		}
	})

	svgBody += "</g>" // Close chartBody group

	// Global coordinates for axis labels with proper pivot to avoid clipping
	const globalXAxisLabelX = margin.left + chartWidth / 2
	const _globalXAxisLabelY = height - margin.bottom + xAxisTitleY
	includeText(ext, globalXAxisLabelX, abbreviateMonth(xAxisLabel), "middle", 7)

	const globalYAxisLabelX = yAxisLabelX
	const globalYAxisLabelY = margin.top + chartHeight / 2
	svgBody += renderRotatedWrappedYAxisLabel(abbreviateMonth(yAxis.label), globalYAxisLabelX, globalYAxisLabelY, chartHeight)
	includeRotatedYAxisLabel(ext, globalYAxisLabelX, abbreviateMonth(yAxis.label), chartHeight)

	// Expand viewBox as needed to accommodate labels
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
