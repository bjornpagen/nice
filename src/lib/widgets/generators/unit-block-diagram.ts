import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the unitBlockDiagram function
export const UnitBlockDiagramPropsSchema = z
	.object({
		totalBlocks: z.number().int().positive().describe('The total number of 10x10 "hundreds blocks" to display.'),
		shadedUnitsPerBlock: z
			.number()
			.int()
			.min(0)
			.max(100)
			.describe("The number of small unit squares to shade within each block."),
		blocksPerRow: z
			.number()
			.int()
			.positive()
			.default(4)
			.describe("The number of blocks to display in each row before wrapping."),
		blockWidth: z.number().default(80).describe("The width of each individual 10x10 block in pixels."),
		blockHeight: z.number().default(80).describe("The height of each individual 10x10 block in pixels."),
		shadeColor: z.string().default("#6495ED").describe("A CSS color string for the shaded units.")
	})
	.describe(
		'This template generates an SVG diagram of "hundreds blocks" to visually model place value and percentages of large numbers that are multiples of 100. It is particularly effective for explaining concepts like "1% of 800" in a concrete, countable manner. The generator will render a specified number of "hundreds blocks," each of which is a distinct 10x10 grid. These blocks can be arranged in a grid layout (e.g., 2 rows of 4 blocks) for clear presentation. The core function is to shade a specific number of unit squares within each individual block. For example, to visualize "1% of 800," the template would render 8 separate 10x10 grids and shade exactly 1 square in each grid. This visual approach clearly demonstrates that the total number of shaded squares is 8, helping students arrive at the correct answer by reasoning about the meaning of "percent" (per hundred). The output is a self-contained SVG graphic that provides an intuitive and powerful model for understanding how percentages operate on multiples of 100.'
	)

export type UnitBlockDiagramProps = z.infer<typeof UnitBlockDiagramPropsSchema>

/**
 * This template generates an SVG diagram of "hundreds blocks" to visually model
 * place value and percentages of large numbers that are multiples of 100.
 * It is particularly effective for explaining concepts like "1% of 800" in a concrete, countable manner.
 */
export const generateUnitBlockDiagram: WidgetGenerator<typeof UnitBlockDiagramPropsSchema> = (_data) => {
	// TODO: Implement unit-block-diagram generation
	return "<svg><!-- UnitBlockDiagram implementation --></svg>"
}
