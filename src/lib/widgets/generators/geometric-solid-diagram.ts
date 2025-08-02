import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties for a cylinder
const CylinderDataSchema = z.object({
	type: z.literal("cylinder"),
	radius: z.number().describe("The radius of the circular bases."),
	height: z.number().describe("The perpendicular distance between the two bases.")
})

// Defines the properties for a cone (future support)
const ConeDataSchema = z.object({
	type: z.literal("cone"),
	radius: z.number().describe("The radius of the circular base."),
	height: z.number().describe("The perpendicular height from the base to the apex.")
})

// Defines a label for a dimension like radius or height
const SolidDimensionLabelSchema = z.object({
	target: z.enum(["radius", "height"]).describe("The dimension to label."),
	text: z.string().optional().describe("The text for the label. If omitted, the numerical value will be used.")
})

// The main Zod schema for the geometricSolidDiagram function
export const GeometricSolidDiagramPropsSchema = z
	.object({
		width: z.number().default(150).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(200).describe("The total height of the output SVG container in pixels."),
		shape: z
			.union([
				CylinderDataSchema,
				ConeDataSchema // Example for future extension
			])
			.describe("The geometric data defining the solid shape."),
		labels: z.array(SolidDimensionLabelSchema).optional().describe("An array of dimension labels to display.")
	})
	.describe(
		"This template is used to generate diagrams of three-dimensional geometric solids that include curved surfaces, such as cylinders, cones, and spheres. The output is a clear SVG representation suitable for questions about identifying shapes or calculating their volume and surface area. The generator will render the solid from a standard perspective view. It accurately depicts the shape's form, including the circular bases and curved lateral surfaces. To aid in three-dimensional perception, edges or outlines that would be hidden from view (like the back edge of a cylinder's base) are rendered as dashed arcs or lines. The template also supports adding dimension labels with leader lines to indicate key measurements like radius and height, which are crucial for calculation problems."
	)

export type GeometricSolidDiagramProps = z.infer<typeof GeometricSolidDiagramPropsSchema>

/**
 * This template is used to generate diagrams of three-dimensional geometric solids that
 * include curved surfaces, such as cylinders, cones, and spheres. The output is a clear
 * SVG representation suitable for questions about identifying shapes or calculating their
 * volume and surface area.
 */
export const generateGeometricSolidDiagram: WidgetGenerator<typeof GeometricSolidDiagramPropsSchema> = (_data) => {
	// TODO: Implement geometric-solid-diagram generation
	return "<svg><!-- GeometricSolidDiagram implementation --></svg>"
}
