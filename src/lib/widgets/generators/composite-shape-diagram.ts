import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex
const PointSchema = z.object({
	x: z.number().describe("The horizontal coordinate of the vertex."),
	y: z.number().describe("The vertical coordinate of the vertex.")
})

// Defines a label for a segment or an internal region
const LabelSchema = z.object({
	text: z.string().describe('The text content of the label (e.g., "9 units", "A").'),
	position: PointSchema.describe("An explicit {x, y} coordinate for placing the label.")
})

// Defines a line segment (either an outer edge or an inner decomposition line)
const SegmentSchema = z.object({
	fromVertexIndex: z.number().int().describe("The starting vertex index from the main vertices array."),
	toVertexIndex: z.number().int().describe("The ending vertex index from the main vertices array."),
	style: z.enum(["solid", "dashed"]).default("solid").describe("The style of the line."),
	label: z.string().optional().describe("An optional text label for this segment's length.")
})

// Defines a right-angle marker, positioned by the vertex at its corner
const RightAngleMarkerSchema = z.object({
	cornerVertexIndex: z.number().int().describe("The index of the vertex where the right angle corner is located."),
	adjacentVertex1Index: z.number().int().describe("Index of the first adjacent vertex forming the angle."),
	adjacentVertex2Index: z.number().int().describe("Index of the second adjacent vertex forming the angle.")
})

// The main Zod schema for the compositeShapeDiagram function
export const CompositeShapeDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(260).describe("The total height of the output SVG container in pixels."),
		vertices: z.array(PointSchema).describe("An array of {x, y} coordinates defining all points in the diagram."),
		outerBoundary: z
			.array(z.number().int())
			.describe("An ordered array of vertex indices that defines the solid outline of the shape."),
		internalSegments: z
			.array(SegmentSchema)
			.optional()
			.describe("An optional array of internal lines, typically dashed, to show decomposition."),
		regionLabels: z
			.array(LabelSchema)
			.optional()
			.describe('An optional array of labels to be placed inside sub-regions (e.g., "Triangle A").'),
		rightAngleMarkers: z
			.array(RightAngleMarkerSchema)
			.optional()
			.describe("An optional array of markers to indicate right angles.")
	})
	.describe(
		"Generates a flexible diagram of a composite polygon from a set of vertices. This widget is ideal for area and perimeter problems that involve decomposing a complex shape into simpler ones (e.g., rectangles, triangles). It supports drawing a solid outer boundary, internal dashed lines for decomposition, labels for dimensions and regions, and right-angle markers to indicate perpendicularity. This allows for the clear visualization of shapes like L-shaped polygons, trapezoids, or any multi-sided figure."
	)

export type CompositeShapeDiagramProps = z.infer<typeof CompositeShapeDiagramPropsSchema>

/**
 * Generates a diagram of a composite polygon from a set of vertices. Ideal for area
 * problems involving the decomposition of a complex shape into simpler figures.
 */
export const generateCompositeShapeDiagram: WidgetGenerator<typeof CompositeShapeDiagramPropsSchema> = (_data) => {
	// TODO: Implement composite-shape-diagram generation
	return "<svg><!-- CompositeShapeDiagram implementation --></svg>"
}
