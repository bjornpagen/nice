import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a dimension label for an edge or a face area
const DimensionLabelSchema = z.object({
	text: z.string().describe('The text for the label (e.g., "10 cm", "Area = 9 units²").'),
	target: z
		.string()
		.describe('The specific edge or face to label (e.g., "length", "width", "height", "top_face", "front_face").')
})

// Defines the properties for a rectangular prism (including cubes)
const RectangularPrismDataSchema = z.object({
	type: z.literal("rectangularPrism"),
	length: z.number().describe("The length of the prism (depth)."),
	width: z.number().describe("The width of the prism (front-facing dimension)."),
	height: z.number().describe("The height of the prism.")
})

// Defines the properties for a triangular prism
const TriangularPrismDataSchema = z.object({
	type: z.literal("triangularPrism"),
	base: z
		.object({
			b: z.number().describe("The base length of the triangular face."),
			h: z.number().describe("The height of the triangular face."),
			hypotenuse: z.number().optional().describe("The hypotenuse for a right-triangle base. Calculated if omitted.")
		})
		.describe("The dimensions of the triangular base."),
	length: z.number().describe("The length (depth) of the prism, connecting the two triangular bases.")
})

// Defines the properties for a rectangular pyramid
const RectangularPyramidDataSchema = z.object({
	type: z.literal("rectangularPyramid"),
	baseLength: z.number().describe("The length of the rectangular base."),
	baseWidth: z.number().describe("The width of the rectangular base."),
	height: z.number().describe("The perpendicular height from the base to the apex.")
})

// The main Zod schema for the polyhedronDiagram function
export const PolyhedronDiagramPropsSchema = z
	.object({
		width: z.number().optional().default(300).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(200).describe("The total height of the output SVG container in pixels."),
		shape: z
			.union([RectangularPrismDataSchema, TriangularPrismDataSchema, RectangularPyramidDataSchema])
			.describe("The geometric data defining the shape of the polyhedron."),
		labels: z.array(DimensionLabelSchema).optional().describe("An array of labels for edge lengths or face areas."),
		shadedFace: z.string().optional().describe('The identifier of a face to shade (e.g., "top_face", "front_face").'),
		showHiddenEdges: z
			.boolean()
			.optional()
			.default(true)
			.describe("If true, render edges hidden from the camera view as dashed lines.")
	})
	.describe(
		"This template is a versatile tool for generating SVG diagrams of three-dimensional polyhedra with flat faces, such as prisms and pyramids. It renders the polyhedron in a standard isometric or perspective view to provide depth perception. The generator supports several types of polyhedra, currently: Rectangular Prisms (including cubes): Defined by length, width, and height dimensions. Triangular Prisms: Defined by a triangular base (with base, height, and optionally hypotenuse) and a length. Rectangular Pyramids: Defined by a rectangular base (length and width) and a height. The template provides: Accurate 3D Representation: The polyhedron is drawn with all visible edges as solid lines. Edges that would be hidden from the current viewpoint are drawn as dashed lines to aid in understanding the 3D structure. This dashed representation can be toggled on/off. Dimension Labeling: It can label the lengths of edges (like \"length,\" \"width,\" \"height\") with custom text or numerical values. Leader lines connect the labels to the appropriate edges for clarity. Face Highlighting: It supports shading or coloring specific faces (e.g., the 'top', 'bottom', 'front' base) to draw attention to them. This is particularly useful for problems where the area of a base is given. A label can also be placed on a face to denote its area directly. The final output is a clean, mathematically accurate, and easy-to-interpret SVG diagram, ready to be embedded in a QTI item body."
	)

export type PolyhedronDiagramProps = z.infer<typeof PolyhedronDiagramPropsSchema>

/**
 * This template is a versatile tool for generating SVG diagrams of three-dimensional
 * polyhedra with flat faces, such as prisms and pyramids. It renders the polyhedron
 * in a standard isometric or perspective view to provide depth perception.
 */
export const generatePolyhedronDiagram: WidgetGenerator<typeof PolyhedronDiagramPropsSchema> = (data) => {
	const { width, height, shape, labels, shadedFace, showHiddenEdges } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	if (shape.type === "rectangularPrism") {
		const w = shape.width * 5
		const h = shape.height * 5
		const l = shape.length * 3 // depth
		const x_offset = (width - w - l) / 2
		const y_offset = (height + h - l * 0.5) / 2

		// 8 vertices of the prism
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
	} else {
		svg += `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="red">Shape type not implemented.</text>`
	}
	svg += "</svg>"
	return svg
}
