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
		"Generates a 3D diagram of a geometric solid that has at least one curved surface, such as a cylinder, cone, or sphere. The output is an SVG rendering from a perspective view, with hidden edges shown as dashed lines to convey three-dimensional structure. The diagram can include labeled dimensions (e.g., radius, height) with leader lines, making it ideal for problems involving volume or surface area calculations for these specific shapes."
	)

export type GeometricSolidDiagramProps = z.infer<typeof GeometricSolidDiagramPropsSchema>

/**
 * Generates a 3D diagram of a geometric solid with curved surfaces (e.g., cylinder, cone).
 * Supports dimension labels for volume and surface area problems.
 */
export const generateGeometricSolidDiagram: WidgetGenerator<typeof GeometricSolidDiagramPropsSchema> = (_data) => {
	// TODO: Implement geometric-solid-diagram generation
	return "<svg><!-- GeometricSolidDiagram implementation --></svg>"
}
