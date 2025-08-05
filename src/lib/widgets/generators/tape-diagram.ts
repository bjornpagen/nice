import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the tapeDiagram function
export const TapeDiagramPropsSchema = z
	.object({
		type: z.literal("tapeDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 320)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200)
			.describe("The total height of the output SVG container in pixels."),
		// INLINED: The TapeSchema definition is now directly inside the topTape property.
		topTape: z
			.object({
				label: z.string().describe('The text label for this tape (e.g., "Teeth per larger gear").'),
				segments: z
					.array(
						z
							.object({
								label: z.string().describe('The text label to display inside this segment (e.g., "10", "w").'),
								length: z
									.number()
									.positive()
									.describe("The numerical length of the segment for proportional rendering.")
							})
							.strict()
					)
					.min(1)
					.describe("An array of segment objects that make up this tape."),
				color: z
					.string()
					.nullable()
					.transform((val) => val ?? "rgba(66, 133, 244, 0.6)")
					.describe("The CSS fill color for the tape segments.")
			})
			.strict()
			.describe("Configuration for the upper tape."),
		// INLINED: The TapeSchema definition is now directly inside the bottomTape property.
		bottomTape: z
			.object({
				label: z.string().describe('The text label for this tape (e.g., "Teeth per larger gear").'),
				segments: z
					.array(
						z
							.object({
								label: z.string().describe('The text label to display inside this segment (e.g., "10", "w").'),
								length: z
									.number()
									.positive()
									.describe("The numerical length of the segment for proportional rendering.")
							})
							.strict()
					)
					.min(1)
					.describe("An array of segment objects that make up this tape."),
				color: z
					.string()
					.nullable()
					.transform((val) => val ?? "rgba(66, 133, 244, 0.6)")
					.describe("The CSS fill color for the tape segments.")
			})
			.strict()
			.describe("Configuration for the lower tape."),
		showTotalBracket: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, displays a bracket and label for the total number of segments."),
		totalLabel: z
			.string()
			.nullable()
			.transform((val) => val ?? "Total")
			.describe("The text label for the total bracket, if shown.")
	})
	.strict()
	.describe(
		'Generates a "tape diagram" or "bar model" as an SVG graphic to represent part-whole relationships. This widget is exceptionally useful for modeling and solving word problems involving ratios or algebraic equations. It renders one or two tapes, each composed of proportionally sized segments that can be labeled with numbers or variables. By visually aligning tapes or their segments, it translates abstract numerical relationships into a concrete, geometric form, making concepts like "3x = 15" intuitive.'
	)

export type TapeDiagramProps = z.infer<typeof TapeDiagramPropsSchema>

/**
 * Generates a "tape diagram" (bar model) to visually represent part-whole relationships,
 * perfect for modeling ratios and simple algebraic equations.
 */
export const generateTapeDiagram: WidgetGenerator<typeof TapeDiagramPropsSchema> = (data) => {
	const { width, height, topTape, bottomTape, showTotalBracket, totalLabel } = data
	const padding = 20
	const chartWidth = width - 2 * padding
	const tapeHeight = 30
	const tapeGap = 40

	const topTotalLength = topTape.segments.reduce((sum, s) => sum + s.length, 0)
	const bottomTotalLength = bottomTape.segments.reduce((sum, s) => sum + s.length, 0)
	const maxTotalLength = Math.max(topTotalLength, bottomTotalLength)

	if (maxTotalLength <= 0) return `<svg width="${width}" height="${height}"></svg>`
	const scale = chartWidth / maxTotalLength

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	const drawTape = (tape: typeof topTape, yPos: number, totalLength: number) => {
		svg += `<text x="${padding}" y="${yPos - 5}" fill="black" text-anchor="start" font-weight="bold">${tape.label}</text>`
		let currentX = padding
		const tapeWidth = totalLength * scale
		// Draw a thin background line for the full tape length for alignment
		svg += `<rect x="${padding}" y="${yPos}" width="${tapeWidth}" height="${tapeHeight}" fill="#f0f0f0" stroke="none"/>`

		for (const s of tape.segments) {
			const segmentWidth = s.length * scale
			svg += `<rect x="${currentX}" y="${yPos}" width="${segmentWidth}" height="${tapeHeight}" fill="${tape.color}" stroke="black"/>`
			svg += `<text x="${currentX + segmentWidth / 2}" y="${yPos + tapeHeight / 2}" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${s.label}</text>`
			currentX += segmentWidth
		}
	}

	const topY = padding + 20
	drawTape(topTape, topY, topTotalLength)

	const bottomY = topY + tapeHeight + tapeGap
	drawTape(bottomTape, bottomY, bottomTotalLength)

	if (showTotalBracket) {
		const bracketY = bottomY + tapeHeight + 20
		const bracketWidth = chartWidth
		svg += `<line x1="${padding}" y1="${bracketY}" x2="${padding + bracketWidth}" y2="${bracketY}" stroke="black"/>`
		svg += `<line x1="${padding}" y1="${bracketY - 5}" x2="${padding}" y2="${bracketY + 5}" stroke="black"/>`
		svg += `<line x1="${padding + bracketWidth}" y1="${bracketY - 5}" x2="${padding + bracketWidth}" y2="${bracketY + 5}" stroke="black"/>`
		svg += `<text x="${padding + bracketWidth / 2}" y="${bracketY + 15}" fill="black" text-anchor="middle" font-weight="bold">${totalLabel}</text>`
	}

	svg += "</svg>"
	return svg
}
