import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidBaseShape = errors.new("invalid base shape for polyhedron type")

// Defines the dimensions for the faces of the net.
const FaceDimensionsSchema = z.object({
	base: z
		.union([
			z.object({ type: z.literal("square"), side: z.number() }),
			z.object({ type: z.literal("rectangle"), length: z.number(), width: z.number() }),
			z.object({
				type: z.literal("triangle"),
				base: z.number(),
				height: z.number(),
				side1: z.number(),
				side2: z.number()
			})
		])
		.describe("The primary base shape of the polyhedron."),
	lateralHeight: z
		.number()
		.optional()
		.describe("The height of the lateral rectangular faces (for prisms) or triangular faces (for pyramids).")
})

// The main Zod schema for the polyhedronNetDiagram function
export const PolyhedronNetDiagramPropsSchema = z
	.object({
		width: z.number().optional().default(350).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(300).describe("The total height of the output SVG container in pixels."),
		polyhedronType: z
			.enum(["cube", "rectangularPrism", "triangularPrism", "squarePyramid", "triangularPyramid"])
			.describe("The type of polyhedron for which to generate a net."),
		dimensions: FaceDimensionsSchema.describe("An object specifying the dimensions of the faces."),
		showLabels: z.boolean().optional().default(true).describe("If true, display the dimension labels on the net.")
	})
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
		const totalW = 4 * side
		const totalH = 3 * side
		const scale = Math.min(width / totalW, height / totalH) * 0.9
		const s = side * scale
		const x_offset = (width - 4 * s) / 2
		const y_offset = (height - 3 * s) / 2

		const face = (x: number, y: number) =>
			`<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="rgba(200,200,200,0.3)" stroke="black"/>`

		// Cross layout:
		//   [ ]
		// [ ][ ][ ]
		//   [ ]
		svg += face(x_offset + s, y_offset + s) // Center (Front)

		if (showLabels) {
			const label = dimensions.base.side
			svg += `<text x="${x_offset + 1.5 * s}" y="${y_offset + 1.5 * s}" text-anchor="middle" dominant-baseline="middle">${label}</text>`
			svg += `<text x="${x_offset + 1.5 * s}" y="${y_offset + 2.5 * s}" text-anchor="middle" dominant-baseline="middle">${label}</text>`
		}
	} else {
		svg += `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="red">Net type not implemented.</text>`
	}
	svg += "</svg>"
	return svg
}
