import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { initExtents, includeText, computeDynamicWidth } from "@/lib/widgets/utils/layout"

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

	const padding = { top: 40, right: 40, bottom: 80, left: 80 }

	// Use the explicitly provided axis ranges
	const minX = xAxisMin
	const maxX = xAxisMax
	const paddedMinY = yAxisMin
	const paddedMaxY = yAxisMax

	const chartWidth = width - padding.left - padding.right
	const chartHeight = height - padding.top - padding.bottom

	const scaleX = chartWidth / (maxX - minX || 1)
	const scaleY = chartHeight / (paddedMaxY - paddedMinY || 1)

	const toSvgX = (val: number) => padding.left + (val - minX) * scaleX
	const toSvgY = (val: number) => height - padding.bottom - (val - paddedMinY) * scaleY

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="16">`
	svg += `<defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`

	// Axes
	const yAxisX = padding.left
	const xAxisY = height - padding.bottom
	svg += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${yAxisX}" y2="${padding.top}" stroke="black" stroke-width="2" marker-end="url(#graph-arrow)"/>`
	svg += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${width - padding.right}" y2="${xAxisY}" stroke="black" stroke-width="2" marker-end="url(#graph-arrow)"/>`

	// Axis Labels (closer to axes)
	const yLabelX = yAxisX - 30
	svg += `<text x="${yLabelX}" y="${padding.top + chartHeight / 2}" text-anchor="middle" transform="rotate(-90, ${yLabelX}, ${padding.top + chartHeight / 2})">${yAxisLabel}</text>`
	includeText(ext, yLabelX, yAxisLabel, "middle", 7)
	svg += `<text x="${padding.left + chartWidth / 2}" y="${xAxisY + 30}" text-anchor="middle">${xAxisLabel}</text>`
	includeText(ext, padding.left + chartWidth / 2, xAxisLabel, "middle", 7)

	// Before Curve
	if (beforeSegment.points.length > 0) {
		const beforePointsStr = beforeSegment.points.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
		svg += `<polyline points="${beforePointsStr}" fill="none" stroke="${beforeSegment.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
	}

	// After Curve
	if (afterSegment.points.length > 0) {
		const afterPointsStr = afterSegment.points.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
		svg += `<polyline points="${afterPointsStr}" fill="none" stroke="${afterSegment.color}" stroke-width="3" stroke-dasharray="8 6" stroke-linejoin="round" stroke-linecap="round"/>`
	}

	// Legend (stacked vertically to avoid horizontal cutoff)
	if (showLegend) {
		const legendItems = [
			{ label: beforeSegment.label, color: beforeSegment.color, dashed: false },
			{ label: afterSegment.label, color: afterSegment.color, dashed: true }
		]

		const estimateTextWidth = (text: string) => text.length * 7 // rough estimate
		const legendLineLength = 30
		const legendGapX = 8
		const legendItemHeight = 18 // fit two items between axis and x-axis label

		const maxTextWidth = Math.max(...legendItems.map((i) => estimateTextWidth(i.label)))
		const legendBoxWidth = legendLineLength + legendGapX + maxTextWidth
		const legendBoxHeight = legendItems.length * legendItemHeight

		// Center horizontally below the plot area
		let legendStartX = (width - legendBoxWidth) / 2
		if (legendStartX < 10) legendStartX = 10

		// Place vertically below the x-axis label but within the bottom margin
		const xAxisY = height - padding.bottom
		const axisLabelY = xAxisY + 30
		let legendStartY = Math.max(axisLabelY + 12, height - 10 - legendBoxHeight)

		for (const [i, item] of legendItems.entries()) {
			const y = legendStartY + i * legendItemHeight
			const textY = y + 5
			const x1 = legendStartX
			const x2 = legendStartX + legendLineLength
			const textX = x2 + legendGapX

			const dash = item.dashed ? ' stroke-dasharray="8 6"' : ""
			svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${item.color}" stroke-width="3"${dash}/>`
			svg += `<text x="${textX}" y="${textY}">${item.label}</text>`
			includeText(ext, textX, item.label, "start", 7)
		}
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
