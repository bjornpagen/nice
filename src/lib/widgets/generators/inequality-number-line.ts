import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a boundary point for an inequality range
const InequalityBoundarySchema = z.object({
	value: z.number().describe("The numerical value of the boundary point."),
	type: z
		.enum(["open", "closed"])
		.describe('The type of circle at the boundary: "open" for < or >, "closed" for ≤ or ≥.')
})

// Defines a single continuous range to be graphed on the number line
const InequalityRangeSchema = z.object({
	start: InequalityBoundarySchema.optional().describe(
		"The starting boundary of the range. If omitted, the range extends to negative infinity."
	),
	end: InequalityBoundarySchema.optional().describe(
		"The ending boundary of the range. If omitted, the range extends to positive infinity."
	),
	color: z
		.string()
		.default("rgba(66, 133, 244, 0.7)")
		.describe("The color of the shaded range and its boundary points.")
})

// The main Zod schema for the inequalityNumberLine function
export const InequalityNumberLinePropsSchema = z
	.object({
		width: z.number().default(460).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(80).describe("The total height of the output SVG container in pixels."),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		ranges: z
			.array(InequalityRangeSchema)
			.min(1)
			.describe("An array of one or more inequality ranges to be graphed on the line.")
	})
	.describe(
		"Generates an SVG number line to graph the solution set of one or more inequalities. This widget is ideal for visualizing simple inequalities (e.g., x > 5), compound 'and' inequalities (e.g., -2 < x ≤ 3), and compound 'or' inequalities (e.g., x ≤ 0 or x > 4). It renders a number line with a configurable range and tick marks. For each specified range, it draws a highlighted segment and places circles at the boundary points. The circles can be 'open' (for <, >) or 'closed' (for ≤, ≥), providing a mathematically precise representation of the solution."
	)

export type InequalityNumberLineProps = z.infer<typeof InequalityNumberLinePropsSchema>

/**
 * Generates an SVG number line to graph the solution set of single or compound inequalities,
 * using open/closed circles and shaded regions to represent the solution.
 */
export const generateInequalityNumberLine: WidgetGenerator<typeof InequalityNumberLinePropsSchema> = (data) => {
	const { width, height, min, max, tickInterval, ranges } = data
	const padding = { horizontal: 20, vertical: 20 }
	const chartWidth = width - 2 * padding.horizontal
	const yPos = height / 2

	if (min >= max) {
		return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="red">Error: min must be less than max.</text></svg>`
	}

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => padding.horizontal + (val - min) * scale

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Axis and Ticks
	svg += `<line x1="${padding.horizontal}" y1="${yPos}" x2="${width - padding.horizontal}" y2="${yPos}" stroke="black" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
	svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black"/></marker></defs>`

	for (let t = min; t <= max; t += tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="black"/>`
		svg += `<text x="${x}" y="${yPos + 20}" fill="black" text-anchor="middle">${t}</text>`
	}

	// Ranges
	for (const r of ranges) {
		const startPos = r.start ? toSvgX(r.start.value) : padding.horizontal
		const endPos = r.end ? toSvgX(r.end.value) : width - padding.horizontal
		svg += `<line x1="${startPos}" y1="${yPos}" x2="${endPos}" y2="${yPos}" stroke="${r.color}" stroke-width="5" stroke-linecap="butt"/>`

		// Boundary circles
		if (r.start) {
			const fill = r.start.type === "closed" ? r.color : "white"
			svg += `<circle cx="${startPos}" cy="${yPos}" r="5" fill="${fill}" stroke="${r.color}" stroke-width="1.5"/>`
		}
		if (r.end) {
			const fill = r.end.type === "closed" ? r.color : "white"
			svg += `<circle cx="${endPos}" cy="${yPos}" r="5" fill="${fill}" stroke="${r.color}" stroke-width="1.5"/>`
		}
	}

	svg += "</svg>"
	return svg
}
