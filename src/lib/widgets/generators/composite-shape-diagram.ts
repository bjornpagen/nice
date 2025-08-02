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
		'This is a powerful and flexible template for generating complex, multi-sided polygons, often called composite shapes, as SVG graphics. It is specifically designed for area problems where a shape is either composed of simpler shapes (e.g., a rectangle and a triangle) or can be found by subtracting one shape from another. The generator builds a shape from a list of vertices. Its main purpose is to visualize the decomposition of the shape. Key features include: Arbitrary Polygons: Can draw any simple polygon defined by a sequence of vertex coordinates. This is perfect for trapezoids, L-shapes, and other irregular figures. Decomposition Lines: Can draw internal, dashed lines between vertices to show how the composite shape can be split into simpler sub-regions like triangles and rectangles. Region Labeling: Allows for placing text labels (e.g., "A", "B") inside the decomposed sub-regions to identify them. Dimension Labeling: Supports adding text labels to any segment (both external sides and internal decomposition lines) to indicate lengths, widths, or heights. Right-Angle Markers: Can place right-angle symbols at any vertex or intersection to explicitly show perpendicularity. This template is ideal for multi-step area problems that require students to find the area of individual parts and sum them, or to use a subtraction strategy to find the area of a complex figure.'
	)

export type CompositeShapeDiagramProps = z.infer<typeof CompositeShapeDiagramPropsSchema>

/**
 * This is a powerful and flexible template for generating complex, multi-sided polygons,
 * often called composite shapes, as SVG graphics. It is specifically designed for area
 * problems where a shape is either composed of simpler shapes or can be found by
 * subtracting one shape from another.
 */
export const generateCompositeShapeDiagram: WidgetGenerator<typeof CompositeShapeDiagramPropsSchema> = (_data) => {
	// TODO: Implement composite-shape-diagram generation
	return "<svg><!-- CompositeShapeDiagram implementation --></svg>"
}
