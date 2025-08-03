import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex
const PointSchema = z.object({
	x: z.number().describe("The horizontal coordinate of the vertex."),
	y: z.number().describe("The vertical coordinate of the vertex.")
})

// Defines a label for a segment or an internal region
const LabelSchema = z.object({
	text: z.string().describe('The text content of the label (e.g., "9 units", "A").'),
	position: PointSchema.describe("An explicit {x, y} coordinate for placing the label.")
})

// Defines a line segment (either an outer edge or an inner decomposition line)
const SegmentSchema = z.object({
	fromVertexIndex: z.number().int().describe("The starting vertex index from the main vertices array."),
	toVertexIndex: z.number().int().describe("The ending vertex index from the main vertices array."),
	style: z.enum(["solid", "dashed"]).default("solid").describe("The style of the line."),
	label: z.string().optional().describe("An optional text label for this segment's length.")
})

// Defines a right-angle marker, positioned by the vertex at its corner
const RightAngleMarkerSchema = z.object({
	cornerVertexIndex: z.number().int().describe("The index of the vertex where the right angle corner is located."),
	adjacentVertex1Index: z.number().int().describe("Index of the first adjacent vertex forming the angle."),
	adjacentVertex2Index: z.number().int().describe("Index of the second adjacent vertex forming the angle.")
})

// The main Zod schema for the compositeShapeDiagram function
export const CompositeShapeDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(260).describe("The total height of the output SVG container in pixels."),
		vertices: z.array(PointSchema).describe("An array of {x, y} coordinates defining all points in the diagram."),
		outerBoundary: z
			.array(z.number().int())
			.describe("An ordered array of vertex indices that defines the solid outline of the shape."),
		internalSegments: z
			.array(SegmentSchema)
			.optional()
			.describe("An optional array of internal lines, typically dashed, to show decomposition."),
		regionLabels: z
			.array(LabelSchema)
			.optional()
			.describe('An optional array of labels to be placed inside sub-regions (e.g., "Triangle A").'),
		rightAngleMarkers: z
			.array(RightAngleMarkerSchema)
			.optional()
			.describe("An optional array of markers to indicate right angles.")
	})
	.describe(
		"Generates a flexible diagram of a composite polygon from a set of vertices. This widget is ideal for area and perimeter problems that involve decomposing a complex shape into simpler ones (e.g., rectangles, triangles). It supports drawing a solid outer boundary, internal dashed lines for decomposition, labels for dimensions and regions, and right-angle markers to indicate perpendicularity. This allows for the clear visualization of shapes like L-shaped polygons, trapezoids, or any multi-sided figure."
	)

export type CompositeShapeDiagramProps = z.infer<typeof CompositeShapeDiagramPropsSchema>

/**
 * Generates a diagram of a composite polygon from a set of vertices. Ideal for area
 * problems involving the decomposition of a complex shape into simpler figures.
 */
export const generateCompositeShapeDiagram: WidgetGenerator<typeof CompositeShapeDiagramPropsSchema> = (data) => {
	const { width, height, vertices, outerBoundary, internalSegments, regionLabels, rightAngleMarkers } = data

	if (vertices.length === 0) return `<svg width="${width}" height="${height}" />`

	const padding = 20
	const minX = Math.min(...vertices.map((v) => v.x))
	const maxX = Math.max(...vertices.map((v) => v.x))
	const minY = Math.min(...vertices.map((v) => v.y))
	const maxY = Math.max(...vertices.map((v) => v.y))

	const vbX = minX - padding
	const vbY = minY - padding
	const vbWidth = maxX - minX + 2 * padding
	const vbHeight = maxY - minY + 2 * padding

	let svg = `<svg width="${width}" height="${height}" viewBox="${vbX} ${vbY} ${vbWidth} ${vbHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="10">`

	// Outer boundary
	const outerPoints = outerBoundary
		.map((i) => {
			const vertex = vertices[i]
			if (!vertex) return ""
			return `${vertex.x},${vertex.y}`
		})
		.filter(Boolean)
		.join(" ")
	svg += `<polygon points="${outerPoints}" fill="#f0f0f0" stroke="black" stroke-width="2"/>`

	// Internal segments
	if (internalSegments) {
		for (const s of internalSegments) {
			const from = vertices[s.fromVertexIndex]
			const to = vertices[s.toVertexIndex]
			if (!from || !to) continue
			const dash = s.style === "dashed" ? ' stroke-dasharray="4 2"' : ""
			svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-width="1.5"${dash}/>`
			if (s.label) {
				const midX = (from.x + to.x) / 2
				const midY = (from.y + to.y) / 2
				// Add a small offset perpendicular to the line for better label placement
				const angle = Math.atan2(to.y - from.y, to.x - from.x)
				const offsetX = -Math.sin(angle) * 5
				const offsetY = Math.cos(angle) * 5
				svg += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="12" style="paint-order: stroke; stroke: #f0f0f0; stroke-width: 3px; stroke-linejoin: round;">${s.label}</text>`
			}
		}
	}

	// Region labels
	if (regionLabels) {
		for (const l of regionLabels) {
			svg += `<text x="${l.position.x}" y="${l.position.y}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold">${l.text}</text>`
		}
	}

	// Right-angle markers
	if (rightAngleMarkers) {
		for (const m of rightAngleMarkers) {
			const corner = vertices[m.cornerVertexIndex]
			const adj1 = vertices[m.adjacentVertex1Index]
			const adj2 = vertices[m.adjacentVertex2Index]
			if (!corner || !adj1 || !adj2) continue

			// Create unit vectors from corner to adjacent points
			const v1x = adj1.x - corner.x
			const v1y = adj1.y - corner.y
			const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
			const u1x = v1x / mag1
			const u1y = v1y / mag1

			const v2x = adj2.x - corner.x
			const v2y = adj2.y - corner.y
			const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
			const u2x = v2x / mag2
			const u2y = v2y / mag2

			const markerSize = Math.min(vbWidth, vbHeight) * 0.05 // Relative size
			const p1x = corner.x + u1x * markerSize
			const p1y = corner.y + u1y * markerSize
			const p2x = corner.x + u2x * markerSize
			const p2y = corner.y + u2y * markerSize
			const p3x = corner.x + (u1x + u2x) * markerSize
			const p3y = corner.y + (u1y + u2y) * markerSize

			svg += `<path d="M ${p1x} ${p1y} L ${p3x} ${p3y} L ${p2x} ${p2y}" fill="none" stroke="black" stroke-width="1.5"/>`
		}
	}

	svg += "</svg>"
	return svg
}
