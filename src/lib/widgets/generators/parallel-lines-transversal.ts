import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the eight possible positions for an angle at an intersection
const AnglePositionSchema = z.enum(["topLeft", "topRight", "bottomLeft", "bottomRight"])

// Defines a label for a specific angle in the diagram
const AngleLabelSchema = z
	.object({
		intersection: z.enum(["top", "bottom"]).describe("Which of the two intersections the angle is at."),
		position: AnglePositionSchema.describe("The position of the angle within that intersection."),
		label: z.string().describe('The text or mathematical label for the angle (e.g., "x", "34°", "2x + 10").'),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "blue")
			.describe('An optional CSS color for the angle\'s highlighting arc (e.g., "#1E90FF").')
	})
	.strict()

// The main Zod schema for the parallelLinesTransversal function
export const ParallelLinesTransversalPropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 320)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 280)
			.describe("The total height of the output SVG container in pixels."),
		linesAngle: z
			.number()
			.nullable()
			.transform((val) => val ?? 0)
			.describe("The rotation angle of the two parallel lines in degrees (0 is horizontal)."),
		transversalAngle: z
			.number()
			.nullable()
			.transform((val) => val ?? 60)
			.describe("The angle of the transversal line in degrees, relative to the horizontal."),
		labels: z.array(AngleLabelSchema).describe("An array of angle labels to be drawn on the diagram.")
	})
	.strict()
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

	// Helper to find intersection points using correct geometric transformation
	const findIntersection = (intersectionType: "top" | "bottom") => {
		const linesAngleRad = toRad(linesAngle)
		const transAngleRad = toRad(transversalAngle)

		// Handle vertical lines where tan() is undefined
		const isLinesVertical = Math.abs(Math.cos(linesAngleRad)) < 1e-9
		const isTransVertical = Math.abs(Math.cos(transAngleRad)) < 1e-9

		// The transversal always passes through the center
		const m2 = isTransVertical ? Number.POSITIVE_INFINITY : Math.tan(transAngleRad)
		const c2 = isTransVertical ? centerX : centerY - m2 * centerX

		// Calculate a point on the rotated parallel line
		const separation = intersectionType === "top" ? -lineSeparation / 2 : lineSeparation / 2
		const pointOnLine = {
			x: centerX - separation * Math.sin(linesAngleRad),
			y: centerY + separation * Math.cos(linesAngleRad)
		}

		const m1 = isLinesVertical ? Number.POSITIVE_INFINITY : Math.tan(linesAngleRad)
		const c1 = isLinesVertical ? pointOnLine.x : pointOnLine.y - m1 * pointOnLine.x

		// Solve for intersection
		let x: number
		let y: number
		if (isLinesVertical) {
			x = c1
			y = m2 * x + c2
		} else if (isTransVertical) {
			x = c2
			y = m1 * x + c1
		} else {
			if (Math.abs(m1 - m2) < 1e-9) return { x: centerX, y: centerY } // Parallel case
			x = (c2 - c1) / (m1 - m2)
			y = m1 * x + c1
		}
		return { x, y }
	}

	const topIntersection = findIntersection("top")
	const bottomIntersection = findIntersection("bottom")

	// Define explicit angle ranges for each position to ensure interior angles
	const positionAngles = {
		topRight: { start: linesAngle, end: transversalAngle },
		topLeft: { start: transversalAngle, end: linesAngle + 180 },
		bottomLeft: { start: linesAngle + 180, end: transversalAngle + 180 },
		bottomRight: { start: transversalAngle + 180, end: linesAngle + 360 }
	}

	for (const l of labels) {
		const int = l.intersection === "top" ? topIntersection : bottomIntersection
		const angles = positionAngles[l.position]
		if (!angles) continue

		let startDeg = angles.start
		let endDeg = angles.end

		// Normalize angles to ensure we draw the interior angle (< 180°)
		if (endDeg < startDeg) {
			endDeg += 360
		}
		if (endDeg - startDeg > 180) {
			// Swap to get the interior angle
			const temp = startDeg + 360
			startDeg = endDeg
			endDeg = temp
		}

		const startRad = toRad(startDeg)
		const endRad = toRad(endDeg)
		const midAngleRad = (startRad + endRad) / 2

		const radius = 25
		const labelRadius = radius + 18

		const arcStartX = int.x + radius * Math.cos(startRad)
		const arcStartY = int.y + radius * Math.sin(startRad)
		const arcEndX = int.x + radius * Math.cos(endRad)
		const arcEndY = int.y + radius * Math.sin(endRad)

		// Always use interior angle (large-arc-flag = 0)
		const sweepFlag = 1
		const largeArcFlag = 0

		svg += `<path d="M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY}" fill="none" stroke="${l.color}" stroke-width="2"/>`

		const labelX = int.x + labelRadius * Math.cos(midAngleRad)
		const labelY = int.y + labelRadius * Math.sin(midAngleRad)
		svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle">${l.label}</text>`
	}

	svg += "</svg>"
	return svg
}
