import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { initExtents, includePointX, includeText, computeDynamicWidth } from "@/lib/widgets/utils/layout"

// Defines a 2D coordinate point for a vertex
const PointSchema = z
	.object({
		x: z
			.number()
			.describe(
				"Horizontal coordinate in the SVG space. Can be negative. The shape will be auto-centered, so use coordinates relative to shape's logical center (e.g., -50, 0, 100, 75.5)."
			),
		y: z
			.number()
			.describe(
				"Vertical coordinate in the SVG space. Can be negative. Positive y is downward. Shape will be auto-centered (e.g., -30, 0, 50, 80.5)."
			)
	})
	.strict()

// Defines a label for a segment or an internal region
const LabelSchema = z
	.object({
		text: z
			.string()
			.describe(
				"The label text to display (e.g., 'Region A', '45 cm²', '1/2', 'Garden'). Can include math symbols and subscripts."
			),
		position: z
			.object({
				x: z
					.number()
					.describe(
						"Horizontal position for the label in the same coordinate system as vertices. Should be inside the relevant region."
					),
				y: z
					.number()
					.describe(
						"Vertical position for the label in the same coordinate system as vertices. Place carefully to avoid overlapping with edges."
					)
			})
			.strict()
			.describe("Position for placing the label.")
	})
	.strict()

// Defines a line segment (either an outer edge or an inner decomposition line)
const SegmentSchema = z
	.object({
		fromVertexIndex: z
			.number()
			.int()
			.describe(
				"Zero-based index of the starting vertex in the vertices array (e.g., 0, 1, 2). Must be valid index < vertices.length."
			),
		toVertexIndex: z
			.number()
			.int()
			.describe(
				"Zero-based index of the ending vertex in the vertices array (e.g., 1, 3, 5). Must be valid index < vertices.length."
			),
		style: z
			.enum(["solid", "dashed"])
			.describe(
				"Visual style of the line segment. 'solid' for regular lines, 'dashed' for lines indicating hidden/auxiliary edges or different types of boundaries."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for this segment's length or name (e.g., '5m', 'x+2', 'base', null). Null shows no label. Positioned at segment midpoint."
			)
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
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS fill color for this region (e.g., '#FFE5CC' for light peach, 'rgba(0,128,255,0.3)' for translucent blue, 'lightgreen'). Use alpha for overlapping regions."
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
		text: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Label for this edge/side of the outer boundary (e.g., '10 cm', 'x', '2a+b', null). Null means no label for this side."
			),
		offset: z
			.number()
			.describe(
				"Distance in pixels from the edge to place the label. Positive values place label outside the shape, negative inside (e.g., 15, -10, 20)."
			)
	})
	.strict()

// The main Zod schema for the compositeShapeDiagram function
export const CompositeShapeDiagramPropsSchema = z
	.object({
		type: z
			.literal("compositeShapeDiagram")
			.describe("Identifies this as a composite shape diagram widget for complex polygons with internal structure."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the SVG in pixels (e.g., 400, 500, 600). Must accommodate the shape with labels and padding. Shape is auto-centered within."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the SVG in pixels (e.g., 300, 400, 500). Must accommodate the shape with labels and padding. Shape is auto-centered within."
			),
		vertices: z
			.array(PointSchema)
			.describe(
				"All vertex points that define the shape and its internal structure. Referenced by index (0-based) in other arrays. Order matters for boundary definition."
			),
		outerBoundary: z
			.array(z.number().int())
			.describe(
				"Ordered vertex indices defining the outer perimeter. Connects vertices in order, closing back to first (e.g., [0,1,2,3,4] for pentagon). Min 3 indices."
			),
		outerBoundaryLabels: z
			.array(SideLabelSchema)
			.describe(
				"Labels for outer boundary edges. Array length should match number of edges. First label is for edge from vertex[outerBoundary[0]] to vertex[outerBoundary[1]], etc."
			),
		internalSegments: z
			.array(SegmentSchema)
			.describe(
				"Line segments inside the shape, dividing it into regions. Empty array means no internal divisions. Can represent diagonals, medians, or partitions."
			),
		shadedRegions: z
			.array(ShadedRegionSchema)
			.describe(
				"Polygonal regions to fill with color. Empty array means no shading. Useful for highlighting areas, showing fractions, or distinguishing parts."
			),
		regionLabels: z
			.array(LabelSchema)
			.describe(
				"Text labels positioned inside regions. Empty array means no labels. Use for area values, region names, or fractions."
			),
		rightAngleMarkers: z
			.array(RightAngleMarkerSchema)
			.describe(
				"Square markers indicating 90° angles at vertices. Empty array means no markers. Essential for showing perpendicular edges in geometric proofs."
			)
	})
	.strict()
	.describe(
		"Creates complex composite polygons with internal divisions, shaded regions, and geometric annotations. Perfect for area decomposition problems, geometric proofs, and visualizing how shapes can be divided into parts. Supports right angle markers and both solid and dashed internal segments."
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
	
	// Initialize extent tracking
	const ext = initExtents(width)
	let svgContent = "" // Use a temporary string for the SVG body

	// Shaded regions (drawn first to be in the background)
	for (const region of shadedRegions) {
		// Validate that all vertex indices are within bounds
		const validIndices = region.vertexIndices.filter((i) => i >= 0 && i < vertices.length)
		if (validIndices.length < 3) continue // Skip regions with insufficient valid vertices

		const regionPoints = validIndices
			.map((i) => {
				const vertex = vertices[i]
				if (!vertex) return ""
				includePointX(ext, vertex.x) // Track vertex
				return `${vertex.x},${vertex.y}`
			})
			.filter(Boolean)
			.join(" ")

		svgContent += `<polygon points="${regionPoints}" fill="${region.fillColor}" stroke="none"/>`
	}

	// Outer boundary
	const outerPoints = outerBoundary
		.map((i) => {
			const vertex = vertices[i]
			if (!vertex) return ""
			includePointX(ext, vertex.x) // Track vertex
			return `${vertex.x},${vertex.y}`
		})
		.filter(Boolean)
		.join(" ")
	svgContent += `<polygon points="${outerPoints}" fill="none" stroke="black" stroke-width="2"/>`

	// Outer boundary labels
	for (let i = 0; i < outerBoundary.length; i++) {
		const label = outerBoundaryLabels[i]
		if (!label || label.text === null || label.text === "") continue

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

		svgContent += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold">${label.text}</text>`
		includeText(ext, labelX, label.text, "middle") // Track label
	}

	// Internal segments
	for (const s of internalSegments) {
		const from = vertices[s.fromVertexIndex]
		const to = vertices[s.toVertexIndex]
		if (!from || !to) continue
		const dash = s.style === "dashed" ? ' stroke-dasharray="4 2"' : ""
		// Track segment endpoints
		includePointX(ext, from.x)
		includePointX(ext, to.x)
		svgContent += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-width="1.5"${dash}/>`
		if (s.label !== null) {
			const midX = (from.x + to.x) / 2
			const midY = (from.y + to.y) / 2
			// Add a small offset perpendicular to the line for better label placement
			const angle = Math.atan2(to.y - from.y, to.x - from.x)
			const offsetX = -Math.sin(angle) * 5
			const offsetY = Math.cos(angle) * 5
			svgContent += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="12" style="paint-order: stroke; stroke: #f0f0f0; stroke-width: 3px; stroke-linejoin: round;">${s.label}</text>`
			includeText(ext, midX + offsetX, s.label, "middle") // Track label
		}
	}

	// Region labels
	for (const l of regionLabels) {
		svgContent += `<text x="${l.position.x}" y="${l.position.y}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="bold">${l.text}</text>`
		includeText(ext, l.position.x, l.text, "middle") // Track label
	}

	// Right-angle markers
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

		const markerSize = 10 // Fixed size instead of relative
		const p1x = corner.x + u1x * markerSize
		const p1y = corner.y + u1y * markerSize
		const p2x = corner.x + u2x * markerSize
		const p2y = corner.y + u2y * markerSize
		const p3x = corner.x + (u1x + u2x) * markerSize
		const p3y = corner.y + (u1y + u2y) * markerSize

		// Track right angle marker points
		includePointX(ext, p1x)
		includePointX(ext, p2x)
		includePointX(ext, p3x)
		svgContent += `<path d="M ${p1x} ${p1y} L ${p3x} ${p3y} L ${p2x} ${p2y}" fill="none" stroke="black" stroke-width="1.5"/>`
	}

	// Compute dynamic width and create final SVG
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, padding)
	let svg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="10">`
	svg += svgContent
	svg += "</svg>"
	return svg
}
