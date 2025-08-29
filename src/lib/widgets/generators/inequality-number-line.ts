import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"

export const ErrInvalidRange = errors.new("min must be less than max")

function createBoundarySchema() {
	return z
		.object({
			value: z
				.number()
				.describe(
					"The numerical value where this boundary occurs on the number line (e.g., 3, -2, 5.5, 0). Must be within min/max range."
				),
			type: z
				.enum(["open", "closed"])
				.describe(
					"Boundary type. 'open' (exclusive) shows hollow circle for < or >, 'closed' (inclusive) shows filled circle for ≤ or ≥."
				)
		})
		.strict()
}

function createStartSchema() {
	return z.discriminatedUnion("type", [
		z
			.object({
				type: z.literal("bounded").describe("The range has a defined starting point."),
				at: createBoundarySchema().describe("The starting boundary with its value and open/closed type.")
			})
			.strict(),
		z
			.object({
				type: z.literal("unbounded").describe("The range extends infinitely to the left (negative infinity).")
			})
			.strict()
	])
}

function createEndSchema() {
	return z.discriminatedUnion("type", [
		z
			.object({
				type: z.literal("bounded").describe("The range has a defined ending point."),
				at: createBoundarySchema().describe("The ending boundary with its value and open/closed type.")
			})
			.strict(),
		z
			.object({
				type: z.literal("unbounded").describe("The range extends infinitely to the right (positive infinity).")
			})
			.strict()
	])
}

function createRangeSchema() {
	return z
		.object({
			start: createStartSchema().describe(
				"The left boundary of the shaded region. Can be bounded (specific value) or unbounded (extends to -∞)."
			),
			end: createEndSchema().describe(
				"The right boundary of the shaded region. Can be bounded (specific value) or unbounded (extends to +∞)."
			),
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"Hex-only color for the shaded region (e.g., '#4287F54D' for 30% alpha, '#FFE5B4'). Use translucency via 8-digit hex for overlapping ranges."
				)
		})
		.strict()
}

export const InequalityNumberLinePropsSchema = z
	.object({
		type: z
			.literal("inequalityNumberLine")
			.describe("Identifies this as an inequality number line for visualizing solution sets."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the number line in pixels (e.g., 600, 700, 500). Must show the relevant range clearly."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the widget in pixels (e.g., 100, 120, 80). Includes number line, shading, and labels."
			),
		min: z
			.number()
			.describe(
				"Minimum value shown on the number line (e.g., -10, -5, 0). Should be less than smallest relevant boundary."
			),
		max: z
			.number()
			.describe(
				"Maximum value shown on the number line (e.g., 10, 20, 15). Should be greater than largest relevant boundary."
			),
		tickInterval: z
			.number()
			.positive()
			.describe("Spacing between tick marks (e.g., 1, 2, 0.5). Should evenly divide the range for clean appearance."),
		ranges: z
			.array(createRangeSchema())
			.describe(
				"Solution ranges to shade on the number line. Can overlap for compound inequalities. Empty array shows blank number line. Order doesn't affect display."
			)
	})
	.strict()
	.describe(
		"Creates number lines showing solution sets for inequalities with shaded regions, open/closed endpoints, and arrows for unbounded intervals. Essential for teaching inequality notation (x < 5, x ≥ -2), compound inequalities (3 < x ≤ 7), and solution set visualization. Supports multiple overlapping ranges."
	)

export type InequalityNumberLineProps = z.infer<typeof InequalityNumberLinePropsSchema>

/**
 * Generates an SVG number line to graph the solution set of single or compound inequalities,
 * using open/closed circles and shaded regions to represent the solution.
 */
export const generateInequalityNumberLine: WidgetGenerator<typeof InequalityNumberLinePropsSchema> = (data) => {
	const { width, height, min, max, tickInterval, ranges } = data
	const chartWidth = width - 2 * PADDING
	const yPos = height / 2

	if (min >= max) {
		logger.error("inequality number line invalid range", { min, max })
		throw errors.wrap(ErrInvalidRange, `min (${min}) must be less than max (${max})`)
	}

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => PADDING + (val - min) * scale
	
	const ext = initExtents(width)
	let svgBody = ""

	// Axis and Ticks
	svgBody += `<line x1="${PADDING}" y1="${yPos}" x2="${width - PADDING}" y2="${yPos}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.base}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`

	// Define markers for arrows
	svgBody += "<defs>"
	svgBody += `<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.axis}"/></marker>`

	// Add colored arrow markers for ranges
	const uniqueColors = new Set(ranges.map((r) => r.color))
	for (const color of uniqueColors) {
		const colorId = color.replace(/[^a-zA-Z0-9]/g, "")
		svgBody += `<marker id="arrow-${colorId}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`
	}
	svgBody += "</defs>"

	for (let t = min; t <= max; t += tickInterval) {
		const x = toSvgX(t)
		// Match tick sizing with standard number line widget for visual consistency
		svgBody += `<line x1="${x}" y1="${yPos - 8}" x2="${x}" y2="${yPos + 8}" stroke="${theme.colors.axis}"/>`
		svgBody += `<text x="${x}" y="${yPos + 25}" fill="${theme.colors.axisLabel}" text-anchor="middle">${t}</text>`
		includeText(ext, x, String(t), "middle", 7)
	}

	for (const r of ranges) {
		const startPos = r.start.type === "bounded" ? toSvgX(r.start.at.value) : PADDING
		const endPos = r.end.type === "bounded" ? toSvgX(r.end.at.value) : width - PADDING
		const colorId = r.color.replace(/[^a-zA-Z0-9]/g, "")
		
		// Track the horizontal extent of the range
		includePointX(ext, startPos)
		includePointX(ext, endPos)

		// Add markers for unbounded cases
		let markerStart = ""
		let markerEnd = ""
		if (r.start.type === "unbounded") {
			markerStart = `marker-start="url(#arrow-${colorId})"`
		}
		if (r.end.type === "unbounded") {
			markerEnd = `marker-end="url(#arrow-${colorId})"`
		}

		svgBody += `<line x1="${startPos}" y1="${yPos}" x2="${endPos}" y2="${yPos}" stroke="${r.color}" stroke-width="${theme.stroke.width.xthick}" stroke-linecap="butt" ${markerStart} ${markerEnd}/>`

		// Boundary circles
		if (r.start.type === "bounded") {
			const fill = r.start.at.type === "closed" ? r.color : theme.colors.background
			svgBody += `<circle cx="${startPos}" cy="${yPos}" r="5" fill="${fill}" stroke="${r.color}" stroke-width="${theme.stroke.width.base}"/>`
		}
		if (r.end.type === "bounded") {
			const fill = r.end.at.type === "closed" ? r.color : theme.colors.white
			svgBody += `<circle cx="${endPos}" cy="${yPos}" r="5" fill="${fill}" stroke="${r.color}" stroke-width="${theme.stroke.width.base}"/>`
		}
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
