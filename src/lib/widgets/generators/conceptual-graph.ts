import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Factory functions to avoid schema instance reuse which causes $ref in JSON Schema
function createPointSchema() {
	return z.object({
		x: z.number().describe("The x-coordinate of the point in an arbitrary data space."),
		y: z.number().describe("The y-coordinate of the point in an arbitrary data space.")
	})
}

function createHighlightPointSchema() {
	return createPointSchema().extend({
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

	const allPoints = [...curvePoints, ...highlightPoints]
	const padding = { top: 40, right: 40, bottom: 60, left: 80 }

	const minX = Math.min(...allPoints.map((p) => p.x))
	const maxX = Math.max(...allPoints.map((p) => p.x))
	const minY = Math.min(...allPoints.map((p) => p.y))
	const maxY = Math.max(...allPoints.map((p) => p.y))

	const chartWidth = width - padding.left - padding.right
	const chartHeight = height - padding.top - padding.bottom

	const scaleX = chartWidth / (maxX - minX)
	const scaleY = chartHeight / (maxY - minY)

	const toSvgX = (val: number) => padding.left + (val - minX) * scaleX
	const toSvgY = (val: number) => height - padding.bottom - (val - minY) * scaleY

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="16">`
	svg += `<defs><marker id="graph-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`

	// Axes
	const yAxisX = padding.left
	const xAxisY = height - padding.bottom
	svg += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${yAxisX}" y2="${padding.top}" stroke="black" stroke-width="2" marker-end="url(#graph-arrow)"/>`
	svg += `<line x1="${yAxisX}" y1="${xAxisY}" x2="${width - padding.right}" y2="${xAxisY}" stroke="black" stroke-width="2" marker-end="url(#graph-arrow)"/>`

	// Axis Labels
	svg += `<text x="${yAxisX - 20}" y="${padding.top + chartHeight / 2}" text-anchor="middle" transform="rotate(-90, ${yAxisX - 20}, ${padding.top + chartHeight / 2})">${yAxisLabel}</text>`
	svg += `<text x="${padding.left + chartWidth / 2}" y="${xAxisY + 40}" text-anchor="middle">${xAxisLabel}</text>`

	// Curve
	const pointsStr = curvePoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
	svg += `<polyline points="${pointsStr}" fill="none" stroke="${curveColor}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`

	// Highlight Points
	for (const p of highlightPoints) {
		const cx = toSvgX(p.x)
		const cy = toSvgY(p.y)
		svg += `<circle cx="${cx}" cy="${cy}" r="${highlightPointRadius}" fill="${highlightPointColor}"/>`
		svg += `<text x="${cx - highlightPointRadius - 5}" y="${cy}" text-anchor="end" dominant-baseline="middle" font-weight="bold">${p.label}</text>`
	}

	svg += "</svg>"
	return svg
}
