import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, includeText, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
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
			xScaleType: "numeric", // Set the scale type
			label: xAxis.label,
			min: xAxis.min, // Required for numeric
			max: xAxis.max, // Required for numeric
			tickInterval, // Required for numeric
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

	// 1. Compute label anchors using area-weighted center of mass along x
	// Weight each segment by its horizontal span and area thickness
	let topWeightedX = 0
	let topTotalWeight = 0
	let bottomWeightedX = 0
	let bottomTotalWeight = 0
	for (let i = 0; i < dataPoints.length - 1; i++) {
		const p0 = dataPoints[i]
		const p1 = dataPoints[i + 1]
		if (!p0 || !p1) {
			logger.error("area graph missing segment point", { index: i })
			throw errors.new("invalid data points")
		}
		const dx = Math.abs(p1.x - p0.x)
		if (dx === 0) {
			logger.error("area graph invalid segment", { index: i })
			throw errors.new("invalid data points")
		}
		const midX = (p0.x + p1.x) / 2
		const topThick0 = yAxis.max - p0.y
		const topThick1 = yAxis.max - p1.y
		const bottomThick0 = p0.y - yAxis.min
		const bottomThick1 = p1.y - yAxis.min
		if (topThick0 < 0 || topThick1 < 0 || bottomThick0 < 0 || bottomThick1 < 0) {
			logger.error("area graph y outside bounds", { index: i })
			throw errors.new("y out of bounds")
		}
		const topAvgThick = (topThick0 + topThick1) / 2
		const bottomAvgThick = (bottomThick0 + bottomThick1) / 2
		topWeightedX += midX * dx * topAvgThick
		topTotalWeight += dx * topAvgThick
		bottomWeightedX += midX * dx * bottomAvgThick
		bottomTotalWeight += dx * bottomAvgThick
	}
	if (topTotalWeight <= 0) {
		logger.error("area graph zero top area", { count: dataPoints.length })
		throw errors.new("invalid top area")
	}
	if (bottomTotalWeight <= 0) {
		logger.error("area graph zero bottom area", { count: dataPoints.length })
		throw errors.new("invalid bottom area")
	}
	const topCenterXVal = topWeightedX / topTotalWeight
	const bottomCenterXVal = bottomWeightedX / bottomTotalWeight

	// Interpolate boundary y-value at an arbitrary x using piecewise linear segments
	function interpolateBoundaryY(x: number): number {
		for (let i = 0; i < dataPoints.length - 1; i++) {
			const p0 = dataPoints[i]
			const p1 = dataPoints[i + 1]
			if (!p0 || !p1) {
				logger.error("area graph missing segment point", { index: i })
				throw errors.new("invalid data points")
			}
			const within = (p0.x <= x && x <= p1.x) || (p1.x <= x && x <= p0.x)
			if (within) {
				const span = p1.x - p0.x
				if (span === 0) {
					logger.error("area graph zero-length span", { index: i })
					throw errors.new("invalid data points")
				}
				const t = (x - p0.x) / span
				return p0.y + t * (p1.y - p0.y)
			}
		}
		logger.error("area graph interpolation x outside range", { x })
		throw errors.new("interpolation out of range")
	}

	// Bias the top label position toward the y-axis to avoid clashing with the boundary line on the right
	const topLabelXVal = xAxis.min + (topCenterXVal - xAxis.min) * 0.4
	const topBoundaryYVal = interpolateBoundaryY(topLabelXVal)
	const bottomBoundaryYVal = interpolateBoundaryY(bottomCenterXVal)

	const topLabelX = toSvgX(topLabelXVal)
	const bottomLabelX = toSvgX(bottomCenterXVal)
	// Position labels comfortably within each area band
	const topLabelY = toSvgY(yAxis.max - (yAxis.max - topBoundaryYVal) * 0.25)
	const bottomLabelY = toSvgY(yAxis.min + (bottomBoundaryYVal - yAxis.min) * 0.25)

	// 2. Build clipped and unclipped content separately
	let clippedContent = ""
	clippedContent += `<path d="${bottomPath}" fill="${bottomArea.color}" stroke="none"/>`
	clippedContent += `<path d="${topPath}" fill="${topArea.color}" stroke="none"/>`
	clippedContent += `<polyline points="${pointsStr}" fill="none" stroke="${boundaryLine.color}" stroke-width="${boundaryLine.strokeWidth}"/>`

	let unclippedContent = ""
	unclippedContent += renderWrappedText(abbreviateMonth(topArea.label), topLabelX, topLabelY, "area-label", theme.font.size.medium, base.chartArea.width, 8)
	includeText(base.ext, topLabelX, abbreviateMonth(topArea.label), "middle", 8)
	unclippedContent += renderWrappedText(abbreviateMonth(bottomArea.label), bottomLabelX, bottomLabelY, "area-label", theme.font.size.medium, base.chartArea.width, 8)
	includeText(base.ext, bottomLabelX, abbreviateMonth(bottomArea.label), "middle", 8)

	// 3. Assemble SVG
	let svgBody = base.svgBody
	svgBody += wrapInClippedGroup(base.clipId, clippedContent)
	svgBody += unclippedContent // Add unclipped labels

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.medium}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
