import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines properties for one of the squares attached to the central triangle
const SideSquareSchema = z.object({
	area: z.number().describe("The area of the square, used for labeling."),
	sideLabel: z
		.string()
		.optional()
		.describe('An optional label for the corresponding triangle side (e.g., "a", "b", "c").')
})

// The main Zod schema for the pythagoreanProofDiagram function
export const PythagoreanProofDiagramPropsSchema = z
	.object({
		width: z.number().default(300).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(300).describe("The total height of the output SVG container in pixels."),
		squareA: SideSquareSchema.describe("Properties of the square on the first leg."),
		squareB: SideSquareSchema.describe("Properties of the square on the second leg."),
		squareC: SideSquareSchema.describe("Properties of the square on the hypotenuse.")
	})
	.describe(
		"Generates a classic visual proof of the Pythagorean theorem. This SVG diagram renders a central right-angled triangle. A square is constructed on each of the triangle's three sides (the two legs 'a' and 'b', and the hypotenuse 'c'). Each square is labeled with its area, allowing students to visually confirm the relationship a² + b² = c². This provides a powerful, intuitive illustration of the theorem beyond the formula itself."
	)

export type PythagoreanProofDiagramProps = z.infer<typeof PythagoreanProofDiagramPropsSchema>

/**
 * Generates a visual diagram to illustrate the Pythagorean theorem by rendering a
 * right triangle with a square constructed on each side, labeled with its area.
 */
export const generatePythagoreanProofDiagram: WidgetGenerator<typeof PythagoreanProofDiagramPropsSchema> = (_data) => {
	// TODO: Implement pythagorean-proof-diagram generation
	return "<svg><!-- PythagoreanProofDiagram implementation --></svg>"
}
