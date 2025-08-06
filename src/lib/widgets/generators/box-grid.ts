import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the content and styling for a single cell in the grid.
const BoxGridCellSchema = z
	.object({
		content: z.union([z.string(), z.number()]).describe("The text or numerical content to display inside the cell."),
		backgroundColor: z
			.string()
			.nullable()
			.describe("An optional CSS color to use as the cell's background fill for highlighting.")
	})
	.strict()

// The main Zod schema for the boxGrid function.
export const BoxGridPropsSchema = z
	.object({
		type: z.literal("boxGrid"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total height of the output SVG container in pixels."),
		data: z
			.array(z.array(BoxGridCellSchema))
			.describe(
				"A 2D array of cell objects representing the grid. The outer array holds the rows, and each inner array holds the cells for that row."
			),
		showGridLines: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe("If true, draws border lines around each cell."),
		cellPadding: z
			.number()
			.nullable()
			.transform((val) => val ?? 5)
			.describe("The internal padding within each cell for the text content."),
		fontSize: z
			.number()
			.nullable()
			.transform((val) => val ?? 16)
			.describe("The font size for the text inside the cells.")
	})
	.strict()
	.describe(
		"Generates a versatile SVG grid of cells containing data. This widget is ideal for displaying tabular data in a purely visual, non-semantic format, such as showing a grid of numbers for probability or data analysis problems. It supports cell-specific background colors for highlighting key values."
	)

export type BoxGridProps = z.infer<typeof BoxGridPropsSchema>

/**
 * Generates an SVG diagram of a grid of cells, with each cell capable of
 * displaying data and having a custom background color for highlighting.
 */
export const generateBoxGrid: WidgetGenerator<typeof BoxGridPropsSchema> = (props) => {
	const { width, height, data, showGridLines, fontSize } = props

	const numRows = data.length
	if (numRows === 0) return `<svg width="${width}" height="${height}" />`
	const numCols = data[0]?.length ?? 0
	if (numCols === 0) return `<svg width="${width}" height="${height}" />`

	const cellWidth = width / numCols
	const cellHeight = height / numRows

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg += `<style>
        .cell-text {
            font-size: ${fontSize}px;
            text-anchor: middle;
            dominant-baseline: middle;
        }
    </style>`

	// Loop through data to draw backgrounds and text content
	for (let r = 0; r < numRows; r++) {
		for (let c = 0; c < numCols; c++) {
			const cell = data[r]?.[c]
			if (!cell) continue

			const x = c * cellWidth
			const y = r * cellHeight

			// Draw background rectangle for highlighting, if specified
			if (cell.backgroundColor) {
				svg += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="${cell.backgroundColor}" />`
			}

			// Draw the text content
			const textX = x + cellWidth / 2
			const textY = y + cellHeight / 2
			svg += `<text x="${textX}" y="${textY}" class="cell-text">${cell.content}</text>`
		}
	}

	// Loop again to draw grid lines on top of all content
	if (showGridLines) {
		for (let r = 0; r < numRows; r++) {
			for (let c = 0; c < numCols; c++) {
				const x = c * cellWidth
				const y = r * cellHeight
				svg += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" fill="none" stroke="black" stroke-width="1.5" />`
			}
		}
	}

	svg += "</svg>"
	return svg
}
