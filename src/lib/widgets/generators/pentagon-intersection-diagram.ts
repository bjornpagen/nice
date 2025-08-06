import * as errors from "@superbuilders/errors"
import { z } from "zod"

// Exact arc definition matching Khan Academy SVG format
const KhanArcSchema = z
	.object({
		startX: z.number().describe("The x-coordinate where the arc starts (M command)."),
		startY: z.number().describe("The y-coordinate where the arc starts (M command)."),
		rx: z.number().describe("The x-radius of the elliptical arc."),
		ry: z.number().describe("The y-radius of the elliptical arc."),
		xAxisRotation: z.number().describe("The rotation of the arc's x-axis in degrees."),
		largeArcFlag: z.number().min(0).max(1).describe("Large arc flag (0 or 1)."),
		sweepFlag: z.number().min(0).max(1).describe("Sweep flag (0 or 1)."),
		endDeltaX: z.number().describe("The relative x-distance to the arc's end point."),
		endDeltaY: z.number().describe("The relative y-distance to the arc's end point."),
		label: z.string().describe('The text label for the angle (e.g., "100°", "x°").'),
		color: z.string().describe("The stroke color of the arc.")
	})
	.strict()

// Pentagon points definition
const PentagonPointSchema = z
	.object({
		id: z.string().describe("Unique identifier for the point."),
		x: z.number().describe("The x-coordinate of the point."),
		y: z.number().describe("The y-coordinate of the point.")
	})
	.strict()

// Main schema for pentagon intersection diagram
export const PentagonIntersectionDiagramPropsSchema = z
	.object({
		type: z.literal("pentagonIntersectionDiagram"),
		width: z
			.number()
			.positive()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The width of the diagram canvas in pixels."),
		height: z
			.number()
			.positive()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The height of the diagram canvas in pixels."),
		pentagonPoints: z.array(PentagonPointSchema).length(5).describe("The five vertices of the pentagon in order."),
		intersectionLines: z
			.array(
				z.object({
					from: z.string().describe("The starting point ID."),
					to: z.string().describe("The ending point ID.")
				})
			)
			.describe("The internal lines that create intersections."),
		khanArcs: z.array(KhanArcSchema).describe("The angle arcs using exact Khan Academy SVG arc parameters.")
	})
	.strict()

export type PentagonIntersectionDiagramProps = z.infer<typeof PentagonIntersectionDiagramPropsSchema>

export function generatePentagonIntersectionDiagram(props: PentagonIntersectionDiagramProps): string {
	const result = errors.trySync(() => PentagonIntersectionDiagramPropsSchema.parse(props))
	if (result.error) {
		throw errors.wrap(result.error, "pentagon intersection diagram props validation failed")
	}

	const { width, height, pentagonPoints, intersectionLines, khanArcs } = result.data

	// Calculate viewBox with padding
	const allX = pentagonPoints.map((p) => p.x)
	const allY = pentagonPoints.map((p) => p.y)
	const minX = Math.min(...allX)
	const maxX = Math.max(...allX)
	const minY = Math.min(...allY)
	const maxY = Math.max(...allY)

	const padding = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 20)
	const viewBoxX = minX - padding
	const viewBoxY = minY - padding
	const viewBoxWidth = maxX - minX + 2 * padding
	const viewBoxHeight = maxY - minY + 2 * padding

	let svg = `<svg width="${width}" height="${height}" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Draw pentagon perimeter
	for (let i = 0; i < pentagonPoints.length; i++) {
		const current = pentagonPoints[i]
		const next = pentagonPoints[(i + 1) % pentagonPoints.length]

		if (!current || !next) {
			throw errors.new(`pentagon point missing at index ${i}`)
		}

		svg += `<line x1="${current.x}" y1="${current.y}" x2="${next.x}" y2="${next.y}" stroke="black" stroke-width="2"/>`
	}

	// Draw intersection lines
	for (const line of intersectionLines) {
		const fromPoint = pentagonPoints.find((p) => p.id === line.from)
		const toPoint = pentagonPoints.find((p) => p.id === line.to)

		if (!fromPoint) {
			throw errors.new(`point not found: ${line.from}`)
		}
		if (!toPoint) {
			throw errors.new(`point not found: ${line.to}`)
		}

		svg += `<line x1="${fromPoint.x}" y1="${fromPoint.y}" x2="${toPoint.x}" y2="${toPoint.y}" stroke="black" stroke-width="2"/>`
	}

	// Draw Khan Academy style arcs using exact SVG arc parameters
	for (const arc of khanArcs) {
		// Create the exact SVG path using Khan Academy's arc format
		svg += `<path d="M ${arc.startX} ${arc.startY}a${arc.rx} ${arc.ry} ${arc.xAxisRotation} ${arc.largeArcFlag} ${arc.sweepFlag} ${arc.endDeltaX} ${arc.endDeltaY}" fill="none" stroke="${arc.color}" stroke-width="2.5"/>`

		// Calculate label position at the center of the arc but just outside its edge
		// Find the center point of the arc path
		const arcCenterX = arc.startX + arc.endDeltaX / 2
		const arcCenterY = arc.startY + arc.endDeltaY / 2

		// Calculate the perpendicular direction outward from the arc
		// This is perpendicular to the line from start to end of arc
		const perpX = -arc.endDeltaY / Math.sqrt(arc.endDeltaX * arc.endDeltaX + arc.endDeltaY * arc.endDeltaY)
		const perpY = arc.endDeltaX / Math.sqrt(arc.endDeltaX * arc.endDeltaX + arc.endDeltaY * arc.endDeltaY)

		// Position label just outside the arc edge (radius + small offset)
		const labelOffset = arc.rx + 8 // Arc radius plus small gap
		const labelX = arcCenterX + perpX * labelOffset
		const labelY = arcCenterY + perpY * labelOffset

		svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14">${arc.label}</text>`
	}

	// Draw pentagon points
	for (const point of pentagonPoints) {
		svg += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="black"/>`
	}

	svg += "</svg>"
	return svg
}
