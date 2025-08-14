import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
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

// schemas following the documented api in docs/widget-review/angle-diagram.md
const Point = z
	.object({
		id: z
			.string()
			.describe(
				"unique identifier for this vertex point, used to reference it in rays and angles (e.g., 'A', 'B', 'C', 'vertex1'). must be unique within the diagram."
			),
		x: z
			.number()
			.describe(
				"the horizontal coordinate of the point in the svg coordinate system. origin (0,0) is top-left. positive x moves right."
			),
		y: z
			.number()
			.describe(
				"the vertical coordinate of the point in the svg coordinate system. origin (0,0) is top-left. positive y moves down."
			),
		label: z
			.string()
			.describe(
				"the text label to display next to this point (e.g., 'A', 'B', 'C', 'O' for origin). can be empty string to show no label."
			),
		shape: z.enum(["circle", "ellipse"]).describe("the shape of the point marker. 'circle' or 'ellipse'.")
	})
	.strict()

const AngleArc = z
	.object({
		type: z.literal("arc").describe("arc angle visualization"),
		vertices: z
			.tuple([z.string(), z.string(), z.string()])
			.describe(
				"exactly three point ids defining the angle: [point on first ray, vertex point, point on second ray]. the middle id is the vertex."
			),
		label: z.string().describe("angle label text; empty string to hide"),
		color: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe("css color for the angle arc and label"),
		radius: z.number().describe("arc radius in pixels from the vertex")
	})
	.strict()

const AngleRight = z
	.object({
		type: z.literal("right").describe("right angle visualization with square"),
		vertices: z.tuple([z.string(), z.string(), z.string()]).describe("exactly three point ids; middle is the vertex"),
		label: z.string().describe("label for the right angle; empty string to hide"),
		color: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe("css color for the right-angle square and label")
	})
	.strict()

const Angle = z.discriminatedUnion("type", [AngleArc, AngleRight]).describe("angle definition")

export const AngleDiagramPropsSchema = z
	.object({
		type: z.literal("angleDiagram"),
		width: z.number().positive().describe("total width of the svg in pixels"),
		height: z.number().positive().describe("total height of the svg in pixels"),
		points: z.array(Point).min(1).describe("all points used in the diagram"),
		rays: z
			.array(
				z
					.object({
						from: z.string().describe("id of the starting point"),
						to: z.string().describe("id of the point the ray passes through")
					})
					.strict()
			)
			.describe("rays that form angles"),
		angles: z.array(Angle).describe("angles to highlight")
	})
	.strict()
	.describe(
		"creates geometric diagrams showing angles formed by rays meeting at vertices. supports both general angles (with arcs) and right angles (with squares)."
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

	// draw angles
	for (const angle of angles) {
		// validate vertex count
		if (angle.vertices.length !== 3) {
			throw errors.wrap(ErrInvalidAngleVertexCount, `expected 3 vertices, got ${angle.vertices.length}`)
		}

		const v0 = angle.vertices[0]
		const v1 = angle.vertices[1]
		const v2 = angle.vertices[2]
		const p1 = pointMap.get(v0)
		const vertex = pointMap.get(v1)
		const p2 = pointMap.get(v2)
		if (!p1 || !vertex || !p2) {
			continue
		}

		if (angle.type === "right") {
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
		}

		if (angle.type === "arc") {
			const startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
			const endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

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

		if (angle.label !== "") {
			let startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
			let endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)
			let angleDiff = endAngle - startAngle
			while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
			while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
			if (Math.abs(angleDiff) > Math.PI) {
				angleDiff = angleDiff > 0 ? angleDiff - 2 * Math.PI : angleDiff + 2 * Math.PI
			}
			const angleSize = Math.abs(angleDiff)
			const midAngle = startAngle + angleDiff / 2

			let labelRadius: number
			if (angle.type === "right") {
				labelRadius = 25
			} else {
				const ARC_OFFSET = 6
				const baseLabelRadius = angle.radius + ARC_OFFSET + 8
				const FONT_SIZE_ESTIMATE = 14
				const CLEARANCE_PX = FONT_SIZE_ESTIMATE * 0.7
				if (Math.sin(angleSize / 2) > 0.01) {
					const minRadiusForClearance = CLEARANCE_PX / Math.sin(angleSize / 2)
					labelRadius = Math.max(baseLabelRadius, minRadiusForClearance)
				} else {
					labelRadius = baseLabelRadius
				}
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
