import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { 
	calculateTitleLayout, 
	calculateXAxisLayout, 
	calculateYAxisLayoutAxisAware,
	computeDynamicWidth, 
	includePointX,
	includeRotatedYAxisLabel, 
	includeText, 
	initExtents 
} from "@/lib/widgets/utils/layout"
import { renderRotatedWrappedYAxisLabel } from "@/lib/widgets/utils/text"

// Factory functions to avoid schema instance reuse which causes $ref in JSON Schema
function createPointSchema() {
	return z.object({
		x: z.number().describe("The x-coordinate of the point in an arbitrary data space."),
		y: z.number().describe("The y-coordinate of the point in an arbitrary data space.")
	})
}

function createHighlightPointSchema() {
	return z.object({
		t: z
			.number()
			.min(0)
			.max(1)
			.describe("Position along the curve as a fraction of total arc length; 0 = start of curve, 1 = end of curve."),
		label: z.string().describe("The text label to display next to this point (e.g., 'A', 'B', 'C').")
	})
}

export const ConceptualGraphPropsSchema = z
	.object({
		type: z.literal("conceptualGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 400, 500)."),
		height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 400, 500)."),
		xAxisLabel: z.string().describe("The label for the horizontal axis (e.g., 'Time')."),
		yAxisLabel: z.string().describe("The label for the vertical axis (e.g., 'Frog population size')."),
		curvePoints: z
			.array(createPointSchema())
			.min(2)
			.describe("An array of {x, y} points that define the curve to be drawn."),
		curveColor: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The color of the plotted curve."),
		highlightPoints: z
			.array(createHighlightPointSchema())
			.describe("An array of specific, labeled points to highlight on the graph."),
		highlightPointColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.describe("The color of the highlighted points and their labels."),
		highlightPointRadius: z.number().positive().describe("The radius of the highlighted points in pixels.")
	})
	.strict()
	.describe(
		"Creates an abstract graph to show relationships between variables without a numerical scale. Renders a smooth curve and highlights key points."
	)

export type ConceptualGraphProps = z.infer<typeof ConceptualGraphPropsSchema>

export const generateConceptualGraph: WidgetGenerator<typeof ConceptualGraphPropsSchema> = (props) => {
	const {
		width,
		height,
		xAxisLabel,
		yAxisLabel,
		curvePoints,
		curveColor,
		highlightPoints,
		highlightPointColor,
		highlightPointRadius
	} = props

	// MODIFICATION: Replace hardcoded padding with dynamic layout helpers
	const { topMargin } = calculateTitleLayout(undefined, width - 60, 40) // No title, but reserve space
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(false, 40) // No tick labels, custom padding
	const chartHeight = height - topMargin - bottomMargin
	if (chartHeight <= 0) return `<svg width="${width}" height="${height}"></svg>`

	const mockYAxis = { min: 0, max: 1, tickInterval: 1, label: yAxisLabel }
	const mockXAxis = { min: 0, max: 1 } // Non-numeric axis, provide mock range
	const { leftMargin, yAxisLabelX } = calculateYAxisLayoutAxisAware(
		mockYAxis,
		mockXAxis,
		width,
		chartHeight,
		{ top: topMargin, right: 40, bottom: bottomMargin },
		{ axisPlacement: "leftEdge", axisTitleFontPx: 16, titlePadding: 20 }
	)
	const margin = { top: topMargin, right: 40, bottom: bottomMargin, left: leftMargin }

	const chartWidth = width - margin.left - margin.right
	if (chartWidth <= 0) return `<svg width="${width}" height="${height}"></svg>`

	const allPoints = curvePoints
	const minX = Math.min(...allPoints.map((p) => p.x))
	const maxX = Math.max(...allPoints.map((p) => p.x))
	const minY = Math.min(...allPoints.map((p) => p.y))
	const maxY = Math.max(...allPoints.map((p) => p.y))

	const scaleX = chartWidth / (maxX - minX)
	const scaleY = chartHeight / (maxY - minY)

	const toSvgX = (val: number) => margin.left + (val - minX) * scaleX
	const toSvgY = (val: number) => height - margin.bottom - (val - minY) * scaleY

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="16">`
	svg += `<defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`

	// Axes
	const yAxisX = margin.left
	const xAxisY = height - margin.bottom
	svg += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${yAxisX}" y2="${margin.top}" stroke="black" stroke-width="2" marker-end="url(#graph-arrow)"/>`
	svg += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${width - margin.right}" y2="${xAxisY}" stroke="black" stroke-width="2" marker-end="url(#graph-arrow)"/>`
	// --- ADDED ---
	includePointX(ext, yAxisX)
	includePointX(ext, width - margin.right)
	// --- END ADDED ---

	// Axis Labels
	svg += renderRotatedWrappedYAxisLabel(yAxisLabel, yAxisLabelX, margin.top + chartHeight / 2, chartHeight)
	includeRotatedYAxisLabel(ext, yAxisLabelX, yAxisLabel, chartHeight)
	svg += `<text x="${margin.left + chartWidth / 2}" y="${height - margin.bottom + xAxisTitleY}" text-anchor="middle">${xAxisLabel}</text>`
	includeText(ext, margin.left + chartWidth / 2, xAxisLabel, "middle", 7)

	// Curve
	const pointsStr = curvePoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
	svg += `<polyline points="${pointsStr}" fill="none" stroke="${curveColor}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
	// --- ADDED ---
	for (const p of curvePoints) {
		includePointX(ext, toSvgX(p.x))
	}
	// --- END ADDED ---

	// Precompute cumulative arc lengths along the curve for t-based positioning
	const cumulativeLengths: number[] = [0]
	for (let i = 1; i < curvePoints.length; i++) {
		const prev = curvePoints[i - 1]
		const curr = curvePoints[i]
		if (!prev || !curr) continue
		const dx = curr.x - prev.x
		const dy = curr.y - prev.y
		const segLen = Math.hypot(dx, dy)
		cumulativeLengths[i] = (cumulativeLengths[i - 1] ?? 0) + segLen
	}
	const totalLength = cumulativeLengths[cumulativeLengths.length - 1] ?? 0

	function pointAtT(t: number): { x: number; y: number } {
		if (curvePoints.length === 0) return { x: 0, y: 0 }
		const firstPoint = curvePoints[0]
		if (!firstPoint) return { x: 0, y: 0 }
		if (curvePoints.length === 1 || totalLength === 0) return firstPoint
		if (t <= 0) return firstPoint
		const lastPoint = curvePoints[curvePoints.length - 1]
		if (t >= 1) return lastPoint || firstPoint

		const target = t * totalLength
		let idx = 0
		for (let i = 0; i < cumulativeLengths.length - 1; i++) {
			const cStart = cumulativeLengths[i]
			const cEnd = cumulativeLengths[i + 1]
			if (cStart === undefined || cEnd === undefined) {
				continue
			}
			if (target >= cStart && target <= cEnd) {
				idx = i
				break
			}
		}
		const segStart = cumulativeLengths[idx]
		const segEnd = cumulativeLengths[idx + 1]
		if (segStart === undefined || segEnd === undefined) {
			return { x: 0, y: 0 }
		}
		const segmentLength = segEnd - segStart
		const localT = segmentLength === 0 ? 0 : (target - segStart) / segmentLength
		const p0 = curvePoints[idx]
		const p1 = curvePoints[idx + 1]
		if (!p0 || !p1) {
			return { x: 0, y: 0 }
		}
		return {
			x: p0.x + (p1.x - p0.x) * localT,
			y: p0.y + (p1.y - p0.y) * localT
		}
	}

	// Highlight Points
	for (const hp of highlightPoints) {
		const pt = pointAtT(hp.t)
		const cx = toSvgX(pt.x)
		const cy = toSvgY(pt.y)
		// Track the highlight point position
		includePointX(ext, cx)
		svg += `<circle cx="${cx}" cy="${cy}" r="${highlightPointRadius}" fill="${highlightPointColor}"/>`
		svg += `<text x="${cx - highlightPointRadius - 5}" y="${cy}" text-anchor="end" dominant-baseline="middle" font-weight="bold">${hp.label}</text>`
		includeText(ext, cx - highlightPointRadius - 5, hp.label, "end", 7)
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
