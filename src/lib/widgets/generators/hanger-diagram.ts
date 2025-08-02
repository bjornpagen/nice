import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single weight hanging from one side of the diagram
const HangerWeightSchema = z.object({
	label: z
		.union([z.string(), z.number()])
		.describe('The text label displayed inside the weight (e.g., "c", 12, "1/2").'),
	shape: z
		.enum(["square", "circle", "pentagon", "hexagon", "triangle"])
		.default("square")
		.describe("The geometric shape of the weight."),
	color: z.string().optional().describe("An optional CSS fill color for the shape.")
})

// The main Zod schema for the hangerDiagram function
export const HangerDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(240).describe("The total height of the output SVG container in pixels."),
		leftSide: z
			.array(HangerWeightSchema)
			.describe("An array of weight objects to be rendered on the left side of the hanger."),
		rightSide: z
			.array(HangerWeightSchema)
			.describe("An array of weight objects to be rendered on the right side of the hanger.")
	})
	.describe(
		'This template generates a "hanger diagram," a powerful visual metaphor for a balanced algebraic equation, rendered as an SVG graphic within an HTML <div>. This diagram is ideal for introducing students to the concept of solving equations by maintaining balance. The generator will construct a central balanced beam suspended from a hook. Two sides, left and right, hang from the beam, each capable of holding multiple "weights." The core principle is that the total weight on the left side must equal the total weight on the right for the hanger to be balanced. Each weight is a distinct visual element, configurable by shape (e.g., square, circle, pentagon, hexagon) and an internal label (e.g., a number like "12" or a variable like "c"). The generator will intelligently and aesthetically arrange multiple weights on each side, stacking or grouping them as needed for clarity. This allows for the visual representation of equations like 12 = 4c (a single 12-unit weight on the left balances four c-unit weights on the right) or d + 6 = 21 (a d-unit weight and a 6-unit weight on the left balance a 21-unit weight on the right). The final output is a clean, self-contained SVG that intuitively communicates the principle of equality in an equation, making abstract algebraic concepts more concrete and accessible.'
	)

export type HangerDiagramProps = z.infer<typeof HangerDiagramPropsSchema>

/**
 * This template generates a "hanger diagram," a powerful visual metaphor for a balanced
 * algebraic equation, rendered as an SVG graphic. This diagram is ideal for introducing
 * students to the concept of solving equations by maintaining balance.
 */
export const generateHangerDiagram: WidgetGenerator<typeof HangerDiagramPropsSchema> = (_data) => {
	// TODO: Implement hanger-diagram generation
	return "<svg><!-- HangerDiagram implementation --></svg>"
}
