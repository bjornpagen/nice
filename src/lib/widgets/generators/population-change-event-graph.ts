import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

// Factory helpers to avoid schema reuse and $ref generation
function createPointSchema() {
	return z.object({
		x: z.number().describe("The x-coordinate of the point in an arbitrary data space."),
		y: z.number().describe("The y-coordinate of the point in an arbitrary data space.")
	})
}

function createSegmentSchema() {
	return z.object({
		points: z.array(createPointSchema()).describe("An array of {x, y} points that define this segment of the curve."),
		color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The color of this line segment."),
		label: z.string().describe("The text label for this segment to be displayed in the legend.")
	})
}

export const PopulationChangeEventGraphPropsSchema = z
	.object({
		type: z.literal("populationChangeEventGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 400, 500)."),
		height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 400, 350)."),
		xAxisLabel: z.string().describe("The label for the horizontal axis (e.g., 'Time')."),
		yAxisLabel: z.string().describe("The label for the vertical axis (e.g., 'Deer population size')."),
		xAxisMin: z.number().describe("The minimum value for the x-axis. This should typically be 0 for time-based data."),
		xAxisMax: z
			.number()
			.describe(
				"The maximum value for the x-axis. Set this to accommodate both before and after segments (e.g., 10 if before ends at 5 and after extends to 10)."
			),
		yAxisMin: z
			.number()
			.describe(
				"The minimum value for the y-axis. CRITICAL: Keep this consistent across all related graphs for meaningful comparison."
			),
		yAxisMax: z
			.number()
			.describe(
				"The maximum value for the y-axis. CRITICAL: Keep this consistent across all related graphs for meaningful comparison. Choose a value that accommodates all data points with some padding."
			),
		beforeSegment: createSegmentSchema().describe("The data and style for the 'before' period, drawn as a solid line."),
		afterSegment: createSegmentSchema().describe("The data and style for the 'after' period, drawn as a dashed line."),
		showLegend: z.boolean().describe("If true, a legend is displayed to identify the line segments.")
	})
	.strict()
	.describe(
		"Creates a conceptual graph showing a 'before' and 'after' scenario, typically for population changes over time. Renders a solid line followed by a dashed line, with a legend. IMPORTANT: Always use consistent axis scales across related graphs to enable visual comparison."
	)

export type PopulationChangeEventGraphProps = z.infer<typeof PopulationChangeEventGraphPropsSchema>

export const generatePopulationChangeEventGraph: WidgetGenerator<typeof PopulationChangeEventGraphPropsSchema> = (
	props
) => {
	const {
		width,
		height,
		xAxisLabel,
		yAxisLabel,
		xAxisMin,
		xAxisMax,
		yAxisMin,
		yAxisMax,
		beforeSegment,
		afterSegment,
		showLegend
	} = props

	const allPoints = [...beforeSegment.points, ...afterSegment.points]
	if (allPoints.length === 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		null, // No title for this widget
		{
			label: xAxisLabel,
			min: xAxisMin,
			max: xAxisMax,
			tickInterval: (xAxisMax - xAxisMin) / 5,
			showGridLines: false,
			showTickLabels: false // Conceptual, no numeric labels
		},
		{
			label: yAxisLabel,
			min: yAxisMin,
			max: yAxisMax,
			tickInterval: (yAxisMax - yAxisMin) / 5,
			showGridLines: false,
			showTickLabels: false // Conceptual, no numeric labels
		}
	)

	// Axis arrows outside clip
	let arrows = `<defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.black}"/></marker></defs>`
	const yAxisX = base.chartArea.left
	const xAxisY = base.chartArea.top + base.chartArea.height
	arrows += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${yAxisX}" y2="${base.chartArea.top}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}" marker-end="url(#graph-arrow)"/>`
	arrows += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${base.chartArea.left + base.chartArea.width}" y2="${xAxisY}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}" marker-end="url(#graph-arrow)"/>`
	includePointX(base.ext, base.chartArea.left + base.chartArea.width)

	// Curves inside clip
	let content = ""
	if (beforeSegment.points.length > 0) {
		beforeSegment.points.forEach((p) => {
			includePointX(base.ext, base.toSvgX(p.x))
		})
		const beforePointsStr = beforeSegment.points.map((p) => `${base.toSvgX(p.x)},${base.toSvgY(p.y)}`).join(" ")
		content += `<polyline points="${beforePointsStr}" fill="none" stroke="${beforeSegment.color}" stroke-width="${theme.stroke.width.xxthick}" stroke-linejoin="round" stroke-linecap="round"/>`
	}
	if (afterSegment.points.length > 0) {
		afterSegment.points.forEach((p) => {
			includePointX(base.ext, base.toSvgX(p.x))
		})
		const afterPointsStr = afterSegment.points.map((p) => `${base.toSvgX(p.x)},${base.toSvgY(p.y)}`).join(" ")
		content += `<polyline points="${afterPointsStr}" fill="none" stroke="${afterSegment.color}" stroke-width="${theme.stroke.width.xxthick}" stroke-dasharray="${theme.stroke.dasharray.dashedLong}" stroke-linejoin="round" stroke-linecap="round"/>`
	}

	// Legend content (outside clip)
	let legendContent = ""
	if (showLegend) {
		const legendItems = [
			{ label: beforeSegment.label, color: beforeSegment.color, dashed: false },
			{ label: afterSegment.label, color: afterSegment.color, dashed: true }
		]
		const estimateTextWidth = (text: string) => text.length * 7
		const legendLineLength = 30
		const legendGapX = 8
		const legendItemHeight = 18
		const maxTextWidth = Math.max(...legendItems.map((i) => estimateTextWidth(i.label)))
		const legendBoxWidth = legendLineLength + legendGapX + maxTextWidth
		let legendStartX = (width - legendBoxWidth) / 2
		if (legendStartX < 10) legendStartX = 10
		const legendStartY = base.chartArea.top + base.chartArea.height + 50
		for (const [i, item] of legendItems.entries()) {
			const y = legendStartY + i * legendItemHeight
			const textY = y + 5
			const x1 = legendStartX
			const x2 = legendStartX + legendLineLength
			const textX = x2 + legendGapX
			const dash = item.dashed ? ' stroke-dasharray="8 6"' : ""
			legendContent += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${item.color}" stroke-width="${theme.stroke.width.xxthick}"${dash}/>`
			legendContent += `<text x="${textX}" y="${textY}">${item.label}</text>`
			includeText(base.ext, textX, item.label, "start", 7)
		}
	}

	let svgBody = base.svgBody
	svgBody += arrows
	svgBody += wrapInClippedGroup(base.clipId, content)
	svgBody += legendContent

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.large}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
