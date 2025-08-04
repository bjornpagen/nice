import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidBaseShape = errors.new("invalid base shape for polyhedron type")

// Defines a square base shape
const SquareBaseSchema = z
	.object({
		type: z.literal("square"),
		side: z.number()
	})
	.strict()

// Defines a rectangle base shape
const RectangleBaseSchema = z
	.object({
		type: z.literal("rectangle"),
		length: z.number(),
		width: z.number()
	})
	.strict()

// Defines a triangle base shape
const TriangleBaseSchema = z
	.object({
		type: z.literal("triangle"),
		base: z.number(),
		height: z.number(),
		side1: z.number(),
		side2: z.number()
	})
	.strict()

// Defines the dimensions for the faces of the net.
const FaceDimensionsSchema = z
	.object({
		base: z
			.discriminatedUnion("type", [SquareBaseSchema, RectangleBaseSchema, TriangleBaseSchema])
			.describe("The primary base shape of the polyhedron."),
		lateralHeight: z
			.number()
			.nullable()
			.describe("The height of the lateral rectangular faces (for prisms) or triangular faces (for pyramids).")
	})
	.strict()

// The main Zod schema for the polyhedronNetDiagram function
export const PolyhedronNetDiagramPropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 350)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total height of the output SVG container in pixels."),
		polyhedronType: z
			.enum(["cube", "rectangularPrism", "triangularPrism", "squarePyramid", "triangularPyramid"])
			.describe("The type of polyhedron for which to generate a net."),
		dimensions: FaceDimensionsSchema.describe("An object specifying the dimensions of the faces."),
		showLabels: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe("If true, display the dimension labels on the net.")
	})
	.strict()
	.describe(
		'This template generates a two-dimensional "net" of a 3D polyhedron as an SVG graphic. A net is a 2D pattern that can be folded to form the 3D shape, and this template is essential for questions about surface area and the relationship between 2D and 3D geometry. The generator will render a specific, standard layout for the net of a given polyhedron. It programmatically arranges the component faces (squares, rectangles, triangles) in a connected pattern. This template is designed to create nets for various shapes: Cube: A cross-shaped layout of six identical squares. Rectangular Prism: A layout of six rectangles, typically with four in a row and two attached as "lids". Triangular Prism: A layout of three rectangles in a row with two triangular bases attached. Square Pyramid: A central square base with four triangles attached to its sides. Triangular Pyramid (Tetrahedron): A central triangular base with three other triangles attached to its sides. The diagram can be customized with dimension labels on the edges of the faces, allowing students to calculate the area of each component part. The final SVG is a clear and accurate representation of the unfolded solid.'
	)

export type PolyhedronNetDiagramProps = z.infer<typeof PolyhedronNetDiagramPropsSchema>

/**
 * This template generates a two-dimensional "net" of a 3D polyhedron as an SVG graphic.
 * A net is a 2D pattern that can be folded to form the 3D shape, and this template is
 * essential for questions about surface area and the relationship between 2D and 3D geometry.
 */
export const generatePolyhedronNetDiagram: WidgetGenerator<typeof PolyhedronNetDiagramPropsSchema> = (data) => {
	const { width, height, polyhedronType, dimensions, showLabels } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	if (polyhedronType === "cube") {
		if (dimensions.base.type !== "square") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`cube must have a square base, but received type '${dimensions.base.type}'`
			)
		}
		const side = dimensions.base.side * 5
		const totalW = 4 * side // 4 faces wide in middle row
		const totalH = 3 * side // 3 faces tall
		const scale = Math.min(width / totalW, height / totalH) * 0.9
		const s = side * scale
		const x_offset = (width - 4 * s) / 2 // Center the 4-wide layout
		const y_offset = (height - 3 * s) / 2

		const face = (x: number, y: number) =>
			`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="rgba(200,200,200,0.3)" stroke="black" stroke-width="2"/>`

		// Cross layout with 6 faces:
		//     [1]
		// [2][3][4][5]
		//     [6]

		// Top face
		svg += face(x_offset + s, y_offset)
		// Middle row: left, center, right, far right faces
		svg += face(x_offset, y_offset + s)
		svg += face(x_offset + s, y_offset + s)
		svg += face(x_offset + 2 * s, y_offset + s)
		svg += face(x_offset + 3 * s, y_offset + s)
		// Bottom face
		svg += face(x_offset + s, y_offset + 2 * s)

		if (showLabels) {
			const gridSize = dimensions.base.side
			const cellSize = s / gridSize

			// Helper function to draw grid in a face
			const drawGrid = (faceX: number, faceY: number) => {
				for (let row = 0; row < gridSize; row++) {
					for (let col = 0; col < gridSize; col++) {
						const cellX = faceX + col * cellSize
						const cellY = faceY + row * cellSize
						svg += `<rect x="${cellX}" y="${cellY}" width="${cellSize}" height="${cellSize}" fill="none" stroke="black" stroke-width="0.5"/>`
					}
				}
			}

			// Draw grids on all 6 faces
			drawGrid(x_offset + s, y_offset) // Top
			drawGrid(x_offset, y_offset + s) // Left
			drawGrid(x_offset + s, y_offset + s) // Center
			drawGrid(x_offset + 2 * s, y_offset + s) // Right
			drawGrid(x_offset + 3 * s, y_offset + s) // Far right
			drawGrid(x_offset + s, y_offset + 2 * s) // Bottom
		}
	} else {
		throw errors.new(`polyhedron type '${polyhedronType}' is not implemented`)
	}
	svg += "</svg>"
	return svg
}
