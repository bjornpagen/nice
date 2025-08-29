import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"

// Defines a dimension label for an edge or a face area
const DimensionLabel = z
	.object({
		text: z
			.string()
			.describe(
				"The label text to display (e.g., '10 cm', 'h = 5', 'length', '8'). Can include units or variable names."
			),
		target: z
			.string()
			.describe(
				"Which dimension to label: 'length', 'width', 'height', 'slantHeight', or face names like 'topFace', 'frontFace', 'baseFace'."
			)
	})
	.strict()

// Defines the properties for a rectangular prism (including cubes)
const RectangularPrismDataSchema = z
	.object({
		type: z.literal("rectangularPrism"),
		length: z.number().positive().describe("The length of the prism (depth)."),
		width: z.number().positive().describe("The width of the prism (front-facing dimension)."),
		height: z.number().positive().describe("The height of the prism.")
	})
	.strict()

// Factory: triangular base dimensions (avoid reusing schema instance to prevent $ref)
function createTriangularBaseSchema() {
	return z
		.object({
			b: z.number().positive().describe("The base length of the triangular face."),
			h: z.number().positive().describe("The height of the triangular face."),
			hypotenuse: z.number().positive().describe("The hypotenuse for a right-triangle base.")
		})
		.strict()
}

// Defines the properties for a triangular prism
const TriangularPrismDataSchema = z
	.object({
		type: z.literal("triangularPrism"),
		base: createTriangularBaseSchema().describe("The dimensions of the triangular base."),
		length: z.number().positive().describe("The length (depth) of the prism, connecting the two triangular bases.")
	})
	.strict()

// Defines the properties for a rectangular pyramid
const RectangularPyramidDataSchema = z
	.object({
		type: z.literal("rectangularPyramid"),
		baseLength: z.number().positive().describe("The length of the rectangular base."),
		baseWidth: z.number().positive().describe("The width of the rectangular base."),
		height: z.number().positive().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines the properties for a triangular pyramid (tetrahedron)
const TriangularPyramidDataSchema = z
	.object({
		type: z.literal("triangularPyramid"),
		base: createTriangularBaseSchema().describe("The dimensions of the triangular base."),
		height: z.number().positive().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines a diagonal line to be drawn between two vertices.
const Diagonal = z
	.object({
		fromVertexIndex: z
			.number()
			.int()
			.describe(
				"Starting vertex index (0-based) for the diagonal. Vertices are numbered systematically by the shape type."
			),
		toVertexIndex: z
			.number()
			.int()
			.describe("Ending vertex index (0-based) for the diagonal. Must be different from fromVertexIndex."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("Text label for the diagonal's length (e.g., '12.7 cm', 'd = 15', '√50', null). Null means no label."),
		style: z
			.enum(["solid", "dashed", "dotted"])
			.describe(
				"Visual style of the diagonal. 'solid' for main diagonals, 'dashed' for hidden parts, 'dotted' for construction lines."
			)
	})
	.strict()

// The main Zod schema for the polyhedronDiagram function
export const PolyhedronDiagramPropsSchema = z
	.object({
		type: z.literal("polyhedronDiagram").describe("Identifies this as a 3D polyhedron diagram widget."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the 3D projection and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 350, 400, 300). Should fit the isometric view comfortably."
			),
		shape: z
			.discriminatedUnion("type", [
				RectangularPrismDataSchema.describe("A box-shaped prism with rectangular faces."),
				TriangularPrismDataSchema.describe("A prism with triangular bases and rectangular sides."),
				RectangularPyramidDataSchema.describe("A pyramid with a rectangular base and triangular faces."),
				TriangularPyramidDataSchema.describe("A pyramid with a triangular base (tetrahedron when regular).")
			])
			.describe("The specific 3D shape to render with its dimensions. Each type has different dimension requirements."),
		labels: z
			.array(DimensionLabel)
			.describe(
				"Dimension labels to display on edges or faces. Empty array means no labels. Can label multiple dimensions and faces."
			),
		diagonals: z
			.array(Diagonal)
			.describe(
				"Space diagonals or face diagonals to draw. Empty array means no diagonals. Useful for distance calculations and 3D geometry."
			),
		shadedFace: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Face identifier to shade/highlight: 'topFace', 'bottomFace', 'frontFace', 'backFace', 'leftFace', 'rightFace', 'baseFace', or null. Null means no shading."
			),
		showHiddenEdges: z
			.boolean()
			.describe(
				"Whether to show edges hidden behind the solid as dashed lines. True for mathematical clarity, false for realistic view."
			)
	})
	.strict()
	.describe(
		"Creates 3D diagrams of prisms and pyramids in isometric projection. Shows vertices, edges, faces with optional labels, diagonals, and face highlighting. Essential for teaching 3D geometry, volume, surface area, and spatial visualization. Supports both solid and wireframe views with hidden edge visibility control."
	)

export type PolyhedronDiagramProps = z.infer<typeof PolyhedronDiagramPropsSchema>

/**
 * This template is a versatile tool for generating SVG diagrams of three-dimensional
 * polyhedra with flat faces, such as prisms and pyramids. It renders the shapes in a
 * standard isometric or perspective view to provide depth perception.
 */
export const generatePolyhedronDiagram: WidgetGenerator<typeof PolyhedronDiagramPropsSchema> = (data) => {
	const { width, height, shape, labels, diagonals, shadedFace, showHiddenEdges } = data

	const ext = initExtents(width)
	let svgContent = ""

	switch (shape.type) {
		case "rectangularPrism": {
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

			// Track all vertices
			p.forEach(vertex => includePointX(ext, vertex.x))

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
				return `<polygon points="${pointsStr}" fill="${shadedFace === faceName ? face.color : "none"}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" />`
			}

			const hidden = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
			// const _solid = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"' // Not used, can be removed

			// Draw hidden elements first
			if (showHiddenEdges) {
				if (p[0] && p[4]) svgContent += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[4].x}" y2="${p[4].y}" ${hidden} />`
				if (p[4] && p[5]) svgContent += `<line x1="${p[4].x}" y1="${p[4].y}" x2="${p[5].x}" y2="${p[5].y}" ${hidden} />`
				if (p[4] && p[7]) svgContent += `<line x1="${p[4].x}" y1="${p[4].y}" x2="${p[7].x}" y2="${p[7].y}" ${hidden} />`
			}
			// Draw visible faces and edges
			svgContent += getFaceSvg("front_face")
			svgContent += getFaceSvg("top_face")
			svgContent += getFaceSvg("side_face")

			// --- Render Diagonals ---
			for (const d of diagonals) {
				const from = p[d.fromVertexIndex]
				const to = p[d.toVertexIndex]
				if (!from || !to) continue

				let lineStyle = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"'
				if (d.style === "dashed") {
					lineStyle += ' stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
				} else if (d.style === "dotted") {
					lineStyle += ' stroke-dasharray="2 3"'
				}

				svgContent += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" ${lineStyle}/>`

				if (d.label) {
					const midX = (from.x + to.x) / 2
					const midY = (from.y + to.y) / 2
					const angle = Math.atan2(to.y - from.y, to.x - from.x)
					const offsetX = -Math.sin(angle) * 10
					const offsetY = Math.cos(angle) * 10
					svgContent += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="${theme.colors.black}" text-anchor="middle" dominant-baseline="middle" font-size="${theme.font.size.base}" style="paint-order: stroke; stroke: ${theme.colors.white}; stroke-width: 3px; stroke-linejoin: round;">${d.label}</text>`
					includeText(ext, midX + offsetX, d.label, "middle")
				}
			}

			for (const lab of labels) {
				if (lab.target === "height" && p[0]) {
					const textX = p[0].x - 10
					const textY = p[0].y - h / 2
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="end" dominant-baseline="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "end")
				}
				if (lab.target === "width" && p[0]) {
					const textX = p[0].x + w / 2
					const textY = p[0].y + 15
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				}
				if (lab.target === "length" && p[1]) {
					const textX = p[1].x + l / 2
					const textY = p[1].y - l * 0.25 + 10
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle" transform="skewX(-25)">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				}
			}
			break
		}
		case "triangularPrism": {
			const { b, h } = shape.base
			const l = shape.length * 3 // depth scaling
			const w = b * 5 // base width scaling
			const hScaled = h * 5 // height scaling

			// Center the shape
			const x_offset = (width - w - l) / 2
			const y_offset = (height + hScaled - l * 0.5) / 2

			// 6 vertices of the triangular prism
			// Front triangle: 0 (bottom left), 1 (bottom right), 2 (top)
			// Back triangle: 3 (bottom left), 4 (bottom right), 5 (top)
			const p = [
				{ x: x_offset, y: y_offset }, // 0: front bottom left
				{ x: x_offset + w, y: y_offset }, // 1: front bottom right
				{ x: x_offset + w / 2, y: y_offset - hScaled }, // 2: front top
				{ x: x_offset + l, y: y_offset - l * 0.5 }, // 3: back bottom left
				{ x: x_offset + w + l, y: y_offset - l * 0.5 }, // 4: back bottom right
				{ x: x_offset + w / 2 + l, y: y_offset - hScaled - l * 0.5 } // 5: back top
			]

			// Track all vertices
			p.forEach(vertex => includePointX(ext, vertex.x))

			// Define faces for triangular prism
			const faces = {
				front_face: { points: [p[0], p[1], p[2]], color: "rgba(255,0,0,0.2)" },
				back_face: { points: [p[3], p[4], p[5]], color: "rgba(128,128,128,0.2)" },
				bottom_face: { points: [p[0], p[1], p[4], p[3]], color: "rgba(255,255,0,0.2)" },
				side_face_left: { points: [p[0], p[3], p[5], p[2]], color: "rgba(0,255,0,0.2)" },
				side_face_right: { points: [p[1], p[2], p[5], p[4]], color: "rgba(0,0,255,0.2)" }
			}

			// Helper to draw face
			const drawFace = (faceName: keyof typeof faces) => {
				const face = faces[faceName]
				const pointsStr = face.points
					.map((pt) => (pt ? `${pt.x},${pt.y}` : ""))
					.filter(Boolean)
					.join(" ")
				return `<polygon points="${pointsStr}" fill="${shadedFace === faceName ? face.color : "none"}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" />`
			}

			const hidden = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'

			// Draw hidden edges first
			if (showHiddenEdges) {
				// Hidden back triangle edges
				if (p[3] && p[4]) svgContent += `<line x1="${p[3].x}" y1="${p[3].y}" x2="${p[4].x}" y2="${p[4].y}" ${hidden} />`
				if (p[3] && p[5]) svgContent += `<line x1="${p[3].x}" y1="${p[3].y}" x2="${p[5].x}" y2="${p[5].y}" ${hidden} />`
				if (p[4] && p[5]) svgContent += `<line x1="${p[4].x}" y1="${p[4].y}" x2="${p[5].x}" y2="${p[5].y}" ${hidden} />`
			}

			// Draw visible faces
			svgContent += drawFace("bottom_face")
			svgContent += drawFace("side_face_left")
			svgContent += drawFace("side_face_right")
			svgContent += drawFace("front_face")

			// Draw diagonals if specified
			for (const d of diagonals) {
				const from = p[d.fromVertexIndex]
				const to = p[d.toVertexIndex]
				if (!from || !to) continue

				let lineStyle = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"'
				if (d.style === "dashed") {
					lineStyle += ' stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
				} else if (d.style === "dotted") {
					lineStyle += ' stroke-dasharray="2 3"'
				}

				svgContent += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" ${lineStyle}/>`

				if (d.label) {
					const midX = (from.x + to.x) / 2
					const midY = (from.y + to.y) / 2
					const angle = Math.atan2(to.y - from.y, to.x - from.x)
					const offsetX = -Math.sin(angle) * 10
					const offsetY = Math.cos(angle) * 10
					svgContent += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="${theme.colors.black}" text-anchor="middle" dominant-baseline="middle" font-size="${theme.font.size.base}" style="paint-order: stroke; stroke: ${theme.colors.white}; stroke-width: 3px; stroke-linejoin: round;">${d.label}</text>`
					includeText(ext, midX + offsetX, d.label, "middle")
				}
			}

			// Draw labels
			for (const lab of labels) {
				if (lab.target === "base" && p[0] && p[1]) {
					const textX = (p[0].x + p[1].x) / 2
					const textY = p[0].y + 15
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				} else if (lab.target === "height" && p[0] && p[2]) {
					const textX = p[0].x - 10
					const textY = (p[0].y + p[2].y) / 2
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="end" dominant-baseline="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "end")
				} else if (lab.target === "length" && p[1] && p[4]) {
					const textX = (p[1].x + p[4].x) / 2
					const textY = (p[1].y + p[4].y) / 2 + 15
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				}
			}
			break
		}
		case "rectangularPyramid": {
			const w = shape.baseWidth * 5
			const l = shape.baseLength * 3 // depth
			const h = shape.height * 5

			// Center the shape
			const x_offset = (width - w - l) / 2
			const y_offset = (height + h - l * 0.5) / 2

			// 5 vertices of the pyramid
			// Base rectangle: 0 (front left), 1 (front right), 2 (back right), 3 (back left)
			// Apex: 4
			const p = [
				{ x: x_offset, y: y_offset }, // 0: base front left
				{ x: x_offset + w, y: y_offset }, // 1: base front right
				{ x: x_offset + w + l, y: y_offset - l * 0.5 }, // 2: base back right
				{ x: x_offset + l, y: y_offset - l * 0.5 }, // 3: base back left
				{ x: x_offset + w / 2 + l / 2, y: y_offset - h - l * 0.25 } // 4: apex
			]

			// Track all vertices
			p.forEach(vertex => includePointX(ext, vertex.x))

			// Define faces
			const faces = {
				base_face: { points: [p[0], p[1], p[2], p[3]], color: "rgba(255,255,0,0.2)" },
				front_face: { points: [p[0], p[1], p[4]], color: "rgba(255,0,0,0.2)" },
				right_face: { points: [p[1], p[2], p[4]], color: "rgba(0,0,255,0.2)" },
				back_face: { points: [p[2], p[3], p[4]], color: "rgba(128,128,128,0.2)" },
				left_face: { points: [p[3], p[0], p[4]], color: "rgba(0,255,0,0.2)" }
			}

			// Helper to draw face
			const drawFace = (faceName: keyof typeof faces) => {
				const face = faces[faceName]
				const pointsStr = face.points
					.map((pt) => (pt ? `${pt.x},${pt.y}` : ""))
					.filter(Boolean)
					.join(" ")
				return `<polygon points="${pointsStr}" fill="${shadedFace === faceName ? face.color : "none"}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" />`
			}

			const hidden = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
			const solid = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"'

			// Draw hidden edges first
			if (showHiddenEdges) {
				// Hidden base edges
				if (p[0] && p[3]) svgContent += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[3].x}" y2="${p[3].y}" ${hidden} />`
				if (p[3] && p[2]) svgContent += `<line x1="${p[3].x}" y1="${p[3].y}" x2="${p[2].x}" y2="${p[2].y}" ${hidden} />`
				// Hidden edge from back left base to apex
				if (p[3] && p[4]) svgContent += `<line x1="${p[3].x}" y1="${p[3].y}" x2="${p[4].x}" y2="${p[4].y}" ${hidden} />`
			}

			// Draw visible faces
			svgContent += drawFace("front_face")
			svgContent += drawFace("right_face")
			svgContent += drawFace("left_face")

			// Draw visible edges that aren't part of filled faces (or are drawn on top)
			if (p[0] && p[1]) svgContent += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[1].x}" y2="${p[1].y}" ${solid} />`
			if (p[1] && p[2]) svgContent += `<line x1="${p[1].x}" y1="${p[1].y}" x2="${p[2].x}" y2="${p[2].y}" ${solid} />`
			if (p[2] && p[4]) svgContent += `<line x1="${p[2].x}" y1="${p[2].y}" x2="${p[4].x}" y2="${p[4].y}" ${solid} />`

			// Draw diagonals if specified
			for (const d of diagonals) {
				const from = p[d.fromVertexIndex]
				const to = p[d.toVertexIndex]
				if (!from || !to) continue

				let lineStyle = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"'
				if (d.style === "dashed") {
					lineStyle += ' stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
				} else if (d.style === "dotted") {
					lineStyle += ' stroke-dasharray="2 3"'
				}

				svgContent += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" ${lineStyle}/>`

				if (d.label) {
					const midX = (from.x + to.x) / 2
					const midY = (from.y + to.y) / 2
					const angle = Math.atan2(to.y - from.y, to.x - from.x)
					const offsetX = -Math.sin(angle) * 10
					const offsetY = Math.cos(angle) * 10
					svgContent += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="${theme.colors.black}" text-anchor="middle" dominant-baseline="middle" font-size="${theme.font.size.base}" style="paint-order: stroke; stroke: ${theme.colors.white}; stroke-width: 3px; stroke-linejoin: round;">${d.label}</text>`
					includeText(ext, midX + offsetX, d.label, "middle")
				}
			}

			// Draw labels
			for (const lab of labels) {
				if (lab.target === "baseWidth" && p[0] && p[1]) {
					const textX = (p[0].x + p[1].x) / 2
					const textY = p[0].y + 15
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				} else if (lab.target === "baseLength" && p[1] && p[2]) {
					const textX = (p[1].x + p[2].x) / 2
					const textY = (p[1].y + p[2].y) / 2 + 15
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				} else if (lab.target === "height" && p[4]) {
					// Draw height line from base center to apex
					if (p[0] && p[2]) {
						const baseCenterX = (p[0].x + p[2].x) / 2
						const baseCenterY = (p[0].y + p[2].y) / 2
						svgContent += `<line x1="${baseCenterX}" y1="${baseCenterY}" x2="${p[4].x}" y2="${p[4].y}" stroke="${theme.colors.gridMinor}" stroke-width="${theme.stroke.width.thin}" stroke-dasharray="${theme.stroke.dasharray.dotted}" />`
						const textX = baseCenterX - 10
						const textY = (baseCenterY + p[4].y) / 2
						svgContent += `<text x="${textX}" y="${textY}" text-anchor="end" dominant-baseline="middle">${lab.text}</text>`
						includeText(ext, textX, lab.text, "end")
					}
				}
			}
			break
		}
		case "triangularPyramid": {
			const { b, h } = shape.base // b: base length (width of front base edge), h: base triangle height (creates depth for the base)
			const pyrH = shape.height // pyramid vertical height

			const b_scaled = b * 5 // width of the front base edge
			const h_base_depth_scaled = h * 3 // simulates the depth of the base triangle in isometric view
			const pyr_h_scaled = pyrH * 5 // vertical height of the pyramid

			// Adjust offsets to center the overall pyramid
			// Max width consideration: b_scaled (front base) + h_base_depth_scaled (depth extension for back vertex)
			// Max height consideration: pyr_h_scaled (pyramid height) + h_base_depth_scaled * 0.5 (y-offset of base back vertex)
			const max_display_width = b_scaled + h_base_depth_scaled
			const max_display_height = pyr_h_scaled + h_base_depth_scaled * 0.5

			const x_offset = (width - max_display_width) / 2
			const y_offset = (height + max_display_height) / 2

			// 4 vertices of the triangular pyramid
			// Base: 0 (front-left), 1 (front-right), 2 (back-center vertex of base triangle)
			// Apex: 3
			// Define base vertices
			const frontLeft = { x: x_offset, y: y_offset } // 0: front-left base corner
			const frontRight = { x: x_offset + b_scaled, y: y_offset } // 1: front-right base corner
			const backVertex = { x: x_offset + b_scaled / 2 + h_base_depth_scaled, y: y_offset - h_base_depth_scaled * 0.5 } // 2: back vertex of base triangle

			// Calculate base centroid for apex placement
			const base_centroid_x = (frontLeft.x + frontRight.x + backVertex.x) / 3
			const base_centroid_y = (frontLeft.y + frontRight.y + backVertex.y) / 3
			const apex = { x: base_centroid_x, y: base_centroid_y - pyr_h_scaled } // 3: apex

			// Build vertex array
			const p = [frontLeft, frontRight, backVertex, apex]

			// Track all vertices
			p.forEach(vertex => includePointX(ext, vertex.x))

			// Define faces
			const faces = {
				base_face: { points: [p[0], p[1], p[2]], color: "rgba(255,255,0,0.2)" }, // bottom triangular base
				front_face: { points: [p[0], p[1], p[3]], color: "rgba(255,0,0,0.2)" },
				right_face: { points: [p[1], p[2], p[3]], color: "rgba(0,0,255,0.2)" },
				left_face: { points: [p[2], p[0], p[3]], color: "rgba(0,255,0,0.2)" }
			}

			// Helper to draw face
			const drawFace = (faceName: keyof typeof faces) => {
				const face = faces[faceName]
				const pointsStr = face.points
					.map((pt) => (pt ? `${pt.x},${pt.y}` : ""))
					.filter(Boolean)
					.join(" ")
				return `<polygon points="${pointsStr}" fill="${shadedFace === faceName ? face.color : "none"}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" />`
			}

			const hidden = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}" stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
			const solid = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"'

			// Draw hidden edges first
			if (showHiddenEdges) {
				// Edges of the base triangle that might be hidden or partially hidden from front view
				if (p[0] && p[2]) svgContent += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[2].x}" y2="${p[2].y}" ${hidden} />` // Back-left base edge
				if (p[1] && p[2]) svgContent += `<line x1="${p[1].x}" y1="${p[1].y}" x2="${p[2].x}" y2="${p[2].y}" ${hidden} />` // Back-right base edge
				// Edge from the back base vertex to the apex
				if (p[2] && p[3]) svgContent += `<line x1="${p[2].x}" y1="${p[2].y}" x2="${p[3].x}" y2="${p[3].y}" ${hidden} />`
			}

			// Draw faces (order matters for overlapping with semi-transparent fills)
			svgContent += drawFace("base_face")
			svgContent += drawFace("front_face")
			svgContent += drawFace("right_face")
			svgContent += drawFace("left_face")

			// Draw visible edges that are not covered by faces (front base edge, and edges to apex)
			if (p[0] && p[1]) svgContent += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[1].x}" y2="${p[1].y}" ${solid} />` // Front base edge
			if (p[0] && p[3]) svgContent += `<line x1="${p[0].x}" y1="${p[0].y}" x2="${p[3].x}" y2="${p[3].y}" ${solid} />` // Front-left edge to apex
			if (p[1] && p[3]) svgContent += `<line x1="${p[1].x}" y1="${p[1].y}" x2="${p[3].x}" y2="${p[3].y}" ${solid} />` // Front-right edge to apex

			// Draw diagonals if specified
			for (const d of diagonals) {
				const from = p[d.fromVertexIndex]
				const to = p[d.toVertexIndex]
				if (!from || !to) continue

				let lineStyle = 'stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"'
				if (d.style === "dashed") {
					lineStyle += ' stroke-dasharray="${theme.stroke.dasharray.dashedShort}"'
				} else if (d.style === "dotted") {
					lineStyle += ' stroke-dasharray="2 3"'
				}

				svgContent += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" ${lineStyle}/>`

				if (d.label) {
					const midX = (from.x + to.x) / 2
					const midY = (from.y + to.y) / 2
					const angle = Math.atan2(to.y - from.y, to.x - from.x)
					const offsetX = -Math.sin(angle) * 10
					const offsetY = Math.cos(angle) * 10
					svgContent += `<text x="${midX + offsetX}" y="${midY + offsetY}" fill="${theme.colors.black}" text-anchor="middle" dominant-baseline="middle" font-size="${theme.font.size.base}" style="paint-order: stroke; stroke: ${theme.colors.white}; stroke-width: 3px; stroke-linejoin: round;">${d.label}</text>`
					includeText(ext, midX + offsetX, d.label, "middle")
				}
			}

			// Draw labels
			for (const lab of labels) {
				if (lab.target === "baseLength" && p[0] && p[1]) {
					// Label for the base triangle's 'b' (front edge)
					const textX = (p[0].x + p[1].x) / 2
					const textY = p[0].y + 15
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "middle")
				} else if (lab.target === "baseHeight" && p[0] && p[1] && p[2]) {
					// Label for the base triangle's 'h' (perpendicular height/depth)
					// Draw a guide line from midpoint of front base to back vertex
					const mid_p0_p1_x = (p[0].x + p[1].x) / 2
					const mid_p0_p1_y = (p[0].y + p[1].y) / 2
					svgContent += `<line x1="${mid_p0_p1_x}" y1="${mid_p0_p1_y}" x2="${p[2].x}" y2="${p[2].y}" stroke="${theme.colors.gridMinor}" stroke-width="${theme.stroke.width.thin}" stroke-dasharray="${theme.stroke.dasharray.dotted}" />`
					const textX = (mid_p0_p1_x + p[2].x) / 2 + 10
					const textY = (mid_p0_p1_y + p[2].y) / 2
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="start" dominant-baseline="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "start")
				} else if (lab.target === "height" && p[0] && p[1] && p[2] && p[3]) {
					// Label for pyramid height
					// Draw height line from base centroid to apex
					const base_centroid_x_for_label = (p[0].x + p[1].x + p[2].x) / 3
					const base_centroid_y_for_label = (p[0].y + p[1].y + p[2].y) / 3
					svgContent += `<line x1="${base_centroid_x_for_label}" y1="${base_centroid_y_for_label}" x2="${p[3].x}" y2="${p[3].y}" stroke="${theme.colors.gridMinor}" stroke-width="${theme.stroke.width.thin}" stroke-dasharray="${theme.stroke.dasharray.dotted}" />`
					const textX = base_centroid_x_for_label - 10
					const textY = (base_centroid_y_for_label + p[3].y) / 2
					svgContent += `<text x="${textX}" y="${textY}" text-anchor="end" dominant-baseline="middle">${lab.text}</text>`
					includeText(ext, textX, lab.text, "end")
				}
			}
			break
		}
	}
	// Final assembly with dynamic width
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	let svg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">`
	svg += svgContent
	svg += "</svg>"
	return svg
}
