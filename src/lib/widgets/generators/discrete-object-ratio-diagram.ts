import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a type of object to be rendered
const ObjectTypeSchema = z.object({
	count: z.number().int().min(0).describe("The number of this type of object to render."),
	// In a real implementation, this could be an enum of available icons or an SVG path string.
	icon: z.string().describe('An identifier for the icon to use (e.g., "largeFish", "penguin", "smallBall").'),
	color: z.string().optional().describe("An optional CSS color to apply to the icon.")
})

// The main Zod schema for the discreteObjectRatioDiagram function
export const DiscreteObjectRatioDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(240).describe("The total height of the output SVG container in pixels."),
		objects: z.array(ObjectTypeSchema).min(2).describe("An array defining the types and counts of objects to display."),
		layout: z.enum(["grid", "cluster"]).default("cluster").describe("The arrangement of the rendered objects."),
		title: z.string().optional().describe('An optional title for the diagram (e.g., "Fish in Aquarium").')
	})
	.describe(
		'This template generates an SVG graphic that visually represents a ratio using a collection of discrete, countable objects. It is perfect for introductory ratio problems where students can directly count the items to understand the relationship. The generator will render a specified number of two or more distinct types of objects. Each object type is defined by an SVG icon or shape and a count. For example, to show a ratio of 8 large fish to 10 small fish, the generator would render 8 instances of a "large fish" icon and 10 instances of a "small fish" icon. The objects will be arranged in a visually appealing and easy-to-count layout, such as a grid or a loose cluster. The colors and designs of the objects are configurable. This template provides a simple, concrete way to introduce the concept of ratios before moving to more abstract representations like tables or tape diagrams.'
	)

export type DiscreteObjectRatioDiagramProps = z.infer<typeof DiscreteObjectRatioDiagramPropsSchema>

/**
 * This template generates an SVG graphic that visually represents a ratio using a collection
 * of discrete, countable objects. It is perfect for introductory ratio problems where
 * students can directly count the items to understand the relationship.
 */
export const generateDiscreteObjectRatioDiagram: WidgetGenerator<typeof DiscreteObjectRatioDiagramPropsSchema> = (
	_data
) => {
	// TODO: Implement discrete-object-ratio-diagram generation
	return "<svg><!-- DiscreteObjectRatioDiagram implementation --></svg>"
}
