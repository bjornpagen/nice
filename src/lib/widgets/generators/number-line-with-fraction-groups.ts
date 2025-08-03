import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties of a tick mark on the number line
const TickMarkSchema = z.object({
	value: z.number().describe("The numerical position of the tick mark."),
	label: z
		.string()
		.optional()
		.describe('The text label for the tick mark (e.g., "0", "1", "3/8"). If omitted, no label is shown.'),
	isMajor: z.boolean().default(false).describe("If true, render as a larger, more prominent tick mark.")
})

// Defines a single labeled, colored segment on the number line
const NumberLineSegmentSchema = z.object({
	start: z.number().describe("The numerical starting value of the segment on the line."),
	end: z.number().describe("The numerical ending value of the segment on the line."),
	color: z.string().describe('A CSS color for the segment (e.g., "#008B8B", "orange").'),
	label: z.string().optional().describe("An optional text label to display with the segment.")
})

// The main Zod schema for the numberLineWithFractionGroups function
export const NumberLineWithFractionGroupsPropsSchema = z
	.object({
		width: z.number().default(500).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(140).describe("The total height of the output SVG container in pixels."),
		min: z.number().describe("The minimum value displayed on the number line."),
		max: z.number().describe("The maximum value displayed on the number line."),
		ticks: z.array(TickMarkSchema).describe("An array of tick mark objects defining their position, label, and style."),
		segments: z
			.array(NumberLineSegmentSchema)
			.optional()
			.describe("An optional array of colored segments to overlay on the number line to represent fractional groups.")
	})
	.describe(
		'This template generates a highly illustrative number line as an SVG graphic, specifically designed to build conceptual understanding of fraction division. It visually answers the question, "How many groups of a certain fraction fit into a whole number?" The generator will render a horizontal number line with a specified range (e.g., 0 to 2). The line is marked with ticks at intervals that can be defined as fractions (e.g., every 1/8). Major ticks are labeled with their values (e.g., "0", "1", "3/8"). The core feature is its ability to overlay distinctly colored segments to represent fractional lengths. For example, it can show one or more segments of length 3/8 starting from zero. This allows a student to see how many "full groups" of a fraction fit within a whole number and to visualize the remainder as a fraction of a group. This template is perfect for questions that bridge the gap between visual models and the abstract algorithm of dividing by a fraction (multiplying by the reciprocal).'
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

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Axis
	svg += `<line x1="${padding.horizontal}" y1="${yPos}" x2="${width - padding.horizontal}" y2="${yPos}" stroke="black" stroke-width="1.5"/>`

	// Ticks
	for (const t of ticks) {
		const x = toSvgX(t.value)
		const tickHeight = t.isMajor ? 8 : 4
		svg += `<line x1="${x}" y1="${yPos - tickHeight}" x2="${x}" y2="${yPos + tickHeight}" stroke="black"/>`
		if (t.label) {
			svg += `<text x="${x}" y="${yPos + 25}" fill="black" text-anchor="middle">${t.label}</text>`
		}
	}

	// Segments
	segments?.forEach((s, i) => {
		const startPos = toSvgX(s.start)
		const endPos = toSvgX(s.end)
		const segmentWidth = endPos - startPos
		const segmentHeight = 20
		// Stagger segments vertically to avoid overlap if needed
		const segmentY = yPos - segmentHeight / 2 - (i % 2) * (segmentHeight + 2)

		svg += `<rect x="${startPos}" y="${segmentY}" width="${segmentWidth}" height="${segmentHeight}" fill="${s.color}" fill-opacity="0.7" stroke="black" stroke-width="0.5"/>`
		if (s.label) {
			const textColor = "white" // Assuming dark segment colors
			svg += `<text x="${startPos + segmentWidth / 2}" y="${segmentY + segmentHeight / 2}" fill="${textColor}" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${s.label}</text>`
		}
	})

	svg += "</svg>"
	return svg
}
