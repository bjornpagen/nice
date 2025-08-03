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
			.optional()
			.default(4)
			.describe("The number of blocks to display in each row before wrapping."),
		blockWidth: z.number().optional().default(80).describe("The width of each individual 10x10 block in pixels."),
		blockHeight: z.number().optional().default(80).describe("The height of each individual 10x10 block in pixels."),
		shadeColor: z.string().optional().default("#6495ED").describe("A CSS color string for the shaded units.")
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
export const generateUnitBlockDiagram: WidgetGenerator<typeof UnitBlockDiagramPropsSchema> = (data) => {
	const { totalBlocks, shadedUnitsPerBlock, blocksPerRow, blockWidth, blockHeight, shadeColor } = data
	const gap = 10
	const numRows = Math.ceil(totalBlocks / blocksPerRow)
	const svgWidth = blocksPerRow * blockWidth + (blocksPerRow - 1) * gap
	const svgHeight = numRows * blockHeight + (numRows - 1) * gap

	let svg = `<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">`

	for (let b = 0; b < totalBlocks; b++) {
		const blockRow = Math.floor(b / blocksPerRow)
		const blockCol = b % blocksPerRow
		const bx = blockCol * (blockWidth + gap)
		const by = blockRow * (blockHeight + gap)

		const cellW = blockWidth / 10
		const cellH = blockHeight / 10

		for (let i = 0; i < 100; i++) {
			const row = Math.floor(i / 10)
			const col = i % 10
			const fill = i < shadedUnitsPerBlock ? shadeColor : "none"
			svg += `<rect x="${bx + col * cellW}" y="${by + row * cellH}" width="${cellW}" height="${cellH}" fill="${fill}" stroke="#ccc" stroke-width="0.5"/>`
		}
		// Add a border around the whole block
		svg += `<rect x="${bx}" y="${by}" width="${blockWidth}" height="${blockHeight}" fill="none" stroke="black" stroke-width="1"/>`
	}

	svg += "</svg>"
	return svg
}
