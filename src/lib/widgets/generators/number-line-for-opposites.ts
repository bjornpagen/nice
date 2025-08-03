import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the numberLineForOpposites function
export const NumberLineForOppositesPropsSchema = z
	.object({
		width: z.number().optional().default(460).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(90).describe("The total height of the output SVG container in pixels."),
		maxAbsValue: z
			.number()
			.describe("The maximum absolute value for the number line bounds (e.g., 10 for a value of 8.3)."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		value: z
			.number()
			.describe(
				"The absolute value of the number whose opposite is being illustrated (e.g., for -8.3 and 8.3, the value is 8.3)."
			),
		positiveLabel: z
			.union([z.string(), z.boolean()])
			.optional()
			.default(true)
			.describe(
				"The label for the positive point. Can be a string, `true` (use numeric value), or `false` (hide label)."
			),
		negativeLabel: z
			.union([z.string(), z.boolean()])
			.optional()
			.default(true)
			.describe(
				"The label for the negative point. Can be a string, `true` (use numeric value), or `false` (hide label)."
			),
		showArrows: z.boolean().optional().default(true).describe("If true, shows symmetric arrows from 0 to each point.")
	})
	.describe(
		'This template is specifically designed to generate an SVG diagram that illustrates the concept of opposite numbers. The diagram\'s purpose is to visually reinforce that opposite numbers are equidistant from zero. The generator will create a horizontal number line that is always centered on 0. Based on a single input value, it will automatically plot two points: one at the negative value (-value) and one at the positive value (+value). To emphasize the relationship, the template will draw two symmetric arrows originating from 0 and pointing to each of the two points. The points can be labeled differently; for example, one can show its numerical value (e.g., "8.3") while its opposite is labeled with a question mark, prompting the student to identify it. This creates a clear, pedagogical diagram for questions about number opposites.'
	)

export type NumberLineForOppositesProps = z.infer<typeof NumberLineForOppositesPropsSchema>

/**
 * This template is specifically designed to generate an SVG diagram that illustrates
 * the concept of opposite numbers. The diagram's purpose is to visually reinforce
 * that opposite numbers are equidistant from zero.
 */
export const generateNumberLineForOpposites: WidgetGenerator<typeof NumberLineForOppositesPropsSchema> = (data) => {
	const { width, height, maxAbsValue, tickInterval, value, positiveLabel, negativeLabel, showArrows } = data
	const min = -maxAbsValue
	const max = maxAbsValue
	const padding = 20
	const chartWidth = width - 2 * padding
	const yPos = height / 2 + 10

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => padding + (val - min) * scale

	const posPos = toSvgX(value)
	const negPos = toSvgX(-value)
	const zeroPos = toSvgX(0)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`

	// Axis and Ticks
	svg += `<line x1="${padding}" y1="${yPos}" x2="${width - padding}" y2="${yPos}" stroke="black" stroke-width="1.5"/>`
	for (let t = min; t <= max; t += tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="black"/>`
		svg += `<text x="${x}" y="${yPos + 20}" fill="black" text-anchor="middle">${t}</text>`
	}

	// Arrows
	if (showArrows) {
		svg += `<line x1="${zeroPos}" y1="${yPos - 10}" x2="${posPos}" y2="${yPos - 10}" stroke="black" marker-end="url(#arrowhead)"/>`
		svg += `<line x1="${zeroPos}" y1="${yPos - 10}" x2="${negPos}" y2="${yPos - 10}" stroke="black" marker-end="url(#arrowhead)"/>`
	}

	// Points
	svg += `<circle cx="${posPos}" cy="${yPos}" r="5" fill="black"/>`
	svg += `<circle cx="${negPos}" cy="${yPos}" r="5" fill="black"/>`

	// Labels
	const posLab = positiveLabel === true ? String(value) : (positiveLabel ?? "")
	const negLab = negativeLabel === true ? String(-value) : (negativeLabel ?? "")
	if (posLab)
		svg += `<text x="${posPos}" y="${yPos - 25}" fill="black" text-anchor="middle" font-weight="bold">${posLab}</text>`
	if (negLab)
		svg += `<text x="${negPos}" y="${yPos - 25}" fill="black" text-anchor="middle" font-weight="bold">${negLab}</text>`

	svg += "</svg>"
	return svg
}
