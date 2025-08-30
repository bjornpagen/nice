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

	if (chartData.length === 0 || yAxis.min >= yAxis.max) {
		logger.error("invalid data for divergent bar chart", { dataLength: chartData.length, yAxis })
		throw errors.wrap(ErrInvalidDimensions, "chart data must not be empty and y-axis min must be less than max")
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		null, // No title for this widget
		{
			xScaleType: "categoryBand", // Set the scale type
			label: xAxisLabel,
			categories: chartData.map((d) => abbreviateMonth(d.category)), // This is now type-checked
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
		const y = base.toSvgY(t)
		customAxisContent += `<line x1="${base.chartArea.left}" y1="${y}" x2="${base.chartArea.left + base.chartArea.width}" y2="${y}" stroke="${gridColor}" stroke-width="1"/>`
	}

	// Prominent zero line
	const yZero = base.toSvgY(0)
	customAxisContent += `<line x1="${base.chartArea.left}" y1="${yZero}" x2="${base.chartArea.left + base.chartArea.width}" y2="${yZero}" stroke="${theme.colors.axis}" stroke-width="2"/>`

	// Bar rendering
	let bars = ""
	let bandWidth = base.bandWidth
	if (bandWidth === undefined) {
		logger.error("bandWidth missing for categorical x-axis in divergent bar chart", { length: chartData.length })
		throw errors.wrap(ErrInvalidDimensions, "categorical x-axis requires defined bandWidth")
	}
	const barPadding = 0.4
	const innerBarWidth = bandWidth * (1 - barPadding)

	chartData.forEach((d, i) => {
		const xCenter = base.toSvgX(i)
		const barX = xCenter - innerBarWidth / 2
		const barAbsHeight = Math.abs(d.value) / (yAxis.max - yAxis.min) * base.chartArea.height

		includePointX(base.ext, barX)
		includePointX(base.ext, barX + innerBarWidth)

		let y: number
		let color: string

		if (d.value >= 0) {
			y = yZero - barAbsHeight
			color = positiveBarColor
		} else {
			y = yZero
			color = negativeBarColor
		}

		bars += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barAbsHeight}" fill="${color}"/>`
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
