import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { renderWrappedText } from "@/lib/widgets/utils/text"
import { theme } from "@/lib/widgets/utils/theme"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

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

	if (xAxis.tickValues.length < 2) {
		logger.error("area graph invalid tickValues", { count: xAxis.tickValues.length })
		throw errors.new("invalid x tick values")
	}
	const deltas: number[] = []
	for (let i = 1; i < xAxis.tickValues.length; i++) {
		const curr = xAxis.tickValues[i]
		if (curr === undefined) {
			logger.error("area graph invalid tick value", { index: i })
			throw errors.new("invalid x tick values")
		}
		const prev = xAxis.tickValues[i - 1]
		if (prev === undefined) {
			logger.error("area graph invalid tick value", { index: i - 1 })
			throw errors.new("invalid x tick values")
		}
		const d = curr - prev
		deltas.push(d)
	}
	const first = deltas[0] ?? 0
	const nonUniform = deltas.some((d) => Math.abs(d - first) > 1e-9)
	// Relaxed: if non-uniform, we won't throw; we use a reasonable tickInterval fallback
	const tickInterval = nonUniform ? Math.max(1e-9, Math.min(...deltas.map((d) => Math.abs(d)))) : Math.abs(first)

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		title,
		{
			label: xAxis.label,
			min: xAxis.min,
			max: xAxis.max,
			tickInterval,
			showGridLines: false,
			showTickLabels: true
		},
		{
			label: yAxis.label,
			min: yAxis.min,
			max: yAxis.max,
			tickInterval: yAxis.tickInterval,
			showGridLines: yAxis.showGridLines,
			showTickLabels: true
		}
	)

	let content = ""
	const toSvgX = base.toSvgX
	const toSvgY = base.toSvgY

	dataPoints.forEach((p) => {
		includePointX(base.ext, toSvgX(p.x))
	})
	const pointsStr = dataPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
	const firstPoint = dataPoints[0]
	if (!firstPoint) {
		logger.error("area graph missing first point", { count: dataPoints.length })
		throw errors.new("missing data point")
	}
	const lastPoint = dataPoints[dataPoints.length - 1]
	if (!lastPoint) {
		logger.error("area graph missing last point", { count: dataPoints.length })
		throw errors.new("missing data point")
	}
	const leftX = toSvgX(firstPoint.x)
	const rightX = toSvgX(lastPoint.x)

	const bottomPath = `M${leftX},${toSvgY(yAxis.min)} ${pointsStr} L${rightX},${toSvgY(yAxis.min)} Z`
	const topPath = `M${leftX},${toSvgY(yAxis.max)} ${pointsStr} L${rightX},${toSvgY(yAxis.max)} Z`

	content += `<path d="${bottomPath}" fill="${bottomArea.color}" stroke="none"/>`
	content += `<path d="${topPath}" fill="${topArea.color}" stroke="none"/>`
	content += `<polyline points="${pointsStr}" fill="none" stroke="${boundaryLine.color}" stroke-width="${boundaryLine.strokeWidth}"/>`

	content += renderWrappedText(abbreviateMonth(bottomArea.label), toSvgX(1975), toSvgY(40), "area-label", "1.2em", base.chartArea.width, 8)
	content += renderWrappedText(abbreviateMonth(topArea.label), toSvgX(1850), toSvgY(70), "area-label", "1.2em", base.chartArea.width, 8)

	let svgBody = base.svgBody
	svgBody += wrapInClippedGroup(base.clipId, content)

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.medium}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
