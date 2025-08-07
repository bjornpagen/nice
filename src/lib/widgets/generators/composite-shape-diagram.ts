import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex
const PointSchema = z
	.object({
		x: z.number().describe("The horizontal coordinate of the vertex."),
		y: z.number().describe("The vertical coordinate of the vertex.")
	})
	.strict()

// Defines a label for a segment or an internal region
const LabelSchema = z
	.object({
		text: z.string().describe('The text content of the label (e.g., "9 units", "A").'),
		// INLINED: The PointSchema definition is now directly inside the position property.
		position: z
			.object({
				x: z.number().describe("The horizontal coordinate of the vertex."),
				y: z.number().describe("The vertical coordinate of the vertex.")
			})
			.strict()
			.describe("An explicit {x, y} coordinate for placing the label.")
	})
	.strict()

// Defines a line segment (either an outer edge or an inner decomposition line)
const SegmentSchema = z
	.object({
		fromVertexIndex: z.number().int().describe("The starting vertex index from the main vertices array."),
		toVertexIndex: z.number().int().describe("The ending vertex index from the main vertices array."),
		style: z
			.enum(["solid", "dashed"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The style of the line."),
		label: z.string().nullable().describe("An optional text label for this segment's length.")
	})
	.strict()

// Defines a shaded region within the composite shape
const ShadedRegionSchema = z
	.object({
		vertexIndices: z
			.array(z.number().int().min(0))
			.min(3)
			.describe("An ordered array of vertex indices that defines the boundary of the region to be shaded."),
		fillColor: z
			.string()
			.min(1)
			.describe(
				"The CSS fill color for the region, supporting rgba for transparency (e.g., 'rgba(116, 207, 112, 0.3)')."
			)
	})
	.strict()

// Defines a right-angle marker, positioned by the vertex at its corner
const RightAngleMarkerSchema = z
	.object({
		cornerVertexIndex: z.number().int().describe("The index of the vertex where the right angle corner is located."),
		adjacentVertex1Index: z.number().int().describe("Index of the first adjacent vertex forming the angle."),
		adjacentVertex2Index: z.number().int().describe("Index of the second adjacent vertex forming the angle.")
	})
	.strict()

// Defines a label for a side of the outer boundary
const SideLabelSchema = z
	.object({
		text: z.string().describe('The text content of the side label (e.g., "7", "5").'),
		offset: z
			.number()
			.nullable()
			.transform((val) => val ?? 10)
			.describe("Distance from the edge to place the label.")
	})
	.strict()

// The main Zod schema for the compositeShapeDiagram function
export const CompositeShapeDiagramPropsSchema = z
	.object({
		type: z.literal("compositeShapeDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 320)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 260)
			.describe("The total height of the output SVG container in pixels."),
		vertices: z.array(PointSchema).describe("An array of {x, y} coordinates defining all points in the diagram."),
		outerBoundary: z
			.array(z.number().int())
			.describe("An ordered array of vertex indices that defines the solid outline of the shape."),
		outerBoundaryLabels: z
			.array(SideLabelSchema.nullable())
			.nullable()
			.optional()
			.transform((val) => val ?? null)
			.describe(
				"An optional array of labels for each side of the outer boundary. The first label is for the edge from outerBoundary[0] to outerBoundary[1], etc. Use null for sides without labels."
			),
		internalSegments: z
			.array(SegmentSchema)
			.nullable()
			.describe("An optional array of internal lines, typically dashed, to show decomposition."),
		shadedRegions: z
			.array(ShadedRegionSchema)
			.nullable()
			.describe("An optional array of shaded sub-regions to highlight parts of the composite shape."),
		regionLabels: z
			.array(LabelSchema)
			.nullable()
			.describe('An optional array of labels to be placed inside sub-regions (e.g., "Triangle A").'),
		rightAngleMarkers: z
			.array(RightAngleMarkerSchema)
			.nullable()
			.describe("An optional array of markers to indicate right angles.")
	})
	.strict()
	.describe(
		"Generates a flexible diagram of a composite polygon from a set of vertices. This widget is ideal for geometry problems involving area calculations, shape decomposition, and geometric transformations. It supports drawing a solid outer boundary with labeled sides, internal dashed lines for decomposition, shaded sub-regions with distinct colors, labels for dimensions and regions, and right-angle markers to indicate perpendicularity. Common use cases include: (1) Area decomposition problems - splitting trapezoids into rectangles and triangles, breaking parallelograms into simpler shapes; (2) Geometric transformations - showing how parallelograms can be rearranged into rectangles with equivalent areas; (3) Complex polygon analysis - L-shaped figures, composite rectangles, irregular quadrilaterals; (4) Educational visualizations - demonstrating area formulas through visual decomposition with color-coded regions. The generator excels at creating Khan Academy-style geometry diagrams with measurements, height lines, and step-by-step area calculation visualizations."
	)

export type CompositeShapeDiagramProps = z.infer<typeof CompositeShapeDiagramPropsSchema>

/**
 * Generates a diagram of a composite polygon from a set of vertices. Ideal for area
 * problems involving the decomposition of a complex shape into simpler figures.
 */
export const generateCompositeShapeDiagram: WidgetGenerator<typeof CompositeShapeDiagramPropsSchema> = (data) => {
	const {
		width,
		height,
		vertices,
		outerBoundary,
		outerBoundaryLabels,
		shadedRegions,
		internalSegments,
		regionLabels,
		rightAngleMarkers
	} = data

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

	// Shaded regions (drawn first to be in the background)
	if (shadedRegions) {
		for (const region of shadedRegions) {
			// Validate that all vertex indices are within bounds
			const validIndices = region.vertexIndices.filter((i) => i >= 0 && i < vertices.length)
			if (validIndices.length < 3) continue // Skip regions with insufficient valid vertices

			const regionPoints = validIndices
				.map((i) => {
					const vertex = vertices[i]
					if (!vertex) return ""
					return `${vertex.x},${vertex.y}`
				})
				.filter(Boolean)
				.join(" ")

			svg += `<polygon points="${regionPoints}" fill="${region.fillColor}" stroke="none"/>`
		}
	}

	// Outer boundary
	const outerPoints = outerBoundary
		.map((i) => {
			const vertex = vertices[i]
			if (!vertex) return ""
			return `${vertex.x},${vertex.y}`
		})
		.filter(Boolean)
		.join(" ")
	svg += `<polygon points="${outerPoints}" fill="none" stroke="black" stroke-width="2"/>`

	// Outer boundary labels
	if (outerBoundaryLabels) {
		for (let i = 0; i < outerBoundary.length; i++) {
			const label = outerBoundaryLabels[i]
			if (!label) continue

			const fromIndex = outerBoundary[i]
			const toIndex = outerBoundary[(i + 1) % outerBoundary.length]
			if (fromIndex === undefined || toIndex === undefined) continue
			const from = vertices[fromIndex]
			const to = vertices[toIndex]
			if (!from || !to) continue

			// Calculate midpoint of the edge
			const midX = (from.x + to.x) / 2
			const midY = (from.y + to.y) / 2

			// Calculate edge direction and perpendicular
			const dx = to.x - from.x
			const dy = to.y - from.y
			const edgeLength = Math.sqrt(dx * dx + dy * dy)

			// Normalize edge vector
			const edgeNormX = dx / edgeLength
			const edgeNormY = dy / edgeLength

			// Calculate perpendicular vector (rotated 90 degrees counterclockwise)
			let perpX = -edgeNormY
			let perpY = edgeNormX

			// Determine if we need to flip the perpendicular to point outward
			// Calculate the center of the shape
			const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
			const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length

			// Test if perpendicular points away from center
			const testX = midX + perpX * 10
			const testY = midY + perpY * 10
			const distToCenterFromTest = Math.sqrt((testX - centerX) ** 2 + (testY - centerY) ** 2)
			const distToCenterFromMid = Math.sqrt((midX - centerX) ** 2 + (midY - centerY) ** 2)

			// If test point is closer to center, flip the perpendicular
			if (distToCenterFromTest < distToCenterFromMid) {
				perpX = -perpX
				perpY = -perpY
			}

			// Position the label
			const labelX = midX + perpX * label.offset
			const labelY = midY + perpY * label.offset

			svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold">${label.text}</text>`
		}
	}

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
