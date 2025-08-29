import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import {
	calculateTextAwareLabelSelection,
	calculateXAxisLayout,
	computeDynamicWidth,
	includeText,
	includePointX,
	initExtents
} from "@/lib/widgets/utils/layout"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { theme } from "@/lib/widgets/utils/theme"

export const ErrInvalidRange = errors.new("axis min must be less than axis max")

// Defines the configuration for the horizontal axis
const BoxPlotAxisSchema = z
	.object({
		min: z
			.number()
			.describe(
				"Minimum value shown on the horizontal axis. Should be less than or equal to the data minimum (e.g., 0, 10, -5). Sets the leftmost point of the scale."
			),
		max: z
			.number()
			.describe(
				"Maximum value shown on the horizontal axis. Should be greater than or equal to the data maximum (e.g., 100, 50, 200). Sets the rightmost point of the scale."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Title for the horizontal axis describing what is measured (e.g., 'Test Scores', 'Height (cm)', 'Temperature (°F)', 'Age', null). Null if not needed."
			),
		tickLabels: z
			.array(z.number())
			.describe(
				"Specific values to show as tick marks on the axis (e.g., [0, 25, 50, 75, 100] or [10, 20, 30, 40]). Should span from min to max and include key quartile values."
			)
	})
	.strict()
	.describe("Configuration for the horizontal number line of the box plot.")

// Defines the five-number summary for the box plot
const BoxPlotSummarySchema = z
	.object({
		min: z
			.number()
			.describe(
				"The minimum value in the dataset, shown as the leftmost whisker endpoint (e.g., 12, 0, 45.5). Must be ≤ q1."
			),
		q1: z
			.number()
			.describe(
				"First quartile (25th percentile), forms the left edge of the box (e.g., 25, 15.5, 62). Must be between min and median."
			),
		median: z
			.number()
			.describe(
				"Median value (50th percentile), shown as a vertical line inside the box (e.g., 45, 28, 75.5). Must be between q1 and q3."
			),
		q3: z
			.number()
			.describe(
				"Third quartile (75th percentile), forms the right edge of the box (e.g., 68, 42, 85). Must be between median and max."
			),
		max: z
			.number()
			.describe(
				"The maximum value in the dataset, shown as the rightmost whisker endpoint (e.g., 95, 58, 100). Must be ≥ q3."
			)
	})
	.strict()
	.describe(
		"The five-number summary statistics that define the box and whiskers. Values must be in ascending order: min ≤ q1 ≤ median ≤ q3 ≤ max."
	)

// The main Zod schema for the boxPlot function
export const BoxPlotPropsSchema = z
	.object({
		type: z
			.literal("boxPlot")
			.describe("Identifies this as a box plot widget for displaying five-number summary statistics."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the plot in pixels including labels and margins (e.g., 500, 600, 400). Wider plots show data spread more clearly."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the plot in pixels (e.g., 150, 200, 100). Box plots are typically wider than tall since they're horizontal."
			),
		axis: BoxPlotAxisSchema.describe("Configuration for the horizontal scale including range and tick marks."),
		summary: BoxPlotSummarySchema.describe("The five-number summary used to draw the plot."),
		boxColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS color for the box fill showing the interquartile range (e.g., '#E8F4FD' for light blue, 'lightgray', 'rgba(150,150,150,0.3)'). Should be subtle to show median line clearly."
			),
		medianColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS color for the median line inside the box (e.g., '#FF6B6B' for red, 'black', 'darkblue'). Should contrast strongly with boxColor for emphasis."
			)
	})
	.strict()
	.describe(
		"Creates a horizontal box-and-whisker plot showing data distribution through five-number summary. Essential for statistics education, comparing distributions, and identifying outliers. The box shows the middle 50% of data (IQR) with whiskers extending to min/max."
	)

export type BoxPlotProps = z.infer<typeof BoxPlotPropsSchema>

/**
 * This template generates a standard horizontal box-and-whisker plot as an SVG graphic.
 * This type of plot is a powerful tool for summarizing the distribution of a numerical
 * data set through its five-number summary.
 */
export const generateBoxPlot: WidgetGenerator<typeof BoxPlotPropsSchema> = (data) => {
	const { width, height, axis, summary, boxColor, medianColor } = data
	
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true, 15) // has tick labels, less padding
	const margin = { top: PADDING, right: PADDING, bottom: bottomMargin, left: PADDING }
	
	const plotHeight = height - margin.top - margin.bottom
	const chartWidth = width - margin.left - margin.right
	const yCenter = margin.top + plotHeight / 2
	
	if (axis.min >= axis.max) {
		logger.error("invalid axis range for box plot", { axisMin: axis.min, axisMax: axis.max })
		throw errors.wrap(ErrInvalidRange, `axis.min (${axis.min}) must be less than axis.max (${axis.max})`)
	}

	const scale = chartWidth / (axis.max - axis.min)
	const toSvgX = (val: number) => margin.left + (val - axis.min) * scale

	const minPos = toSvgX(summary.min)
	const q1Pos = toSvgX(summary.q1)
	const medianPos = toSvgX(summary.median)
	const q3Pos = toSvgX(summary.q3)
	const maxPos = toSvgX(summary.max)

	const ext = initExtents(width) // NEW: Initialize extents tracking
	let svgBody = ""

	// MODIFIED: Use dynamic axisY and label positioning
	const axisY = height - margin.bottom
	svgBody += `<line x1="${margin.left}" y1="${axisY}" x2="${width - margin.right}" y2="${axisY}" stroke="${theme.colors.axis}"/>`
	if (axis.label && axis.label !== "") {
		const labelX = margin.left + chartWidth / 2
		const labelY = height - margin.bottom + xAxisTitleY
		svgBody += `<text x="${labelX}" y="${labelY}" fill="${theme.colors.axisLabel}" text-anchor="middle" font-size="${theme.font.size.medium}">${abbreviateMonth(axis.label)}</text>`
		includeText(ext, labelX, abbreviateMonth(axis.label), "middle", 7)
	}
	
	// Add text-aware label selection
	// Draw tick marks and labels
	const tickPositions = axis.tickLabels.map(toSvgX);
	const selectedLabels = calculateTextAwareLabelSelection(axis.tickLabels.map(String), tickPositions, chartWidth);

	axis.tickLabels.forEach((t, i) => {
		const pos = toSvgX(t)
		svgBody += `<line x1="${pos}" y1="${axisY - 5}" x2="${pos}" y2="${axisY + 5}" stroke="${theme.colors.axis}"/>`
		if (selectedLabels.has(i)) { // Check if label should be rendered
			svgBody += `<text x="${pos}" y="${axisY + 20}" fill="${theme.colors.axisLabel}" text-anchor="middle">${t}</text>`
			includeText(ext, pos, String(t), "middle", 7)
		}
	})

	// Box plot elements
	// Whiskers
	svgBody += `<line x1="${minPos}" y1="${yCenter}" x2="${q1Pos}" y2="${yCenter}" stroke="${theme.colors.black}"/>`
	svgBody += `<line x1="${q3Pos}" y1="${yCenter}" x2="${maxPos}" y2="${yCenter}" stroke="${theme.colors.black}"/>`

	svgBody += `<line x1="${minPos}" y1="${yCenter - 10}" x2="${minPos}" y2="${yCenter + 10}" stroke="${theme.colors.black}"/>`
	svgBody += `<line x1="${maxPos}" y1="${yCenter - 10}" x2="${maxPos}" y2="${yCenter + 10}" stroke="${theme.colors.black}"/>`

	// Add tracking for the min/max whisker positions
	includePointX(ext, minPos)
	includePointX(ext, maxPos)

	// Include the main box in extent tracking
	includePointX(ext, q1Pos)
	includePointX(ext, q3Pos)

	svgBody += `<rect x="${q1Pos}" y="${yCenter - plotHeight / 2}" width="${q3Pos - q1Pos}" height="${plotHeight}" fill="${boxColor}" stroke="${theme.colors.black}"/>`

	svgBody += `<line x1="${medianPos}" y1="${yCenter - plotHeight / 2}" x2="${medianPos}" y2="${yCenter + plotHeight / 2}" stroke="${medianColor}" stroke-width="${theme.stroke.width.thick}"/>`

	// NEW: Apply dynamic width at the end
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
