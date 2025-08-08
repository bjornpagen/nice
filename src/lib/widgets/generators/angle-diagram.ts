import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Error constants
export const ErrInvalidAngleVertexCount = errors.new("angle vertices must contain exactly 3 point IDs")

// Utility function to find intersection point of two lines
// Line 1: from point1 to point2, Line 2: from point3 to point4
export const findLineIntersection = (
	point1: { x: number; y: number },
	point2: { x: number; y: number },
	point3: { x: number; y: number },
	point4: { x: number; y: number }
): { x: number; y: number } | null => {
	const x1 = point1.x
	const y1 = point1.y
	const x2 = point2.x
	const y2 = point2.y
	const x3 = point3.x
	const y3 = point3.y
	const x4 = point4.x
	const y4 = point4.y

	// Calculate the direction vectors
	const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

	// Lines are parallel if denominator is 0
	if (Math.abs(denom) < 1e-10) {
		return null
	}

	// Calculate intersection point using parametric line equations
	const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom

	const intersectionX = x1 + t * (x2 - x1)
	const intersectionY = y1 + t * (y2 - y1)

	return { x: intersectionX, y: intersectionY }
}

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
		points: z
			.array(
				z
					.object({
						id: z.string().describe("A unique identifier for this point (e.g., 'A', 'B', 'V')."),
						x: z.number().describe("The horizontal coordinate of the point."),
						y: z.number().describe("The vertical coordinate of the point."),
						label: z.string().nullable().describe("An optional text label to display near the point."),
						shape: z
							.enum(["circle", "ellipse"])
							.nullable()
							.transform((val) => val ?? "circle")
							.describe(
								"The shape of the point marker. 'circle' renders as <circle>, 'ellipse' renders as <ellipse> (for Perseus compatibility)."
							)
					})
					.strict()
			)
			.min(1)
			.describe("An array of all points to be used in the diagram."),
		rays: z
			.array(
				z
					.object({
						from: z.string().describe("The `id` of the point where the ray originates (the vertex)."),
						to: z.string().describe("The `id` of a point the ray passes through.")
					})
					.strict()
			)
			.describe("An array of rays to be drawn, defined by connecting points."),
		angles: z
			.array(
				z
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
							.describe("If true, displays a square marker instead of a curved arc to indicate a 90° angle.")
					})
					.strict()
			)
			.describe("An array of angles to be highlighted and labeled on the diagram.")
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

			// Push arcs slightly away from the vertex for clearer readability
			const ARC_OFFSET = 6
			const effectiveRadius = angle.radius + ARC_OFFSET
			const arcStartX = vertex.x + effectiveRadius * Math.cos(startAngle)
			const arcStartY = vertex.y + effectiveRadius * Math.sin(startAngle)
			const arcEndX = vertex.x + effectiveRadius * Math.cos(endAngle)
			const arcEndY = vertex.y + effectiveRadius * Math.sin(endAngle)

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

			// Calculate the angle difference and ensure we always take the interior/smaller angle
			let angleDiff = endAngle - startAngle

			// Normalize to [-π, π] range
			while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
			while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

			// Always use the smaller angle (interior angle)
			if (Math.abs(angleDiff) > Math.PI) {
				angleDiff = angleDiff > 0 ? angleDiff - 2 * Math.PI : angleDiff + 2 * Math.PI
			}

			const angleSize = Math.abs(angleDiff)

			// Calculate the bisector angle (always points into the interior of the angle)
			let midAngle: number
			if (angleDiff >= 0) {
				// Counter-clockwise from startAngle to endAngle
				midAngle = startAngle + angleDiff / 2
			} else {
				// Clockwise from startAngle to endAngle
				midAngle = startAngle + angleDiff / 2
			}

			// Smart label positioning based on angle size and label length
			let labelRadius: number

			if (angle.isRightAngle) {
				labelRadius = 25
			} else {
				// Keep label a bit beyond the (offset) arc for clarity
				const ARC_OFFSET = 6
				const baseLabelRadius = angle.radius + ARC_OFFSET + 8
				const FONT_SIZE_ESTIMATE = 14 // Based on the SVG font-size
				const CLEARANCE_PX = FONT_SIZE_ESTIMATE * 0.7 // Clearance needed for text

				// For very small angles, sin() approaches 0, which can cause radius to be infinite.
				// We only apply this logic if the angle is wide enough to avoid division by zero.
				if (Math.sin(angleSize / 2) > 0.01) {
					// Calculate the minimum radius needed to avoid the label touching the angle's lines
					const minRadiusForClearance = CLEARANCE_PX / Math.sin(angleSize / 2)
					// The label radius is the larger of the aesthetic default or the calculated minimum
					labelRadius = Math.max(baseLabelRadius, minRadiusForClearance)
				} else {
					// Fallback for extremely small angles
					labelRadius = baseLabelRadius
				}

				// Additional spacing for long labels
				const isLongLabel = angle.label.length > 3
				if (isLongLabel) {
					const extraSpacing = angle.label.length > 4 ? (angle.label.length - 4) * 3 : 0
					labelRadius += 15 + extraSpacing
				}
			}

			const labelX = vertex.x + labelRadius * Math.cos(midAngle)
			const labelY = vertex.y + labelRadius * Math.sin(midAngle)
			svg += `<text x="${labelX}" y="${labelY}" fill="black" stroke="white" stroke-width="0.3" paint-order="stroke fill" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="500">${angle.label}</text>`
		}
	}

	// Draw points and their labels (drawn last to be on top)
	for (const point of points) {
		if (point.shape === "ellipse") {
			svg += `<ellipse cx="${point.x}" cy="${point.y}" rx="4" ry="4" fill="black" stroke="#000" stroke-width="2" stroke-dasharray="0"/>`
		} else {
			svg += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="black"/>`
		}
		if (point.label) {
			// Smart label positioning: avoid rays emanating from this point
			const raysFromPoint = rays.filter((ray) => ray.from === point.id)

			if (raysFromPoint.length === 0) {
				// No rays from this point, use simple offset
				const textX = point.x + 5
				const textY = point.y - 5
				svg += `<text x="${textX}" y="${textY}" fill="black" font-size="16" font-weight="bold">${point.label}</text>`
			} else {
				// Calculate angles of all rays from this point
				const rayAngles = raysFromPoint
					.map((ray) => {
						const toPoint = pointMap.get(ray.to)
						if (!toPoint) return 0
						return Math.atan2(toPoint.y - point.y, toPoint.x - point.x)
					})
					.sort((a, b) => a - b)

				// Find the largest gap between rays to place the label
				let maxGap = 0
				let bestAngle = 0

				for (let i = 0; i < rayAngles.length; i++) {
					const angle1 = rayAngles[i] || 0
					const angle2 = rayAngles[(i + 1) % rayAngles.length] || 0

					let gap = angle2 - angle1
					if (gap < 0) gap += 2 * Math.PI
					if (i === rayAngles.length - 1) {
						gap = (rayAngles[0] || 0) + 2 * Math.PI - angle1
					}

					if (gap > maxGap) {
						maxGap = gap
						bestAngle = angle1 + gap / 2
					}
				}

				// If this point is a common vertex (multiple outgoing rays), bias the label to appear below the point
				// This improves readability for central vertices like 'O' by avoiding overlap with rays.
				if (raysFromPoint.length >= 2) {
					bestAngle = Math.PI / 2 // Downward in SVG coordinate system
				} else if (maxGap < Math.PI / 6) {
					// If no good gap found, default to bottom as a clearer fallback
					bestAngle = Math.PI / 2
				}

				const labelDistance = 15
				const textX = point.x + labelDistance * Math.cos(bestAngle)
				const textY = point.y + labelDistance * Math.sin(bestAngle)
				svg += `<text x="${textX}" y="${textY}" fill="black" font-size="16" font-weight="bold">${point.label}</text>`
			}
		}
	}

	svg += "</svg>"
	return svg
}
