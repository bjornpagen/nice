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
		width: z.number().default(300).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(200).describe("The total height of the output SVG container in pixels."),
		shape: z
			.union([RectangularPrismDataSchema, TriangularPrismDataSchema, RectangularPyramidDataSchema])
			.describe("The geometric data defining the shape of the polyhedron."),
		labels: z.array(DimensionLabelSchema).optional().describe("An array of labels for edge lengths or face areas."),
		shadedFace: z.string().optional().describe('The identifier of a face to shade (e.g., "top_face", "front_face").'),
		showHiddenEdges: z
			.boolean()
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
export const generatePolyhedronDiagram: WidgetGenerator<typeof PolyhedronDiagramPropsSchema> = (_data) => {
	// TODO: Implement polyhedron-diagram generation
	return "<svg><!-- PolyhedronDiagram implementation --></svg>"
}
