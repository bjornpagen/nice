import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex
const PointSchema = z.object({
	x: z.number().describe("The horizontal coordinate of the vertex."),
	y: z.number().describe("The vertical coordinate of the vertex.")
})

// Defines a label for a line segment (a side or an altitude)
const SegmentLabelSchema = z.object({
	text: z.string().describe('The text for the label (e.g., "10", "x", "base").'),
	position: z
		.enum(["center", "top", "bottom", "left", "right"])
		.default("center")
		.describe("Relative position of the label to the segment.")
})

// Defines a side of the triangle, specified by its two vertex indices
const SideSchema = z.object({
	vertex1Index: z.number().int().min(0).max(2).describe("The index (0, 1, or 2) of the starting vertex of the side."),
	vertex2Index: z.number().int().min(0).max(2).describe("The index (0, 1, or 2) of the ending vertex of the side."),
	label: SegmentLabelSchema.optional().describe("An optional label for this side.")
})

// Defines an altitude (height) line
const AltitudeSchema = z.object({
	fromVertexIndex: z.number().int().min(0).max(2).describe("The index of the vertex from which the altitude is drawn."),
	onSide: z
		.object({
			vertex1Index: z.number().int().min(0).max(2),
			vertex2Index: z.number().int().min(0).max(2)
		})
		.describe("The side on which the altitude lands."),
	label: SegmentLabelSchema.optional().describe('An optional label for the altitude (e.g., "h", "4").'),
	style: z.enum(["solid", "dashed"]).default("dashed").describe("The line style for the altitude.")
})

// Defines a right-angle marker
const RightAngleMarkerSchema = z
	.object({
		vertexIndex: z
			.number()
			.int()
			.min(0)
			.max(2)
			.describe("The index of the vertex where the right angle is located (for right triangles).")
	})
	.or(
		z.object({
			atIntersectionOfAltitude: z.boolean().describe("If true, place the marker where the altitude meets its base.")
		})
	)

// The main Zod schema for the triangleDiagram function
export const TriangleDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(240).describe("The total height of the output SVG container in pixels."),
		vertices: z
			.array(PointSchema)
			.length(3)
			.describe("An array of exactly three {x, y} coordinates defining the triangle's vertices."),
		sides: z.array(SideSchema).optional().describe("Optional definitions for the labels of the triangle's sides."),
		altitude: AltitudeSchema.optional().describe("An optional altitude to draw within the triangle."),
		rightAngleMarker: RightAngleMarkerSchema.optional().describe("An optional marker to indicate a right angle.")
	})
	.describe(
		'This template is designed to generate a highly configurable and geometrically accurate SVG diagram of a triangle within an HTML <div>. It can render any type of triangle (scalene, isosceles, right-angled) based on specified vertex coordinates. The core functionality is to draw the triangle and overlay it with essential labels and indicators for geometry problems. The generator will: Draw the three sides of the triangle. Place labels on any of the three sides. Labels can be numerical values (e.g., "10 units"), variables (e.g., "x", "b"), or simple letters (e.g., "A", "B"). Optionally draw an altitude (height) from one vertex to the opposite base. This altitude is typically rendered as a dashed line to distinguish it from the sides of the triangle. Optionally add a standard right-angle marker (a small square) where the altitude meets the base, or at one of the triangle\'s vertices to indicate a right triangle. The final output is a clean, precise, and standards-compliant SVG diagram perfect for questions that require students to calculate the area, find a missing side length or height given the area, or identify the base and height of a triangle.'
	)

export type TriangleDiagramProps = z.infer<typeof TriangleDiagramPropsSchema>

/**
 * This template is designed to generate a highly configurable and geometrically accurate
 * SVG diagram of a triangle within an HTML div. It can render any type of triangle
 * (scalene, isosceles, right-angled) based on specified vertex coordinates.
 */
export const generateTriangleDiagram: WidgetGenerator<typeof TriangleDiagramPropsSchema> = (_data) => {
	// TODO: Implement triangle-diagram generation
	return "<svg><!-- TriangleDiagram implementation --></svg>"
}
