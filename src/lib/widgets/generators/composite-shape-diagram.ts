import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"

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
				"Ordered vertex indices defining the outer perimeter. Traces the shape's outer edge by connecting vertices in sequence, then closing back to the first vertex. CRITICAL: Must include ALL vertices that form the outer boundary, not just the first N vertices. Examples: Rectangle=[0,1,2,3], L-shape=[0,1,2,3,4,5], Triangle=[0,1,2]. Min 3 indices."
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
		"Creates complex composite polygons with internal divisions, shaded regions, and geometric annotations. Perfect for area decomposition problems, geometric proofs, and visualizing how shapes can be divided into parts. Supports right angle markers and both solid and dashed internal segments. IMPORTANT: For complex shapes like L-shapes or U-shapes, ensure outerBoundary includes ALL vertices that form the perimeter, not just sequential indices."
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

	// Fit-to-canvas projection in data space (uniform scale + centering)
	type Point = { x: number; y: number }
	const allPoints: Point[] = []
	for (const v of vertices) {
		allPoints.push({ x: v.x, y: v.y })
	}
	for (const l of regionLabels) {
		allPoints.push({ x: l.position.x, y: l.position.y })
	}

	function computeFit(points: Point[]) {
		if (points.length === 0) {
			return { scale: 1, offsetX: 0, offsetY: 0, project: (p: Point) => p }
		}
		const minX = Math.min(...points.map((p) => p.x))
		const maxX = Math.max(...points.map((p) => p.x))
		const minY = Math.min(...points.map((p) => p.y))
		const maxY = Math.max(...points.map((p) => p.y))
		const rawW = maxX - minX
		const rawH = maxY - minY
		const scale = Math.min((width - 2 * PADDING) / (rawW || 1), (height - 2 * PADDING) / (rawH || 1))
		const offsetX = (width - scale * rawW) / 2 - scale * minX
		const offsetY = (height - scale * rawH) / 2 - scale * minY
		const project = (p: Point) => ({ x: offsetX + scale * p.x, y: offsetY + scale * p.y })
		return { scale, offsetX, offsetY, project }
	}

	const { scale, project } = computeFit(allPoints)

	// Validation: Check that outerBoundaryLabels length matches outerBoundary length
	if (outerBoundaryLabels.length !== outerBoundary.length) {
		logger.error("outerBoundaryLabels length mismatch", {
			outerBoundaryLabelsLength: outerBoundaryLabels.length,
			outerBoundaryLength: outerBoundary.length
		})
		throw errors.new(
			`outerBoundaryLabels length (${outerBoundaryLabels.length}) must match outerBoundary length (${outerBoundary.length})`
		)
	}

	// Validation: Check that all outerBoundary indices are valid
	for (const idx of outerBoundary) {
		if (idx < 0 || idx >= vertices.length) {
			logger.error("invalid outerBoundary index", {
				index: idx,
				verticesLength: vertices.length,
				validRange: `0-${vertices.length - 1}`
			})
			throw errors.new(`outerBoundary index ${idx} is invalid (must be 0-${vertices.length - 1})`)
		}
	}

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// Shaded regions (drawn first to be in the background)
	for (const region of shadedRegions) {
		// Validate that all vertex indices are within bounds
		const validIndices = region.vertexIndices.filter((i) => i >= 0 && i < vertices.length)
		if (validIndices.length < 3) continue

		const regionPoints = validIndices
			.map((i) => {
				const vertex = vertices[i]
				if (!vertex) return null
				return project({ x: vertex.x, y: vertex.y })
			})
			.filter((p): p is { x: number; y: number } => p !== null)

		if (regionPoints.length >= 3) {
			canvas.drawPolygon(regionPoints, {
				fill: region.fillColor,
				stroke: "none"
			})
		}
	}

	// Outer boundary
	const outerPoints = outerBoundary
		.map((i) => {
			const vertex = vertices[i]
			if (!vertex) return null
			return project({ x: vertex.x, y: vertex.y })
		})
		.filter((p): p is { x: number; y: number } => p !== null)

	if (outerPoints.length >= 3) {
		canvas.drawPolygon(outerPoints, {
			fill: "none",
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})
	}

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

		// Midpoint in data space
		const midX = (from.x + to.x) / 2
		const midY = (from.y + to.y) / 2

		// Edge direction and perpendicular in data space
		const dx = to.x - from.x
		const dy = to.y - from.y
		const edgeLength = Math.sqrt(dx * dx + dy * dy)
		if (edgeLength === 0) continue
		const edgeNormX = dx / edgeLength
		const edgeNormY = dy / edgeLength
		let perpX = -edgeNormY
		let perpY = edgeNormX

		// Determine outward direction via center of all vertices (data space)
		const centerX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length
		const centerY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
		const testX = midX + perpX * 10
		const testY = midY + perpY * 10
		const distToCenterFromTest = Math.sqrt((testX - centerX) ** 2 + (testY - centerY) ** 2)
		const distToCenterFromMid = Math.sqrt((midX - centerX) ** 2 + (midY - centerY) ** 2)
		if (distToCenterFromTest < distToCenterFromMid) {
			perpX = -perpX
			perpY = -perpY
		}

		// Convert offset (px) to data-space units
		const offsetData = label.offset / scale
		const labelData = { x: midX + perpX * offsetData, y: midY + perpY * offsetData }
		const labelPx = project(labelData)

		canvas.drawText({
			x: labelPx.x,
			y: labelPx.y,
			text: label.text,
			fill: theme.colors.text,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: theme.font.size.medium,
			fontWeight: theme.font.weight.bold
		})
	}

	// Internal segments
	for (const s of internalSegments) {
		const from = vertices[s.fromVertexIndex]
		const to = vertices[s.toVertexIndex]
		if (!from || !to) continue
		const p1 = project({ x: from.x, y: from.y })
		const p2 = project({ x: to.x, y: to.y })
		const dash = s.style === "dashed" ? "4 2" : undefined
		canvas.drawLine(p1.x, p1.y, p2.x, p2.y, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.base,
			dash: dash
		})
		if (s.label !== null) {
			const midX = (from.x + to.x) / 2
			const midY = (from.y + to.y) / 2
			const angle = Math.atan2(to.y - from.y, to.x - from.x)
			const offsetMagData = 5 / scale
			const offsetX = -Math.sin(angle) * offsetMagData
			const offsetY = Math.cos(angle) * offsetMagData
			const labelPx = project({ x: midX + offsetX, y: midY + offsetY })
			canvas.drawText({
				x: labelPx.x,
				y: labelPx.y,
				text: s.label,
				fill: theme.colors.text,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: theme.font.size.base,
				stroke: theme.colors.background,
				strokeWidth: 3,
				paintOrder: "stroke fill"
			})
		}
	}

	// Region labels
	for (const l of regionLabels) {
		const pos = project({ x: l.position.x, y: l.position.y })
		canvas.drawText({
			x: pos.x,
			y: pos.y,
			text: l.text,
			fill: theme.colors.text,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: theme.font.size.medium,
			fontWeight: theme.font.weight.bold
		})
	}

	// Right-angle markers
	for (const m of rightAngleMarkers) {
		const corner = vertices[m.cornerVertexIndex]
		const adj1 = vertices[m.adjacentVertex1Index]
		const adj2 = vertices[m.adjacentVertex2Index]
		if (!corner || !adj1 || !adj2) continue

		// Create unit vectors from corner to adjacent points in data space
		const v1x = adj1.x - corner.x
		const v1y = adj1.y - corner.y
		const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
		if (mag1 === 0) continue
		const u1x = v1x / mag1
		const u1y = v1y / mag1

		const v2x = adj2.x - corner.x
		const v2y = adj2.y - corner.y
		const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
		if (mag2 === 0) continue
		const u2x = v2x / mag2
		const u2y = v2y / mag2

		const markerSizePx = 10
		const markerSizeData = markerSizePx / scale
		const p1x = corner.x + u1x * markerSizeData
		const p1y = corner.y + u1y * markerSizeData
		const p2x = corner.x + u2x * markerSizeData
		const p2y = corner.y + u2y * markerSizeData
		const p3x = corner.x + (u1x + u2x) * markerSizeData
		const p3y = corner.y + (u1y + u2y) * markerSizeData

		const q1 = project({ x: p1x, y: p1y })
		const q2 = project({ x: p3x, y: p3y })
		const q3 = project({ x: p2x, y: p2y })
		const markerPath = new Path2D().moveTo(q1.x, q1.y).lineTo(q2.x, q2.y).lineTo(q3.x, q3.y)
		canvas.drawPath(markerPath, {
			fill: "none",
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.base
		})
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.small}">${svgBody}</svg>`
}
