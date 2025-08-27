import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

const Tick = z
	.object({
		value: z
			.number()
			.describe("Position of this tick mark on the number line (e.g., 0, 0.5, 1, 1.5). Must be between min and max."),
		label: z
			.string()
			.describe(
				"Text label for this tick (e.g., '0', '1/2', '1', '1 1/2'). To show no label, use an empty string."
			),
		isMajor: z
			.boolean()
			.describe(
				"Whether this is a major tick (longer line) or minor tick (shorter line). Major ticks typically mark whole numbers."
			)
	})
	.strict()

const Segment = z
	.object({
		start: z
			.number()
			.describe("Starting position of this grouped segment (e.g., 0, 0.5, 1). Must be >= min and < end."),
		end: z
			.number()
			.describe("Ending position of this grouped segment (e.g., 0.5, 1, 1.5). Must be <= max and > start."),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS fill color for this segment's bar (e.g., '#FFE5B4' for peach, 'lightblue', 'rgba(255,0,0,0.3)'). Different colors distinguish groups."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for this segment (e.g., '1/2', 'Group A', '0.5', null). Positioned above the segment. Null shows no label. Can indicate the fraction size or group name."
			)
	})
	.strict()

export const NumberLineWithFractionGroupsPropsSchema = z
	.object({
		type: z
			.literal("numberLineWithFractionGroups")
			.describe("Identifies this as a number line with fraction groups showing repeated segments."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the number line in pixels (e.g., 700, 800, 600). Must accommodate all segments and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the widget in pixels (e.g., 150, 200, 180). Includes number line and stacked segment bars."
			),
		min: z
			.number()
			.describe("Minimum value shown on the number line (e.g., 0, -1, -0.5). Typically 0 for fraction work."),
		max: z
			.number()
			.describe("Maximum value shown on the number line (e.g., 3, 5, 2). Should accommodate all segments."),
		ticks: z
			.array(Tick)
			.describe(
				"All tick marks with their labels. Can show fractions, decimals, or mixed numbers. Order doesn't matter. Empty array shows no ticks."
			),
		segments: z
			.array(Segment)
			.describe(
				"Colored bars above the number line showing grouped segments. Useful for division by fractions (e.g., how many 1/2s in 2?). Segments can overlap with staggered display."
			)
	})
	.strict()
	.describe(
		"Creates a number line with colored segment groups above it, perfect for visualizing division by fractions and repeated addition of fractional amounts. Shows how many groups of a given size fit within a range. Essential for fraction division concepts like 'how many 1/3s are in 2?' or skip counting by fractions."
	)

export type NumberLineWithFractionGroupsProps = z.infer<typeof NumberLineWithFractionGroupsPropsSchema>

/**
 * This template generates a highly illustrative number line as an SVG graphic,
 * specifically designed to build conceptual understanding of fraction division.
 * It visually answers the question, "How many groups of a certain fraction fit into a whole number?"
 */
export const generateNumberLineWithFractionGroups: WidgetGenerator<typeof NumberLineWithFractionGroupsPropsSchema> = (
	data
) => {
	const { width, height, min, max, ticks, segments } = data
	const padding = { horizontal: 20, vertical: 40 }
	const chartWidth = width - 2 * padding.horizontal
	const yPos = height / 2

	if (min >= max) return `<svg width="${width}" height="${height}"></svg>`
	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => padding.horizontal + (val - min) * scale

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	includePointX(ext, padding.horizontal)
	includePointX(ext, width - padding.horizontal)
	svg += `<line x1="${padding.horizontal}" y1="${yPos}" x2="${width - padding.horizontal}" y2="${yPos}" stroke="#333333" stroke-width="1.5"/>`

	for (const t of ticks) {
		const x = toSvgX(t.value)
		includePointX(ext, x)
		const tickHeight = t.isMajor ? 8 : 4
		svg += `<line x1="${x}" y1="${yPos - tickHeight}" x2="${x}" y2="${yPos + tickHeight}" stroke="#333333"/>`
		if (t.label !== "") {
			svg += `<text x="${x}" y="${yPos + 25}" fill="#333333" text-anchor="middle">${t.label}</text>`
			includeText(ext, x, t.label, "middle", 7)
		}
	}

	// Segments
	segments.forEach((s, i) => {
		const startPos = toSvgX(s.start)
		const endPos = toSvgX(s.end)
		const segmentWidth = endPos - startPos
		const segmentHeight = 20
		// Stagger segments vertically to avoid overlap if needed
		const segmentY = yPos - segmentHeight / 2 - (i % 2) * (segmentHeight + 2)

		// Track the horizontal extent of the segment
		includePointX(ext, startPos)
		includePointX(ext, endPos)

		svg += `<rect x="${startPos}" y="${segmentY}" width="${segmentWidth}" height="${segmentHeight}" fill="${s.color}" fill-opacity="0.7" stroke="#333333" stroke-width="0.5"/>`
		if (s.label !== null) {
			const textColor = "#FFFFFF" // Assuming dark segment colors
			const textX = startPos + segmentWidth / 2
			svg += `<text x="${textX}" y="${segmentY + segmentHeight / 2}" fill="${textColor}" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${s.label}</text>`
			includeText(ext, textX, s.label, "middle", 7)
		}
	})

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
