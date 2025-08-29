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
import { theme } from "@/lib/widgets/utils/theme"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data for a single bar in the chart
const DataPointSchema = z
	.object({
		category: z
			.string()
			.min(1, "category label cannot be empty")
			.describe(
				"The category name displayed as x-axis tick label (e.g., '1st Century', '5th Century', '10th Century'). Each bar position must have a meaningful label."
			),
		value: z
			.number()
			.describe("The numerical value. Positive values are drawn above the zero line, negative values below.")
	})
	.strict()

// The main Zod schema for the divergentBarChart function
export const DivergentBarChartPropsSchema = z
	.object({
		type: z.literal("divergentBarChart"),
		width: z.number().positive().describe("Total width of the chart in pixels (e.g., 600)."),
		height: z.number().positive().describe("Total height of the chart in pixels (e.g., 400)."),
		xAxisLabel: z.string().describe("The label for the horizontal axis (e.g., 'Century')."),
		yAxis: z
			.object({
				label: z.string().describe("The title for the vertical axis (e.g., 'Change in sea level (cm)')."),
				min: z.number().describe("The minimum value on the y-axis (can be negative)."),
				max: z.number().describe("The maximum value on the y-axis."),
				tickInterval: z.number().positive().describe("The spacing between tick marks on the y-axis.")
			})
			.strict()
			.describe("Configuration for the vertical axis."),
		data: z
			.array(DataPointSchema)
			.describe(
				"Complete array of ALL data points to display as bars. Each bar must have a meaningful category label for proper x-axis tick labeling."
			),
		positiveBarColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for bars with positive values."),
		negativeBarColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for bars with negative values."),
		gridColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("CSS color for the horizontal grid lines.")
	})
	.strict()
	.describe(
		"Creates a divergent bar chart where bars can be positive or negative, extending from a central zero line. Styled to match the sea level change example."
	)

export type DivergentBarChartProps = z.infer<typeof DivergentBarChartPropsSchema>

/**
 * Generates a divergent bar chart styled to replicate the provided sea level change graph.
 */
export const generateDivergentBarChart: WidgetGenerator<typeof DivergentBarChartPropsSchema> = (data) => {
	const { width, height, xAxisLabel, yAxis, data: chartData, positiveBarColor, negativeBarColor, gridColor } = data

	// Calculate vertical margins first to determine chartHeight
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	const marginWithoutLeft = { top: PADDING, right: PADDING, bottom: bottomMargin }
	
	// Calculate chartHeight based on vertical margins
	const chartHeight = height - marginWithoutLeft.top - marginWithoutLeft.bottom
	
	if (chartHeight <= 0 || chartData.length === 0 || yAxis.min >= yAxis.max) {
		logger.error("invalid chart dimensions or data for divergent bar chart", {
			chartHeight,
			dataLength: chartData.length,
			yAxis
		})
		throw errors.wrap(
			ErrInvalidDimensions,
			"chart dimensions must be positive, data must not be empty, and y-axis min must be less than max."
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
		logger.error("invalid chart width for divergent bar chart", { chartWidth })
		throw errors.wrap(ErrInvalidDimensions, "chart width must be positive.")
	}

	const yRange = yAxis.max - yAxis.min
	const scaleY = chartHeight / yRange
	const barWidth = chartWidth / chartData.length
	const barPadding = 0.4

	// yZero is derivable from yAxis and scale; not needed directly

	const ext = initExtents(width)
	let svgBody = "<style>.axis-label { font-size: 1.1em; font-weight: bold; text-anchor: middle; } .tick-label { font-size: 1em; font-weight: bold; } </style>"

	const chartBody = `<g transform="translate(${margin.left},${margin.top})">`
	svgBody += chartBody

	// Y-axis line with ticks and labels
	svgBody += `<line x1="0" y1="0" x2="0" y2="${chartHeight}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}"/>`
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = chartHeight - (t - yAxis.min) * scaleY
		// Grid line
		svgBody += `<line x1="0" y1="${y}" x2="${chartWidth}" y2="${y}" stroke="${gridColor}" stroke-width="${theme.stroke.width.thin}"/>`
		// Tick label
		svgBody += `<text x="-10" y="${y + 5}" class="tick-label" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, String(t), "end", 7) // MODIFICATION: Add this line
	}

	// Prominent Zero Line
	const yZeroInChartCoords = chartHeight - (0 - yAxis.min) * scaleY
	svgBody += `<line x1="0" y1="${yZeroInChartCoords}" x2="${chartWidth}" y2="${yZeroInChartCoords}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}"/>`

	// X-axis label (using group-relative coordinates)
	svgBody += `<text x="${chartWidth / 2}" y="${chartHeight + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxisLabel)}</text>`

	// Close group before rendering y-axis label
	svgBody += "</g>"

	// Y-axis label with wrapping
	const globalYAxisLabelX = yAxisLabelX
	const globalYAxisLabelY = margin.top + chartHeight / 2
	svgBody += renderRotatedWrappedYAxisLabel(abbreviateMonth(yAxis.label), globalYAxisLabelX, globalYAxisLabelY, chartHeight)
	includeRotatedYAxisLabel(ext, globalYAxisLabelX, abbreviateMonth(yAxis.label), chartHeight)

	// X-axis label (global coordinates)
	const globalXAxisLabelX = margin.left + chartWidth / 2
	const _globalXAxisLabelY = height - margin.bottom + xAxisTitleY
	includeText(ext, globalXAxisLabelX, abbreviateMonth(xAxisLabel), "middle", 7)

	// Reopen group for remaining chart elements
	svgBody += `<g transform="translate(${margin.left},${margin.top})">`

	// Text-width-aware label selection for visual uniformity
	const barLabels = chartData.map((d) => abbreviateMonth(d.category))
	const barPositions = chartData.map((_, i) => i * barWidth + barWidth / 2)
	const selectedLabelIndices = calculateTextAwareLabelSelection(barLabels, barPositions, chartWidth)

	chartData.forEach((d, i) => {
		const barAbsHeight = Math.abs(d.value) * scaleY
		const x = i * barWidth
		const innerBarWidth = barWidth * (1 - barPadding)
		const xOffset = (barWidth - innerBarWidth) / 2
		const barX = x + xOffset

		// Track the horizontal extent of the bar
		includePointX(ext, margin.left + barX)
		includePointX(ext, margin.left + barX + innerBarWidth)

		let y: number
		let color: string

		if (d.value >= 0) {
			y = yZeroInChartCoords - barAbsHeight
			color = positiveBarColor
		} else {
			y = yZeroInChartCoords
			color = negativeBarColor
		}

		svgBody += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barAbsHeight}" fill="${color}"/>`

		const labelX = x + barWidth / 2
		if (selectedLabelIndices.has(i)) {
			svgBody += `<text x="${labelX}" y="${chartHeight + 25}" class="tick-label" text-anchor="middle">${abbreviateMonth(d.category)}</text>`
			includeText(ext, margin.left + labelX, abbreviateMonth(d.category), "middle", 7)
		}
	})

	// Add right-side border for the chart area
	svgBody += `<line x1="${chartWidth}" y1="0" x2="${chartWidth}" y2="${chartHeight}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}"/>`

	svgBody += "</g>" // Close final group
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
