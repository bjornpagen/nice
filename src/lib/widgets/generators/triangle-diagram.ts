import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Error constants
export const ErrInvalidSideVertexCount = errors.new("side vertices must contain exactly 2 point IDs")
export const ErrInvalidAngleVertexCount = errors.new("angle vertices must contain exactly 3 point IDs")

// The main Zod schema for the triangleDiagram widget.
export const TriangleDiagramPropsSchema = z
	.object({
		type: z.literal("triangleDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total height of the output SVG container in pixels."),
		points: z
			.array(
				z
					.object({
						id: z.string().describe("A unique identifier for this point (e.g., 'A', 'B', 'V')."),
						x: z.number().describe("The horizontal coordinate of the point."),
						y: z.number().describe("The vertical coordinate of the point."),
						label: z.string().nullable().describe("An optional text label to display near the point.")
					})
					.strict()
			)
			.min(3)
			.describe("An array of all vertices to be used in the diagram."),
		sides: z
			.array(
				z
					.object({
						vertices: z
							.array(z.string())
							.describe("An array of exactly two point `id`s that form the side. Must contain exactly 2 elements."),
						label: z.string().nullable().describe("A label for the side's length (e.g., '5', 'x', '√74')."),
						tickMarks: z
							.number()
							.int()
							.min(0)
							.nullable()
							.transform((val) => val ?? 0)
							.describe("The number of tick marks to display on the side to indicate congruence.")
					})
					.strict()
			)
			.nullable()
			.describe("Optional definitions for the triangle's sides, including labels and tick marks."),
		angles: z
			.array(
				z
					.object({
						vertices: z
							.array(z.string())
							.describe(
								"An array of exactly three point `id`s in the order [pointOnSide1, vertex, pointOnSide2]. Must contain exactly 3 elements."
							),
						label: z.string().nullable().describe('The text label for the angle (e.g., "x", "30°", "θ").'),
						color: z
							.string()
							.nullable()
							.transform((val) => val ?? "rgba(217, 95, 79, 0.8)")
							.describe("The color of the angle's arc marker."),
						radius: z
							.number()
							.nullable()
							.transform((val) => val ?? 25)
							.describe("The radius of the angle arc in pixels."),
						isRightAngle: z
							.boolean()
							.describe("If true, displays a square marker instead of a curved arc to indicate a 90° angle."),
						showArc: z.boolean().describe("If true, displays the angle arc marker. If false, only the label is shown.")
					})
					.strict()
			)
			.nullable()
			.describe("Optional definitions for angles to be highlighted and labeled."),
		internalLines: z
			.array(
				z
					.object({
						from: z.string().describe("The vertex `id` where the line starts."),
						to: z.string().describe("The vertex `id` where the line ends."),
						style: z
							.enum(["solid", "dashed", "dotted"])
							.nullable()
							.transform((val) => val ?? "solid")
							.describe("The style of the line.")
					})
					.strict()
			)
			.nullable()
			.describe("Optional internal lines like altitudes."),
		shadedRegions: z
			.array(
				z
					.object({
						vertices: z
							.array(z.string())
							.min(3)
							.describe("An ordered array of vertex `id`s that define the region to be shaded."),
						color: z
							.string()
							.describe(
								"The CSS fill color for the region, supporting rgba for transparency (e.g., 'rgba(40, 174, 123, 0.2)')."
							)
					})
					.strict()
			)
			.nullable()
			.describe("Optional shaded sub-regions.")
	})
	.strict()
	.describe(
		"Generates a versatile SVG diagram of a triangle, ideal for geometry problems involving missing angles or sides, the Pythagorean theorem, and other triangle properties. It supports labeling sides and angles, indicating right angles and side congruence, drawing internal lines like altitudes, and shading sub-regions."
	)

export type TriangleDiagramProps = z.infer<typeof TriangleDiagramPropsSchema>

/**
 * Generates a versatile diagram of a triangle and its components.
 * Ideal for a wide range of geometry problems.
 */
export const generateTriangleDiagram: WidgetGenerator<typeof TriangleDiagramPropsSchema> = (props) => {
	const { width, height, points, sides, angles, internalLines, shadedRegions } = props

	const padding = 20
	const minX = Math.min(...points.map((p) => p.x)) - padding
	const maxX = Math.max(...points.map((p) => p.x)) + padding
	const minY = Math.min(...points.map((p) => p.y)) - padding
	const maxY = Math.max(...points.map((p) => p.y)) + padding

	let svg = `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	const pointMap = new Map(points.map((p) => [p.id, p]))

	// Layer 1: Shaded Regions (drawn first to be in the background)
	if (shadedRegions) {
		for (const region of shadedRegions) {
			const regionPoints = region.vertices
				.map((id) => pointMap.get(id))
				.filter((p): p is NonNullable<typeof p> => p !== undefined)
			if (regionPoints.length < 3) continue
			const pointsStr = regionPoints.map((p) => `${p.x},${p.y}`).join(" ")
			svg += `<polygon points="${pointsStr}" fill="${region.color}" stroke="none"/>`
		}
	}

	// Layer 2: Main Triangle Outline (assumes first 3 points form the main triangle)
	const mainTrianglePoints = points
		.slice(0, 3)
		.map((p) => `${p.x},${p.y}`)
		.join(" ")
	svg += `<polygon points="${mainTrianglePoints}" fill="none" stroke="black" stroke-width="2"/>`

	// Layer 3: Internal Lines
	if (internalLines) {
		for (const line of internalLines) {
			const from = pointMap.get(line.from)
			const to = pointMap.get(line.to)
			if (!from || !to) continue
			let dash = ""
			if (line.style === "dashed") {
				dash = 'stroke-dasharray="4 3"'
			} else if (line.style === "dotted") {
				dash = 'stroke-dasharray="2 4"'
			}
			svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-width="1.5" ${dash}/>`
		}
	}

	// Layer 4: Angle Markers
	if (angles) {
		for (const angle of angles) {
			// Validate vertex count
			if (angle.vertices.length !== 3) {
				throw errors.wrap(ErrInvalidAngleVertexCount, `expected 3 vertices, got ${angle.vertices.length}`)
			}

			// Check that array elements exist before accessing
			const v0 = angle.vertices[0]
			const v1 = angle.vertices[1]
			const v2 = angle.vertices[2]
			if (!v0 || !v1 || !v2) continue

			const p1 = pointMap.get(v0)
			const vertex = pointMap.get(v1)
			const p2 = pointMap.get(v2)
			if (!p1 || !vertex || !p2) continue

			// Only draw the arc/marker if showArc is true
			if (angle.showArc) {
				if (angle.isRightAngle) {
					const v1x = p1.x - vertex.x
					const v1y = p1.y - vertex.y
					const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
					const u1x = v1x / mag1
					const u1y = v1y / mag1
					const v2x = p2.x - vertex.x
					const v2y = p2.y - vertex.y
					const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
					const u2x = v2x / mag2
					const u2y = v2y / mag2

					const markerSize = 15
					const m1x = vertex.x + u1x * markerSize
					const m1y = vertex.y + u1y * markerSize
					const m2x = vertex.x + u2x * markerSize
					const m2y = vertex.y + u2y * markerSize
					const m3x = vertex.x + (u1x + u2x) * markerSize
					const m3y = vertex.y + (u1y + u2y) * markerSize
					svg += `<path d="M ${m1x} ${m1y} L ${m3x} ${m3y} L ${m2x} ${m2y}" fill="none" stroke="black" stroke-width="2"/>`
				} else {
					const startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
					const endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
					const arcStartX = vertex.x + angle.radius * Math.cos(startAngle)
					const arcStartY = vertex.y + angle.radius * Math.sin(startAngle)
					const arcEndX = vertex.x + angle.radius * Math.cos(endAngle)
					const arcEndY = vertex.y + angle.radius * Math.sin(endAngle)
					let angleDiff = endAngle - startAngle
					if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
					if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
					const sweepFlag = angleDiff > 0 ? 1 : 0
					svg += `<path d="M ${arcStartX} ${arcStartY} A ${angle.radius} ${angle.radius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}" fill="none" stroke="${angle.color}" stroke-width="2"/>`
				}
			}

			if (angle.label) {
				let startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
				let endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
				if (endAngle < startAngle) endAngle += 2 * Math.PI
				if (endAngle - startAngle > Math.PI) startAngle += 2 * Math.PI
				const midAngle = (startAngle + endAngle) / 2
				const labelRadius = angle.isRightAngle ? 22 : angle.radius * 1.4
				const labelX = vertex.x + labelRadius * Math.cos(midAngle)
				const labelY = vertex.y + labelRadius * Math.sin(midAngle)
				svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle">${angle.label}</text>`
			}
		}
	}

	// Layer 5: Sides (Labels and Ticks)
	if (sides) {
		for (const side of sides) {
			// Validate vertex count
			if (side.vertices.length !== 2) {
				throw errors.wrap(ErrInvalidSideVertexCount, `expected 2 vertices, got ${side.vertices.length}`)
			}

			// Check that array elements exist before accessing
			const v0 = side.vertices[0]
			const v1 = side.vertices[1]
			if (!v0 || !v1) continue

			const p1 = pointMap.get(v0)
			const p2 = pointMap.get(v1)
			if (!p1 || !p2) continue

			const midX = (p1.x + p2.x) / 2
			const midY = (p1.y + p2.y) / 2
			const dx = p2.x - p1.x
			const dy = p2.y - p1.y
			const len = Math.sqrt(dx * dx + dy * dy)
			const nx = -dy / len // Perpendicular vector
			const ny = dx / len
			const labelOffset = 15

			if (side.label) {
				svg += `<text x="${midX + nx * labelOffset}" y="${midY + ny * labelOffset}" fill="black" text-anchor="middle" dominant-baseline="middle">${side.label}</text>`
			}
			if (side.tickMarks > 0) {
				const tickSize = 6
				const tickSpacing = 4
				const totalTickWidth = side.tickMarks * tickSize + (side.tickMarks - 1) * tickSpacing
				const startOffset = -totalTickWidth / 2
				for (let i = 0; i < side.tickMarks; i++) {
					const tickOffset = startOffset + i * (tickSize + tickSpacing)
					const t1x = midX + (dx / len) * tickOffset - nx * (tickSize / 2)
					const t1y = midY + (dy / len) * tickOffset - ny * (tickSize / 2)
					const t2x = midX + (dx / len) * tickOffset + nx * (tickSize / 2)
					const t2y = midY + (dy / len) * tickOffset + ny * (tickSize / 2)
					svg += `<line x1="${t1x}" y1="${t1y}" x2="${t2x}" y2="${t2y}" stroke="black" stroke-width="2"/>`
				}
			}
		}
	}

	// Layer 6: Points and their labels (drawn last to be on top)
	for (const point of points) {
		svg += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="black"/>`
		if (point.label) {
			const textX = point.x + 8
			const textY = point.y - 8
			svg += `<text x="${textX}" y="${textY}" fill="black" font-size="16" font-weight="bold">${point.label}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
