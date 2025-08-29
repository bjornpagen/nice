import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or data")

// Defines the data and state for a single bar in the chart
const BarDataSchema = z
	.object({
		label: z
			.string()
			.describe(
				"The category name displayed below this bar on the x-axis (e.g., 'January', 'Apples'). Use empty string \"\" to hide label."
			),
		value: z.number().describe("The numerical value determining the bar's height. Can be positive or negative."),
		state: z
			.enum(["normal", "unknown"])
			.describe(
				"Visual state of the bar. 'normal' shows a solid bar with the actual value. 'unknown' shows a patterned bar."
			)
	})
	.strict()

// Define Y-axis schema separately
const YAxisSchema = z
	.object({
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The title for the vertical axis (e.g., 'Sales ($)', 'Count', null). Null shows no label."),
		min: z.number().describe("The minimum value shown on the y-axis. Must be less than max."),
		max: z.number().describe("The maximum value shown on the y-axis. Must be greater than min."),
		tickInterval: z.number().describe("The spacing between tick marks on the y-axis. Should evenly divide (max - min).")
	})
	.strict()

// The main Zod schema for the barChart function
export const BarChartPropsSchema = z
	.object({
		type: z
			.literal("barChart")
			.describe("Identifies this as a bar chart widget for comparing categorical data with vertical bars."),
		width: z
			.number()
			.positive()
			.describe("Total width of the chart in pixels including margins and labels (e.g., 500)."),
		height: z
			.number()
			.positive()
			.describe("Total height of the chart in pixels including title and axis labels (e.g., 350)."),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"The main title displayed above the chart (e.g., 'Monthly Sales', 'Student Scores', null). Null means no title."
			),
		xAxisLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"The label for the horizontal axis (e.g., 'Months', 'Products', null). Null if categories are self-explanatory."
			),
		yAxis: YAxisSchema.describe("Configuration for the vertical axis including scale, labels, and tick marks."),
		data: z
			.array(BarDataSchema)
			.describe(
				"Array of bars to display. Each bar represents one category. Order determines left-to-right positioning."
			),
		barColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("Hex-only color for normal bars (e.g., '#4472C4', '#1E90FF', '#00000080' for 50% alpha).")
	})
	.strict()
	.describe(
		"Creates a vertical bar chart for comparing values across categories. Supports both known values and 'unknown' placeholders."
	)

export type BarChartProps = z.infer<typeof BarChartPropsSchema>

/**
 * This template generates a standard vertical bar chart as an SVG graphic.
 * Bar charts are used to compare numerical values across a set of discrete categories.
 * Supports rendering bars in an "unknown" state for missing value problems.
 */
export const generateBarChart: WidgetGenerator<typeof BarChartPropsSchema> = (data) => {
	const { width, height, title, xAxisLabel, yAxis, data: chartData, barColor } = data

	let finalXAxisLabel = ""
	if (xAxisLabel) {
		finalXAxisLabel = xAxisLabel
	}

	let finalYAxisLabel = ""
	if (yAxis.label) {
		finalYAxisLabel = yAxis.label
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		title,
		{
			label: finalXAxisLabel,
			categories: chartData.map((d) => abbreviateMonth(d.label)),
			showTickLabels: true,
			showGridLines: false,
			tickInterval: 1,
			min: 0,
			max: chartData.length
		},
		{
			...yAxis,
			label: finalYAxisLabel,
			showTickLabels: true,
			showGridLines: true
		}
	)

	let bars = ""
	let bandWidth = base.bandWidth
	if (bandWidth === undefined) {
		logger.error("bandWidth missing for categorical x-axis in bar chart", { length: chartData.length })
		throw errors.wrap(ErrInvalidDimensions, "categorical x-axis requires defined bandWidth")
	}
	const barPadding = 0.2
	const innerBarWidth = bandWidth * (1 - barPadding)

	chartData.forEach((d, i) => {
		const xCenter = base.toSvgX(i)
		const barX = xCenter - innerBarWidth / 2
		const barHeight = (d.value - yAxis.min) / (yAxis.max - yAxis.min) * base.chartArea.height
		const y = base.chartArea.top + base.chartArea.height - barHeight
		includePointX(base.ext, barX)
		includePointX(base.ext, barX + innerBarWidth)
		if (d.state === "normal") {
			bars += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="${barColor}"/>`
		} else {
			bars += `<rect x="${barX}" y="${y}" width="${innerBarWidth}" height="${barHeight}" fill="none" stroke="${barColor}" stroke-width="${theme.stroke.width.thick}" stroke-dasharray="${theme.stroke.dasharray.dashed}"/>`
		}
	})

	let svgBody = base.svgBody
	svgBody += wrapInClippedGroup(base.clipId, bars)

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">` + svgBody + `</svg>`
	return finalSvg
}
