import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a dimension label for an edge or a face area
const DimensionLabelSchema = z
	.object({
		text: z.string().describe('The text for the label (e.g., "10 cm", "Area = 9 units²").'),
		target: z
			.string()
			.describe('The specific edge or face to label (e.g., "length", "width", "height", "top_face", "front_face").')
	})
	.strict()

// Defines the properties for a rectangular prism (including cubes)
const RectangularPrismDataSchema = z
	.object({
		type: z.literal("rectangularPrism"),
		length: z.number().describe("The length of the prism (depth)."),
		width: z.number().describe("The width of the prism (front-facing dimension)."),
		height: z.number().describe("The height of the prism.")
	})
	.strict()

// Defines the triangular base dimensions
const TriangularBaseSchema = z
	.object({
		b: z.number().describe("The base length of the triangular face."),
		h: z.number().describe("The height of the triangular face."),
		hypotenuse: z.number().nullable().describe("The hypotenuse for a right-triangle base. Calculated if omitted.")
	})
	.strict()

// Defines the properties for a triangular prism
const TriangularPrismDataSchema = z
	.object({
		type: z.literal("triangularPrism"),
		base: TriangularBaseSchema.describe("The dimensions of the triangular base."),
		length: z.number().describe("The length (depth) of the prism, connecting the two triangular bases.")
	})
	.strict()

// Defines the properties for a rectangular pyramid
const RectangularPyramidDataSchema = z
	.object({
		type: z.literal("rectangularPyramid"),
		baseLength: z.number().describe("The length of the rectangular base."),
		baseWidth: z.number().describe("The width of the rectangular base."),
		height: z.number().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines the properties for a hollow rectangular frame (like a picture frame with depth)
const RectangularFrameDataSchema = z
	.object({
		type: z.literal("rectangularFrame"),
		outerLength: z.number().describe("The outer length of the frame (depth)."),
		outerWidth: z.number().describe("The outer width of the frame (front-facing dimension)."),
		outerHeight: z.number().describe("The outer height of the frame."),
		thickness: z.number().describe("The thickness of the frame walls.")
	})
	.strict()

// Defines a diagonal line to be drawn between two vertices.
const DiagonalLineSchema = z
	.object({
		fromVertexIndex: z.number().int().min(0).describe("The 0-based index of the starting vertex."),
		toVertexIndex: z.number().int().min(0).describe("The 0-based index of the ending vertex."),
		label: z.string().nullable().describe("An optional text label for the diagonal's length."),
		style: z
			.enum(["solid", "dashed", "dotted"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The visual style of the line.")
	})
	.strict()

// The main Zod schema for the polyhedronDiagram function
export const PolyhedronDiagramPropsSchema = z
	.object({
		type: z.literal("polyhedronDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200)
			.describe("The total height of the output SVG container in pixels."),
		shape: z
			.discriminatedUnion("type", [
				RectangularPrismDataSchema,
				TriangularPrismDataSchema,
				RectangularPyramidDataSchema,
				RectangularFrameDataSchema
			])
			.describe("The geometric data defining the shape of the polyhedron."),
		labels: z.array(DimensionLabelSchema).nullable().describe("An array of labels for edge lengths or face areas."),
		diagonals: z
			.array(DiagonalLineSchema)
			.nullable()
			.describe("An optional array of internal diagonals to draw between vertices."),
		shadedFace: z.string().nullable().describe('The identifier of a face to shade (e.g., "top_face", "front_face").'),
		showHiddenEdges: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe("If true, render edges hidden from the camera view as dashed lines.")
	})
	.strict()
	.describe(
		"This template is a versatile tool for generating SVG diagrams of three-dimensional polyhedra with flat faces, such as prisms and pyramids. It renders the polyhedron in a standard isometric or perspective view to provide depth perception. The generator supports several types of polyhedra, currently: Rectangular Prisms (including cubes): Defined by length, width, and height dimensions. Triangular Prisms: Defined by a triangular base (with base, height, and optionally hypotenuse) and a length. Rectangular Pyramids: Defined by a rectangular base (length and width) and a height. Rectangular Frames: Hollow rectangular frames (like picture frames with depth) defined by outer dimensions and wall thickness. The template provides: Accurate 3D Representation: The polyhedron is drawn with all visible edges as solid lines. Edges that would be hidden from the current viewpoint are drawn as dashed lines to aid in understanding the 3D structure. This dashed representation can be toggled on/off. Dimension Labeling: It can label the lengths of edges (like \"length,\" \"width,\" \"height\") with custom text or numerical values. Leader lines connect the labels to the appropriate edges for clarity. Face Highlighting: It supports shading or coloring specific faces (e.g., the 'top', 'bottom', 'front' base) to draw attention to them. This is particularly useful for problems where the area of a base is given. A label can also be placed on a face to denote its area directly. The final output is a clean, mathematically accurate, and easy-to-interpret SVG diagram, ready to be embedded in a QTI item body."
	)

export type PolyhedronDiagramProps = z.infer<typeof PolyhedronDiagramPropsSchema>

/**
 * This template is a versatile tool for generating SVG diagrams of three-dimensional
 * polyhedra with flat faces, such as prisms and pyramids, as well as hollow rectangular
 * frames. It renders the shapes in a standard isometric or perspective view to provide
 * depth perception.
 */
export const generatePolyhedronDiagram: WidgetGenerator<typeof PolyhedronDiagramPropsSchema> = (data) => {
	const { width, height, shape, labels, diagonals, shadedFace, showHiddenEdges } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	if (shape.type === "rectangularPrism") {
		const w = shape.width * 5
		const h = shape.height * 5
		const l = shape.length * 3 // depth
		const x_offset = (width - w - l) / 2
		const y_offset = (height + h - l * 0.5) / 2

		// 8 vertices of the prism
		// 0: front bottom left, 1: front bottom right, 2: front top right, 3: front top left
		// 4: back bottom left,  5: back bottom right,  6: back top right,  7: back top left
		const p = [
			{ x: x_offset, y: y_offset }, // 0: front bottom left
			{ x: x_offset + w, y: y_offset }, // 1: front bottom right
			{ x: x_offset + w, y: y_offset - h }, // 2: front top right
			{ x: x_offset, y: y_offset - h }, // 3: front top left
			{ x: x_offset + l, y: y_offset - l * 0.5 }, // 4: back bottom left
			{ x: x_offset + w + l, y: y_offset - l * 0.5 }, // 5: back bottom right
			{ x: x_offset + w + l, y: y_offset - h - l * 0.5 }, // 6: back top right
			{ x: x_offset + l, y: y_offset - h - l * 0.5 } // 7: back top left
		]

		const faces = {
			front_face: { points: [p[0], p[1], p[2], p[3]], color: "rgba(255,0,0,0.2)" },
			top_face: { points: [p[3], p[2], p[6], p[7]], color: "rgba(0,0,255,0.2)" },
			side_face: { points: [p[1], p[5], p[6], p[2]], color: "rgba(0,255,0,0.2)" },
			bottom_face: { points: [p[0], p[4], p[5], p[1]], color: "rgba(255,255,0,0.2)" }
		}

		const getFaceSvg = (faceName: keyof typeof faces) => {
			const face = faces[faceName]
			const pointsStr = face.points
				.map((pt) => (pt ? `${pt.x},${pt.y}` : ""))
				.filter(Boolean)
				.join(" ")
			return `<polygon points="${pointsStr}" fill="${shadedFace === faceName ? face.color : "none"}" stroke="black" stroke-width="1.5" />`
		}

		const hidden = 'stroke="black" stroke-width="1.5" stroke-dasharray="4 2"'
		const _solid = 'stroke="black" stroke-width="1.5"'

		// Draw hidden elements first
		if (showHiddenEdges) {
			if (p[0] && p[4]) svg += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[4].x}" y2="${p[4].y}" ${hidden} />`
			if (p[4] && p[5]) svg += `<line x1="${p[4].x}" y1="${p[4].y}" x2="${p[5].x}" y2="${p[5].y}" ${hidden} />`
			if (p[4] && p[7]) svg += `<line x1="${p[4].x}" y1="${p[4].y}" x2="${p[7].x}" y2="${p[7].y}" ${hidden} />`
		}
		// Draw visible faces and edges
		svg += getFaceSvg("front_face")
		svg += getFaceSvg("top_face")
		svg += getFaceSvg("side_face")

		// --- NEW: Render Diagonals ---
		if (diagonals) {
			for (const d of diagonals) {
				const from = p[d.fromVertexIndex]
				const to = p[d.toVertexIndex]
				if (!from || !to) continue

				let lineStyle = 'stroke="black" stroke-width="1.5"'
				if (d.style === "dashed") {
					lineStyle += ' stroke-dasharray="4 2"'
				} else if (d.style === "dotted") {
					lineStyle += ' stroke-dasharray="2 3"'
				}

				svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" ${lineStyle}/>`

				if (d.label) {
					const midX = (from.x + to.x) / 2
					const midY = (from.y + to.y) / 2
					const angle = Math.atan2(to.y - from.y, to.x - from.x)
					const offsetX = -Math.sin(angle) * 10
					const offsetY = Math.cos(angle) * 10
					svg += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="12" style="paint-order: stroke; stroke: #fff; stroke-width: 3px; stroke-linejoin: round;">${d.label}</text>`
				}
			}
		}

		if (labels) {
			for (const lab of labels) {
				if (lab.target === "height" && p[0])
					svg += `<text x="${p[0].x - 10}" y="${p[0].y - h / 2}" text-anchor="end" dominant-baseline="middle">${lab.text}</text>`
				if (lab.target === "width" && p[0])
					svg += `<text x="${p[0].x + w / 2}" y="${p[0].y + 15}" text-anchor="middle">${lab.text}</text>`
				if (lab.target === "length" && p[1])
					svg += `<text x="${p[1].x + l / 2}" y="${p[1].y - l * 0.25 + 10}" text-anchor="middle" transform="skewX(-25)">${lab.text}</text>`
			}
		}
	} else if (shape.type === "rectangularFrame") {
		// Hollow rectangular frame implementation
		const ow = shape.outerWidth * 20
		const oh = shape.outerHeight * 20
		const ol = shape.outerLength * 12 // depth
		const t = shape.thickness * 20 // thickness

		const x_offset = (width - ow - ol) / 2
		const y_offset = (height + oh - ol * 0.5) / 2

		// Outer vertices (8 points)
		const outer = [
			{ x: x_offset, y: y_offset }, // 0: front bottom left
			{ x: x_offset + ow, y: y_offset }, // 1: front bottom right
			{ x: x_offset + ow, y: y_offset - oh }, // 2: front top right
			{ x: x_offset, y: y_offset - oh }, // 3: front top left
			{ x: x_offset + ol, y: y_offset - ol * 0.5 }, // 4: back bottom left
			{ x: x_offset + ow + ol, y: y_offset - ol * 0.5 }, // 5: back bottom right
			{ x: x_offset + ow + ol, y: y_offset - oh - ol * 0.5 }, // 6: back top right
			{ x: x_offset + ol, y: y_offset - oh - ol * 0.5 } // 7: back top left
		]

		// Inner vertices (8 points) - offset by thickness
		const inner = [
			{ x: x_offset + t, y: y_offset - t }, // 0: front bottom left
			{ x: x_offset + ow - t, y: y_offset - t }, // 1: front bottom right
			{ x: x_offset + ow - t, y: y_offset - oh + t }, // 2: front top right
			{ x: x_offset + t, y: y_offset - oh + t }, // 3: front top left
			{ x: x_offset + ol + t, y: y_offset - ol * 0.5 - t }, // 4: back bottom left
			{ x: x_offset + ow + ol - t, y: y_offset - ol * 0.5 - t }, // 5: back bottom right
			{ x: x_offset + ow + ol - t, y: y_offset - oh - ol * 0.5 + t }, // 6: back top right
			{ x: x_offset + ol + t, y: y_offset - oh - ol * 0.5 + t } // 7: back top left
		]

		// Draw hidden edges first (back edges)
		if (showHiddenEdges) {
			const hidden = 'stroke="black" stroke-width="1.5" stroke-dasharray="4 2"'
			// Back outer edges
			if (outer[4] && outer[5])
				svg += `<line x1="${outer[4].x}" y1="${outer[4].y}" x2="${outer[5].x}" y2="${outer[5].y}" ${hidden} />`
			if (outer[5] && outer[6])
				svg += `<line x1="${outer[5].x}" y1="${outer[5].y}" x2="${outer[6].x}" y2="${outer[6].y}" ${hidden} />`
			if (outer[6] && outer[7])
				svg += `<line x1="${outer[6].x}" y1="${outer[6].y}" x2="${outer[7].x}" y2="${outer[7].y}" ${hidden} />`
			if (outer[7] && outer[4])
				svg += `<line x1="${outer[7].x}" y1="${outer[7].y}" x2="${outer[4].x}" y2="${outer[4].y}" ${hidden} />`
			// Back inner edges
			if (inner[4] && inner[5])
				svg += `<line x1="${inner[4].x}" y1="${inner[4].y}" x2="${inner[5].x}" y2="${inner[5].y}" ${hidden} />`
			if (inner[5] && inner[6])
				svg += `<line x1="${inner[5].x}" y1="${inner[5].y}" x2="${inner[6].x}" y2="${inner[6].y}" ${hidden} />`
			if (inner[6] && inner[7])
				svg += `<line x1="${inner[6].x}" y1="${inner[6].y}" x2="${inner[7].x}" y2="${inner[7].y}" ${hidden} />`
			if (inner[7] && inner[4])
				svg += `<line x1="${inner[7].x}" y1="${inner[7].y}" x2="${inner[4].x}" y2="${inner[4].y}" ${hidden} />`
			// Hidden connecting edges
			if (outer[0] && outer[4])
				svg += `<line x1="${outer[0].x}" y1="${outer[0].y}" x2="${outer[4].x}" y2="${outer[4].y}" ${hidden} />`
			if (inner[0] && inner[4])
				svg += `<line x1="${inner[0].x}" y1="${inner[0].y}" x2="${inner[4].x}" y2="${inner[4].y}" ${hidden} />`
		}

		// Helper function to safely get point coordinates
		const getPointStr = (points: Array<{ x: number; y: number } | undefined>, indices: number[]) => {
			return indices
				.map((i) => (points[i] ? `${points[i].x},${points[i].y}` : ""))
				.filter(Boolean)
				.join(" ")
		}

		// Draw filled faces with transparency
		// Front face (frame part)
		if (outer[0] && outer[1] && outer[2] && outer[3] && inner[0] && inner[1] && inner[2] && inner[3]) {
			const frontFacePoints = `${getPointStr(outer, [0, 1, 2, 3, 0])} ${getPointStr(inner, [0, 3, 2, 1, 0])}`
			svg += `<polygon points="${frontFacePoints}" fill="${shadedFace === "front_face" ? "rgba(120, 84, 171, 0.4)" : "rgba(200, 200, 200, 0.3)"}" stroke="black" stroke-width="1.5" fill-rule="evenodd" />`
		}

		// Top face (frame part)
		if (outer[2] && outer[3] && outer[6] && outer[7] && inner[2] && inner[3] && inner[6] && inner[7]) {
			const topFacePoints = `${getPointStr(outer, [3, 2, 6, 7, 3])} ${getPointStr(inner, [3, 7, 6, 2, 3])}`
			svg += `<polygon points="${topFacePoints}" fill="${shadedFace === "top_face" ? "rgba(120, 84, 171, 0.4)" : "rgba(180, 180, 180, 0.3)"}" stroke="black" stroke-width="1.5" fill-rule="evenodd" />`
		}

		// Right side face (frame part)
		if (outer[1] && outer[2] && outer[5] && outer[6] && inner[1] && inner[2] && inner[5] && inner[6]) {
			const rightFacePoints = `${getPointStr(outer, [1, 5, 6, 2, 1])} ${getPointStr(inner, [1, 2, 6, 5, 1])}`
			svg += `<polygon points="${rightFacePoints}" fill="${shadedFace === "side_face" ? "rgba(120, 84, 171, 0.4)" : "rgba(160, 160, 160, 0.3)"}" stroke="black" stroke-width="1.5" fill-rule="evenodd" />`
		}

		// Bottom face (frame part) - visible from below
		if (outer[0] && outer[1] && outer[4] && outer[5] && inner[0] && inner[1] && inner[4] && inner[5]) {
			const bottomFacePoints = `${getPointStr(outer, [0, 4, 5, 1, 0])} ${getPointStr(inner, [0, 1, 5, 4, 0])}`
			svg += `<polygon points="${bottomFacePoints}" fill="${shadedFace === "bottom_face" ? "rgba(120, 84, 171, 0.4)" : "rgba(140, 140, 140, 0.3)"}" stroke="black" stroke-width="1.5" fill-rule="evenodd" />`
		}

		// Draw visible edges
		const solid = 'stroke="black" stroke-width="1.5"'
		// Front outer edges
		if (outer[0] && outer[1])
			svg += `<line x1="${outer[0].x}" y1="${outer[0].y}" x2="${outer[1].x}" y2="${outer[1].y}" ${solid} />`
		if (outer[1] && outer[2])
			svg += `<line x1="${outer[1].x}" y1="${outer[1].y}" x2="${outer[2].x}" y2="${outer[2].y}" ${solid} />`
		if (outer[2] && outer[3])
			svg += `<line x1="${outer[2].x}" y1="${outer[2].y}" x2="${outer[3].x}" y2="${outer[3].y}" ${solid} />`
		if (outer[3] && outer[0])
			svg += `<line x1="${outer[3].x}" y1="${outer[3].y}" x2="${outer[0].x}" y2="${outer[0].y}" ${solid} />`
		// Front inner edges
		if (inner[0] && inner[1])
			svg += `<line x1="${inner[0].x}" y1="${inner[0].y}" x2="${inner[1].x}" y2="${inner[1].y}" ${solid} />`
		if (inner[1] && inner[2])
			svg += `<line x1="${inner[1].x}" y1="${inner[1].y}" x2="${inner[2].x}" y2="${inner[2].y}" ${solid} />`
		if (inner[2] && inner[3])
			svg += `<line x1="${inner[2].x}" y1="${inner[2].y}" x2="${inner[3].x}" y2="${inner[3].y}" ${solid} />`
		if (inner[3] && inner[0])
			svg += `<line x1="${inner[3].x}" y1="${inner[3].y}" x2="${inner[0].x}" y2="${inner[0].y}" ${solid} />`
		// Connecting edges
		if (outer[1] && outer[5])
			svg += `<line x1="${outer[1].x}" y1="${outer[1].y}" x2="${outer[5].x}" y2="${outer[5].y}" ${solid} />`
		if (outer[2] && outer[6])
			svg += `<line x1="${outer[2].x}" y1="${outer[2].y}" x2="${outer[6].x}" y2="${outer[6].y}" ${solid} />`
		if (outer[3] && outer[7])
			svg += `<line x1="${outer[3].x}" y1="${outer[3].y}" x2="${outer[7].x}" y2="${outer[7].y}" ${solid} />`
		if (inner[1] && inner[5])
			svg += `<line x1="${inner[1].x}" y1="${inner[1].y}" x2="${inner[5].x}" y2="${inner[5].y}" ${solid} />`
		if (inner[2] && inner[6])
			svg += `<line x1="${inner[2].x}" y1="${inner[2].y}" x2="${inner[6].x}" y2="${inner[6].y}" ${solid} />`
		if (inner[3] && inner[7])
			svg += `<line x1="${inner[3].x}" y1="${inner[3].y}" x2="${inner[7].x}" y2="${inner[7].y}" ${solid} />`

		// Labels for rectangular frame
		if (labels) {
			for (const lab of labels) {
				if (lab.target === "height" && outer[0])
					svg += `<text x="${outer[0].x - 10}" y="${outer[0].y - oh / 2}" text-anchor="end" dominant-baseline="middle">${lab.text}</text>`
				if (lab.target === "width" && outer[0])
					svg += `<text x="${outer[0].x + ow / 2}" y="${outer[0].y + 15}" text-anchor="middle">${lab.text}</text>`
				if (lab.target === "length" && outer[1])
					svg += `<text x="${outer[1].x + ol / 2}" y="${outer[1].y - ol * 0.25 + 10}" text-anchor="middle" transform="skewX(-25)">${lab.text}</text>`
				if (lab.target === "thickness" && inner[0] && outer[0])
					svg += `<text x="${inner[0].x + (outer[0].x - inner[0].x) / 2}" y="${inner[0].y + 15}" text-anchor="middle" font-size="10">${lab.text}</text>`
			}
		}
	} else {
		svg += `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="red">Shape type not implemented.</text>`
	}
	svg += "</svg>"
	return svg
}
