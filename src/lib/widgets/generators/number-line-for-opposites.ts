import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

// strict schema with no nullables or fallbacks
export const NumberLineForOppositesPropsSchema = z
	.object({
		type: z
			.literal("numberLineForOpposites")
			.describe("identifies this as a number line for opposites widget showing positive/negative pairs."),
		width: z
			.number()
			.positive()
			.describe("total width of the number line in pixels (e.g., 600, 700, 500). must accommodate labels and arrows."),
		height: z
			.number()
			.positive()
			.describe(
				"total height of the widget in pixels (e.g., 120, 150, 100). includes space for arrows above the line."
			),
		maxAbsValue: z
			.number()
			.describe(
				"maximum absolute value shown on the number line (e.g., 10, 8, 5). line ranges from -maxAbsValue to +maxAbsValue, centered at 0."
			),
		tickInterval: z
			.number()
			.describe("spacing between tick marks (e.g., 1, 2, 0.5). should evenly divide maxAbsValue for symmetry."),
		value: z
			.number()
			.describe(
				"the number whose opposite is being illustrated (e.g., 5, -3, 7.5). both this value and its opposite (-value) are marked."
			),
		positiveLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"label for the positive value (e.g., '5', '+5', 'a', null). null hides the label. positioned near the positive point."
			),
		negativeLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"label for the negative value (e.g., '-5', 'opposite of 5', '-a', null). null hides the label. positioned near the negative point."
			),
		showArrows: z
			.boolean()
			.describe(
				"whether to show arrows from each value to zero, emphasizing equal distance. true highlights the 'same distance from zero' concept."
			)
	})
	.strict()
	.describe(
		"creates a centered number line showing a number and its opposite, demonstrating that opposites are equidistant from zero. essential for teaching additive inverses, absolute value concepts, and the symmetry of the number line around zero."
	)

export type NumberLineForOppositesProps = z.infer<typeof NumberLineForOppositesPropsSchema>

export const generateNumberLineForOpposites: WidgetGenerator<typeof NumberLineForOppositesPropsSchema> = (data) => {
	const { width, height, maxAbsValue, tickInterval, value, positiveLabel, negativeLabel, showArrows } = data
	const min = -maxAbsValue
	const max = maxAbsValue
	const chartWidth = width - 2 * PADDING
	const yPos = height / 2 + 10

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => PADDING + (val - min) * scale

	// always plot the negative and positive of the absolute magnitude
	const magnitude = Math.abs(value)
	const positiveValue = magnitude
	const negativeValue = -magnitude

	const posPos = toSvgX(positiveValue)
	const negPos = toSvgX(negativeValue)
	const zeroPos = toSvgX(0)

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`

	// axis and ticks
	// Track the main line endpoints
	includePointX(ext, PADDING)
	includePointX(ext, width - PADDING)
	svg += `<line x1="${PADDING}" y1="${yPos}" x2="${width - PADDING}" y2="${yPos}" stroke="black" stroke-width="1.5"/>`
	for (let t = min; t <= max; t += tickInterval) {
		const x = toSvgX(t)
		includePointX(ext, x)
		svg += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="black"/>`
		svg += `<text x="${x}" y="${yPos + 20}" fill="black" text-anchor="middle">${t}</text>`
		includeText(ext, x, String(t), "middle", 7)
	}

	if (showArrows) {
		const arrowY = yPos - 10
		includePointX(ext, zeroPos)
		includePointX(ext, posPos)
		includePointX(ext, negPos)
		svg += `<line x1="${zeroPos}" y1="${arrowY}" x2="${posPos}" y2="${arrowY}" stroke="black" marker-end="url(#arrowhead)"/>`
		svg += `<line x1="${zeroPos}" y1="${arrowY}" x2="${negPos}" y2="${arrowY}" stroke="black" marker-end="url(#arrowhead)"/>`
	}

	includePointX(ext, posPos)
	includePointX(ext, negPos)
	svg += `<circle cx="${posPos}" cy="${yPos}" r="5" fill="black"/>`
	svg += `<circle cx="${negPos}" cy="${yPos}" r="5" fill="black"/>`

	const posLab = positiveLabel
	const negLab = negativeLabel
	if (posLab !== null) {
		svg += `<text x="${posPos}" y="${yPos - 25}" fill="black" text-anchor="middle" font-weight="bold">${posLab}</text>`
		includeText(ext, posPos, posLab, "middle", 7)
	}
	if (negLab !== null) {
		svg += `<text x="${negPos}" y="${yPos - 25}" fill="black" text-anchor="middle" font-weight="bold">${negLab}</text>`
		includeText(ext, negPos, negLab, "middle", 7)
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
