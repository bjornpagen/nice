import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the eight possible positions for an angle at an intersection
const AnglePositionSchema = z.enum(["topLeft", "topRight", "bottomLeft", "bottomRight"])

// Defines a label for a specific angle in the diagram
const AngleLabelSchema = z.object({
	intersection: z.enum(["top", "bottom"]).describe("Which of the two intersections the angle is at."),
	position: AnglePositionSchema.describe("The position of the angle within that intersection."),
	label: z.string().describe('The text or mathematical label for the angle (e.g., "x", "34°", "2x + 10").'),
	color: z
		.string()
		.optional()
		.default("blue")
		.describe('An optional CSS color for the angle\'s highlighting arc (e.g., "#1E90FF").')
})

// The main Zod schema for the parallelLinesTransversal function
export const ParallelLinesTransversalPropsSchema = z
	.object({
		width: z.number().optional().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(280).describe("The total height of the output SVG container in pixels."),
		linesAngle: z
			.number()
			.optional()
			.default(0)
			.describe("The rotation angle of the two parallel lines in degrees (0 is horizontal)."),
		transversalAngle: z
			.number()
			.optional()
			.default(60)
			.describe("The angle of the transversal line in degrees, relative to the horizontal."),
		labels: z.array(AngleLabelSchema).describe("An array of angle labels to be drawn on the diagram.")
	})
	.describe(
		"This template generates an SVG diagram depicting two parallel lines being intersected by a transversal line. It creates eight distinct angles, any of which can be labeled with a value, variable, or expression. This is ideal for problems involving corresponding, alternate interior, and other angle relationships."
	)

export type ParallelLinesTransversalProps = z.infer<typeof ParallelLinesTransversalPropsSchema>

/**
 * This template generates an SVG diagram depicting two parallel lines
 * being intersected by a transversal line.
 */
export const generateParallelLinesTransversal: WidgetGenerator<typeof ParallelLinesTransversalPropsSchema> = (data) => {
	const { width, height, linesAngle, transversalAngle, labels } = data
	const toRad = (deg: number) => (deg * Math.PI) / 180

	const centerX = width / 2
	const centerY = height / 2
	const lineSeparation = height / 4

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`

	// Define a group for the parallel lines to rotate them together
	svg += `<g transform="rotate(${linesAngle} ${centerX} ${centerY})">`
	svg += `<line x1="0" y1="${centerY - lineSeparation / 2}" x2="${width}" y2="${centerY - lineSeparation / 2}" stroke="black" stroke-width="2"/>`
	svg += `<line x1="0" y1="${centerY + lineSeparation / 2}" x2="${width}" y2="${centerY + lineSeparation / 2}" stroke="black" stroke-width="2"/>`
	svg += "</g>"

	// Define a group for the transversal line
	const transversalLength = Math.sqrt(width * width + height * height)
	svg += `<g transform="rotate(${transversalAngle} ${centerX} ${centerY})">`
	svg += `<line x1="${centerX - transversalLength / 2}" y1="${centerY}" x2="${centerX + transversalLength / 2}" y2="${centerY}" stroke="black" stroke-width="2"/>`
	svg += "</g>"

	// Helper to find intersection points
	const findIntersection = (lineY: number) => {
		const m1 = Math.tan(toRad(linesAngle))
		const c1 = lineY - m1 * centerX
		const m2 = Math.tan(toRad(transversalAngle))
		const c2 = centerY - m2 * centerX
		if (Math.abs(m1 - m2) < 1e-9) return { x: centerX, y: lineY } // Parallel, should not happen with transversal
		const x = (c2 - c1) / (m1 - m2)
		const y = m1 * x + c1
		return { x, y }
	}

	const topIntersection = findIntersection(centerY - (lineSeparation / 2) * Math.cos(toRad(linesAngle)))
	const bottomIntersection = findIntersection(centerY + (lineSeparation / 2) * Math.cos(toRad(linesAngle)))

	const anglePositions = {
		topLeft: { start: transversalAngle + 180, end: linesAngle + 180 },
		topRight: { start: linesAngle, end: transversalAngle },
		bottomLeft: { start: linesAngle + 180, end: transversalAngle + 180 },
		bottomRight: { start: transversalAngle, end: linesAngle }
	}

	for (const l of labels) {
		const int = l.intersection === "top" ? topIntersection : bottomIntersection
		const angles = anglePositions[l.position]
		if (!angles) continue

		let start = Math.min(angles.start, angles.end)
		let end = Math.max(angles.start, angles.end)
		if (l.position.includes("Right")) {
			;[start, end] = [Math.min(angles.start, angles.end), Math.max(angles.start, angles.end)]
		} else {
			;[start, end] = [Math.max(angles.start, angles.end), Math.min(angles.start, angles.end) + 360]
		}

		const midAngleRad = toRad((start + end) / 2)
		const radius = 25
		const labelRadius = radius + 18

		// Arc
		const startRad = toRad(start)
		const endRad = toRad(end)
		const arcStartX = int.x + radius * Math.cos(startRad)
		const arcStartY = int.y - radius * Math.sin(startRad) // Y is inverted in SVG
		const arcEndX = int.x + radius * Math.cos(endRad)
		const arcEndY = int.y - radius * Math.sin(endRad)
		const largeArcFlag = Math.abs(end - start) > 180 ? 1 : 0
		svg += `<path d="M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${arcEndX} ${arcEndY}" fill="none" stroke="${l.color}" stroke-width="2"/>`

		// Label
		const labelX = int.x + labelRadius * Math.cos(midAngleRad)
		const labelY = int.y - labelRadius * Math.sin(midAngleRad)
		svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle">${l.label}</text>`
	}

	svg += "</svg>"
	return svg
}
