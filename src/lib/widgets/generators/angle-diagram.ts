import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Error constants
export const ErrInvalidAngleVertexCount = errors.new("angle vertices must contain exactly 3 point IDs")

// Defines a 2D coordinate point with a label
const PointSchema = z
	.object({
		id: z.string().describe("A unique identifier for this point (e.g., 'A', 'B', 'V')."),
		x: z.number().describe("The horizontal coordinate of the point."),
		y: z.number().describe("The vertical coordinate of the point."),
		label: z.string().nullable().describe("An optional text label to display near the point.")
	})
	.strict()

// Defines a ray (line segment) connecting two points
const RaySchema = z
	.object({
		from: z.string().describe("The `id` of the point where the ray originates (the vertex)."),
		to: z.string().describe("The `id` of a point the ray passes through.")
	})
	.strict()

// Defines an angle to be drawn, with its label and style
const AngleSchema = z
	.object({
		vertices: z
			.array(z.string())
			.describe(
				"An array of exactly three point `id`s in the order [pointOnSide1, vertex, pointOnSide2]. Must contain exactly 3 elements."
			),
		label: z.string().nullable().describe('The text label for the angle (e.g., "x", "30°", "2x+1").'),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "rgba(217, 95, 79, 0.8)")
			.describe("The color of the angle's arc marker."),
		radius: z
			.number()
			.nullable()
			.transform((val) => val ?? 30)
			.describe("The radius of the angle arc in pixels."),
		isRightAngle: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, displays a square marker instead of a curved arc to indicate a 90° angle.")
	})
	.strict()

// The main Zod schema for the angleDiagram function
export const AngleDiagramPropsSchema = z
	.object({
		type: z.literal("angleDiagram"),
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
		points: z.array(PointSchema).min(1).describe("An array of all points to be used in the diagram."),
		rays: z.array(RaySchema).describe("An array of rays to be drawn, defined by connecting points."),
		angles: z.array(AngleSchema).describe("An array of angles to be highlighted and labeled on the diagram.")
	})
	.strict()
	.describe(
		"Generates an SVG diagram of angles formed by rays originating from vertices. This widget is highly flexible and ideal for a wide range of geometry problems, including questions about angle relationships (complementary, supplementary, vertical), finding unknown angles in a figure, and basic angle identification."
	)

export type AngleDiagramProps = z.infer<typeof AngleDiagramPropsSchema>

/**
 * Generates a flexible diagram of angles from a set of points and rays.
 * Ideal for a wide range of geometry problems.
 */
export const generateAngleDiagram: WidgetGenerator<typeof AngleDiagramPropsSchema> = (props) => {
	const { width, height, points, rays, angles } = props

	const padding = 20
	const minX = Math.min(...points.map((p) => p.x))
	const maxX = Math.max(...points.map((p) => p.x))
	const minY = Math.min(...points.map((p) => p.y))
	const maxY = Math.max(...points.map((p) => p.y))

	const vbX = minX - padding
	const vbY = minY - padding
	const vbWidth = maxX - minX + 2 * padding
	const vbHeight = maxY - minY + 2 * padding

	let svg = `<svg width="${width}" height="${height}" viewBox="${vbX} ${vbY} ${vbWidth} ${vbHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	const pointMap = new Map(points.map((p) => [p.id, p]))

	// Draw rays
	for (const ray of rays) {
		const from = pointMap.get(ray.from)
		const to = pointMap.get(ray.to)
		if (!from || !to) continue
		svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-width="2"/>`
	}

	// Draw angles
	for (const angle of angles) {
		// Validate vertex count
		if (angle.vertices.length !== 3) {
			throw errors.wrap(ErrInvalidAngleVertexCount, `expected 3 vertices, got ${angle.vertices.length}`)
		}

		const v0 = angle.vertices[0]
		const v1 = angle.vertices[1]
		const v2 = angle.vertices[2]
		if (!v0 || !v1 || !v2) continue

		const p1 = pointMap.get(v0)
		const vertex = pointMap.get(v1)
		const p2 = pointMap.get(v2)

		if (!p1 || !vertex || !p2) continue

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

			svg += `<path d="M ${m1x} ${m1y} L ${m3x} ${m3y} L ${m2x} ${m2y}" fill="none" stroke="${angle.color}" stroke-width="2"/>`
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

			const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0
			const sweepFlag = angleDiff > 0 ? 1 : 0

			svg += `<path d="M ${arcStartX} ${arcStartY} A ${angle.radius} ${angle.radius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY}" fill="none" stroke="${angle.color}" stroke-width="2.5"/>`
		}

		if (angle.label) {
			let startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
			let endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

			// Ensure we take the smallest angle for the label bisector
			if (endAngle < startAngle) endAngle += 2 * Math.PI
			if (endAngle - startAngle > Math.PI) startAngle += 2 * Math.PI

			const midAngle = (startAngle + endAngle) / 2
			const labelRadius = angle.isRightAngle ? 20 : angle.radius * 1.3
			const labelX = vertex.x + labelRadius * Math.cos(midAngle)
			const labelY = vertex.y + labelRadius * Math.sin(midAngle)
			svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14">${angle.label}</text>`
		}
	}

	// Draw points and their labels (drawn last to be on top)
	for (const point of points) {
		svg += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="black"/>`
		if (point.label) {
			// Basic offset logic, can be improved with more dynamic placement
			const textX = point.x + 5
			const textY = point.y - 5
			svg += `<text x="${textX}" y="${textY}" fill="black" font-size="16" font-weight="bold">${point.label}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
