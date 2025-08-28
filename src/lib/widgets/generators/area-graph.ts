import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
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

const PointSchema = z.object({
	x: z.number().describe("The x-coordinate (horizontal value) of the data point."),
	y: z.number().describe("The y-coordinate (vertical value) of the data point.")
})

export const AreaGraphPropsSchema = z
	.object({
		type: z.literal("areaGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 600, 500)."),
		height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 400, 350)."),
		title: z.string().describe("The main title displayed above the graph."),
		xAxis: z
			.object({
				label: z.string().describe("The label for the horizontal axis (e.g., 'Year')."),
				min: z.number().describe("The minimum value for the x-axis scale."),
				max: z.number().describe("The maximum value for the x-axis scale."),
				tickValues: z
					.array(z.number())
					.describe("An array of specific numerical values to be marked as ticks on the x-axis.")
			})
			.strict(),
		yAxis: z
			.object({
				label: z.string().describe("The label for the vertical axis (e.g., 'Percent of total')."),
				min: z.number().describe("The minimum value for the y-axis scale."),
				max: z.number().describe("The maximum value for the y-axis scale."),
				tickInterval: z.number().positive().describe("The numeric interval between labeled tick marks on the y-axis."),
				// REMOVED: tickFormat field is no longer supported.
				showGridLines: z.boolean().describe("If true, displays horizontal grid lines for the y-axis.")
			})
			.strict(),
		dataPoints: z
			.array(PointSchema)
			.min(2)
			.describe("An array of {x, y} points defining the boundary line between the two areas."),
		bottomArea: z
			.object({
				label: z.string().describe("Text label to display within the bottom area."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The fill color for the bottom area.")
			})
			.strict(),
		topArea: z
			.object({
				label: z.string().describe("Text label to display within the top area."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The fill color for the top area.")
			})
			.strict(),
		boundaryLine: z
			.object({
				color: z
					.string()
					.regex(CSS_COLOR_PATTERN, "invalid css color")
					.describe("The color of the line separating the areas."),
				strokeWidth: z.number().positive().describe("The thickness of the line separating the areas.")
			})
			.strict()
	})
	.strict()
	.describe(
		"Creates a stacked area graph to show how a total is divided into two categories over time or another continuous variable. Ideal for showing percentage breakdowns."
	)

export type AreaGraphProps = z.infer<typeof AreaGraphPropsSchema>



export const generateAreaGraph: WidgetGenerator<typeof AreaGraphPropsSchema> = (props) => {
	const { width, height, title, xAxis, yAxis, dataPoints, bottomArea, topArea, boundaryLine } = props

	// --- MODIFICATION START ---
	// The core layout calculations must be re-ordered. We must calculate vertical
	// margins first to determine chartHeight, which is now a required input for calculateYAxisLayout.

	// 1. Calculate vertical margins first.
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	const { titleY, topMargin } = calculateTitleLayout(title, width - 60, 60)
	const marginWithoutLeft = { top: topMargin, right: 20, bottom: bottomMargin } // Defer left margin

	// 2. Calculate chartHeight based on vertical margins.
	const chartHeight = height - marginWithoutLeft.top - marginWithoutLeft.bottom
	if (chartHeight <= 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	// 3. Now, calculate Y-axis layout using the determined chartHeight.
	const { leftMargin, yAxisLabelX } = calculateYAxisLayoutAxisAware(
		yAxis,
		xAxis,
		width,
		chartHeight,
		{ top: marginWithoutLeft.top, right: marginWithoutLeft.right, bottom: marginWithoutLeft.bottom },
		{ axisPlacement: "leftEdge", axisTitleFontPx: 16 }
	)
	const margin = { ...marginWithoutLeft, left: leftMargin }

	// 4. Calculate chartWidth with the final left margin.
	const chartWidth = width - margin.left - margin.right
	if (chartWidth <= 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}
	// --- MODIFICATION END ---

	const toSvgX = (val: number) => margin.left + ((val - xAxis.min) / (xAxis.max - xAxis.min)) * chartWidth
	const toSvgY = (val: number) => height - margin.bottom - ((val - yAxis.min) / (yAxis.max - yAxis.min)) * chartHeight

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	svg +=
		"<style>.axis-label { font-size: 16px; text-anchor: middle; } .title { font-size: 18px; font-weight: bold; text-anchor: middle; } .area-label { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	const maxTextWidth = width - 60
	svg += renderWrappedText(abbreviateMonth(title), width / 2, titleY, "title", "1.1em", maxTextWidth, 8)
	includeText(ext, width / 2, abbreviateMonth(title), "middle", 7)

	// Axes and Labels
	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black" stroke-width="2"/>` // Y-axis
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black" stroke-width="2"/>` // X-axis

	svg += `<text x="${margin.left + chartWidth / 2}" y="${height - margin.bottom + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxis.label)}</text>`
	includeText(ext, margin.left + chartWidth / 2, abbreviateMonth(xAxis.label), "middle", 7)
	svg += renderRotatedWrappedYAxisLabel(
		abbreviateMonth(yAxis.label),
		yAxisLabelX,
		margin.top + chartHeight / 2,
		chartHeight
	)
	includeRotatedYAxisLabel(ext, yAxisLabelX, abbreviateMonth(yAxis.label), chartHeight)

	// X-axis ticks with text-width-aware label selection
	const xTickPositions = xAxis.tickValues.map((val) => toSvgX(val))
	const xTickLabels = xAxis.tickValues.map((val) => String(val))
	const selectedXLabels = calculateTextAwareLabelSelection(xTickLabels, xTickPositions, chartWidth)

	xAxis.tickValues.forEach((val, i) => {
		const x = toSvgX(val)
		svg += `<line x1="${x}" y1="${height - margin.bottom}" x2="${x}" y2="${height - margin.bottom + 5}" stroke="black" stroke-width="2"/>`
		if (selectedXLabels.has(i)) {
			svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle">${val}</text>`
			includeText(ext, x, String(val), "middle", 7)
		}
	})
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = toSvgY(t)
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black" stroke-width="2"/>`
		// CHANGED: Removed concatenation of `yAxis.tickFormat`.
		svg += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end">${t}</text>`
		includeText(ext, margin.left - 10, `${t}`, "end", 7)
		if (yAxis.showGridLines && t > yAxis.min) {
			svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e0e0e0"/>`
		}
	}

	// Area Paths
	// Track the x-extents of all data points
	dataPoints.forEach((p) => {
		includePointX(ext, toSvgX(p.x))
	})
	const pointsStr = dataPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
	const bottomPath = `M${toSvgX(dataPoints[0]?.x ?? xAxis.min)},${toSvgY(yAxis.min)} ${pointsStr} L${toSvgX(dataPoints[dataPoints.length - 1]?.x ?? xAxis.max)},${toSvgY(yAxis.min)} Z`
	const topPath = `M${toSvgX(dataPoints[0]?.x ?? xAxis.min)},${toSvgY(yAxis.max)} ${pointsStr} L${toSvgX(dataPoints[dataPoints.length - 1]?.x ?? xAxis.max)},${toSvgY(yAxis.max)} Z`

	svg += `<path d="${bottomPath}" fill="${bottomArea.color}" stroke="none"/>`
	svg += `<path d="${topPath}" fill="${topArea.color}" stroke="none"/>`
	svg += `<polyline points="${pointsStr}" fill="none" stroke="${boundaryLine.color}" stroke-width="${boundaryLine.strokeWidth}"/>`

	// Area Labels (now using shared renderer)
	svg += renderWrappedText(abbreviateMonth(bottomArea.label), toSvgX(1975), toSvgY(40), "area-label", "1.2em", chartWidth, 8)
	svg += renderWrappedText(abbreviateMonth(topArea.label), toSvgX(1850), toSvgY(70), "area-label", "1.2em", chartWidth, 8)
	includeText(ext, toSvgX(1975), abbreviateMonth(bottomArea.label), "middle", 7)
	includeText(ext, toSvgX(1850), abbreviateMonth(topArea.label), "middle", 7)

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
