import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

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

	if (curvePoints.length === 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	const allPoints = curvePoints
	const minX = Math.min(...allPoints.map((p) => p.x))
	const maxX = Math.max(...allPoints.map((p) => p.x))
	const minY = Math.min(...allPoints.map((p) => p.y))
	const maxY = Math.max(...allPoints.map((p) => p.y))

	// Use V2 base with conceptual (non-numeric) axes
	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		null, // No title for conceptual graphs
		{
			label: xAxisLabel,
			min: minX,
			max: maxX,
			tickInterval: (maxX - minX) / 4, // Arbitrary spacing
			showGridLines: false,
			showTickLabels: false // Conceptual, no numeric labels
		},
		{
			label: yAxisLabel,
			min: minY,
			max: maxY,
			tickInterval: (maxY - minY) / 4, // Arbitrary spacing
			showGridLines: false,
			showTickLabels: false // Conceptual, no numeric labels
		}
	)

	// Add arrow markers (outside clipped area)
	let arrows = `<defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.black}"/></marker></defs>`

	const yAxisX = base.chartArea.left
	const xAxisY = base.chartArea.top + base.chartArea.height
	arrows += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${yAxisX}" y2="${base.chartArea.top}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}" marker-end="url(#graph-arrow)"/>`
	arrows += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${base.chartArea.left + base.chartArea.width}" y2="${xAxisY}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.thick}" marker-end="url(#graph-arrow)"/>`
	includePointX(base.ext, base.chartArea.left + base.chartArea.width)

	// Separate clipped geometry from unclipped markers and labels
	let clippedContent = ""
	let unclippedContent = ""
	
	// Main curve goes in clipped content
	const pointsStr = curvePoints.map((p) => `${base.toSvgX(p.x)},${base.toSvgY(p.y)}`).join(" ")
	clippedContent += `<polyline points="${pointsStr}" fill="none" stroke="${curveColor}" stroke-width="${theme.stroke.width.xxthick}" stroke-linejoin="round" stroke-linecap="round"/>`
	for (const p of curvePoints) {
		includePointX(base.ext, base.toSvgX(p.x))
	}

	// Precompute cumulative lengths and provide a safe pointAtT
	const cumulativeLengths: number[] = [0]
	for (let i = 1; i < curvePoints.length; i++) {
		const prev = curvePoints[i - 1]!
		const curr = curvePoints[i]!
		const dx = curr.x - prev.x
		const dy = curr.y - prev.y
		const segLen = Math.hypot(dx, dy)
		cumulativeLengths[i] = (cumulativeLengths[i - 1] ?? 0) + segLen
	}
	const totalLength = cumulativeLengths[cumulativeLengths.length - 1] ?? 0
	function pointAtT(t: number): { x: number; y: number } {
		if (curvePoints.length === 0) return { x: 0, y: 0 }
		if (curvePoints.length === 1 || totalLength === 0) return curvePoints[0]!
		if (t <= 0) return curvePoints[0]!
		if (t >= 1) return curvePoints[curvePoints.length - 1]!
		const target = t * totalLength
		let idx = 0
		for (let i = 0; i < cumulativeLengths.length - 1; i++) {
			const cStartVal = cumulativeLengths[i] ?? 0
			const cEndVal = cumulativeLengths[i + 1] ?? cStartVal
			if (target >= cStartVal && target <= cEndVal) {
				idx = i
				break
			}
		}
		if (idx < 0) idx = 0
		if (idx >= curvePoints.length - 1) return curvePoints[curvePoints.length - 1]!
		const cStartVal = cumulativeLengths[idx] ?? 0
		const cEndVal = cumulativeLengths[idx + 1] ?? cStartVal
		const cStart = cStartVal
		const cEnd = cEndVal
		const segmentLength = cEnd - cStart
		const localT = segmentLength === 0 ? 0 : (target - cStart) / segmentLength
		const p0 = curvePoints[idx]!
		const p1 = curvePoints[idx + 1]!
		return { x: p0.x + (p1.x - p0.x) * localT, y: p0.y + (p1.y - p0.y) * localT }
	}

	// Highlight points and labels go in unclipped content to prevent being cut off at boundaries
	for (const hp of highlightPoints) {
		const pt = pointAtT(hp.t)
		const cx = base.toSvgX(pt.x)
		const cy = base.toSvgY(pt.y)
		includePointX(base.ext, cx)
		unclippedContent += `<circle cx="${cx}" cy="${cy}" r="${highlightPointRadius}" fill="${highlightPointColor}"/>`
		unclippedContent += `<text x="${cx - highlightPointRadius - 5}" y="${cy}" text-anchor="end" dominant-baseline="middle" font-weight="${theme.font.weight.bold}" font-size="${theme.font.size.medium}">${hp.label}</text>`
		includeText(base.ext, cx - highlightPointRadius - 5, hp.label, "end", 7)
	}

	let svgBody = base.svgBody
	svgBody += arrows
	svgBody += wrapInClippedGroup(base.clipId, clippedContent)
	svgBody += unclippedContent // Add unclipped markers and labels

	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, base.chartArea.top + base.chartArea.height + base.outsideBottomPx, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${base.chartArea.top + base.chartArea.height + base.outsideBottomPx}" viewBox="${vbMinX} 0 ${dynamicWidth} ${base.chartArea.top + base.chartArea.height + base.outsideBottomPx}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.large}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
