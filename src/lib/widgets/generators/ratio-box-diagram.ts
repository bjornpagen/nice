import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines one category of items in the diagram (e.g., "blue dots", "red dots")
const RatioBoxItemSchema = z
	.object({
		count: z.number().int().min(0).describe("Number of items in this category."),
		color: z.string().describe("CSS color for the items (e.g., '#0c7f99', '#bc2612')."),
		style: z
			.enum(["filled", "outline"])
			.nullable()
			.transform((val) => val ?? "filled")
			.describe("The visual style of the item icon.")
	})
	.strict()

// Defines a single box to be drawn as an overlay on the grid.
// The box is defined by the rectangular group of grid cells it encloses.
const BoxOverlaySchema = z
	.object({
		startRow: z.number().int().min(0).describe("The 0-based index of the top row the box encloses."),
		endRow: z.number().int().min(0).describe("The 0-based index of the bottom row the box encloses."),
		startCol: z.number().int().min(0).describe("The 0-based index of the leftmost column the box encloses."),
		endCol: z.number().int().min(0).describe("The 0-based index of the rightmost column the box encloses."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional text label for the box.")
	})
	.strict()

// The main Zod schema for the ratioBoxDiagram function
export const RatioBoxDiagramPropsSchema = z
	.object({
		type: z.literal("ratioBoxDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 320)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 160)
			.describe("The total height of the output SVG container in pixels."),
		items: z
			.array(RatioBoxItemSchema)
			.min(1)
			.describe("An array of item categories to be displayed sequentially in the grid."),
		itemsPerRow: z.number().int().positive().describe("The number of item icons to display in each row."),
		boxes: z
			.array(BoxOverlaySchema)
			.nullable()
			.describe("An optional array of boxes to draw over the items to highlight groups."),
		partitions: z
			.number()
			.int()
			.positive()
			.nullable()
			.describe(
				"If provided, visually divides the total set of items into this many equal groups using boxes to show equivalent ratios."
			),
		layout: z
			.enum(["sequential", "grouped"])
			.nullable()
			.transform((val) => val ?? "sequential")
			.describe(
				"Layout style: 'sequential' places items in reading order, 'grouped' clusters each item type together with spatial separation."
			)
	})
	.strict()
	.describe(
		"Generates a diagram of items in a grid with box overlays to illustrate ratios. Ideal for visualizing part-to-part and part-to-whole relationships and demonstrating equivalent ratios through partitioning."
	)

export type RatioBoxDiagramProps = z.infer<typeof RatioBoxDiagramPropsSchema>

/**
 * Generates an SVG diagram of items in a grid with box overlays to illustrate ratios.
 */
export const generateRatioBoxDiagram: WidgetGenerator<typeof RatioBoxDiagramPropsSchema> = (props) => {
	const { width, height, items, itemsPerRow, boxes, partitions, layout } = props

	const totalItems = items.reduce((sum, item) => sum + item.count, 0)
	if (totalItems === 0) {
		return `<svg width="${width}" height="${height}" />`
	}

	// --- Layout Calculations ---
	const padding = { top: 10, right: 10, bottom: 10, left: 10 }
	const chartWidth = width - padding.left - padding.right
	const chartHeight = height - padding.top - padding.bottom

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`

	if (layout === "grouped") {
		// --- Grouped Layout Logic ---
		// Create a 5x3 grid but place blue circles in first 3 columns, red in last 2 columns
		const numRows = 3
		const numCols = 5
		const cellWidth = chartWidth / numCols
		const cellHeight = chartHeight / numRows
		const iconRadiusX = cellWidth * 0.1
		const iconRadiusY = iconRadiusX

		// Create a position map for specific placement
		const grid: Array<{ color: string; style: "filled" | "outline" } | null> = new Array(numRows * numCols).fill(null)

		// Place blue circles in first 3 columns (positions 0-2, 5-7, 10-12)
		const bluePositions = [0, 1, 2, 5, 6, 7, 10, 11, 12] // First 3 columns in each row
		const redPositions = [3, 4, 8, 9, 13, 14] // Last 2 columns in each row

		// Fill blue positions
		const blueGroup = items[0]
		if (blueGroup) {
			for (let i = 0; i < Math.min(blueGroup.count, bluePositions.length); i++) {
				const position = bluePositions[i]
				if (position !== undefined) {
					grid[position] = { color: blueGroup.color, style: blueGroup.style }
				}
			}
		}

		// Fill red positions
		const redGroup = items[1]
		if (redGroup) {
			for (let i = 0; i < Math.min(redGroup.count, redPositions.length); i++) {
				const position = redPositions[i]
				if (position !== undefined) {
					grid[position] = { color: redGroup.color, style: redGroup.style }
				}
			}
		}

		// Render all items
		for (let i = 0; i < grid.length; i++) {
			const item = grid[i]
			if (!item) continue

			const row = Math.floor(i / numCols)
			const col = i % numCols

			const cx = padding.left + col * cellWidth + cellWidth / 2
			const cy = padding.top + row * cellHeight + cellHeight / 2

			const fill = item.style === "filled" ? item.color : "none"
			const stroke = item.color

			svg += `<ellipse cx="${cx}" cy="${cy}" rx="${iconRadiusX}" ry="${iconRadiusY}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
		}

		// Draw boxes
		if (boxes) {
			// Helper function to draw a box based on grid cell coordinates
			const drawBox = (startRow: number, endRow: number, startCol: number, endCol: number, extraPadding = 0) => {
				const boxPadding = cellWidth * 0.1 + extraPadding
				const x = padding.left + startCol * cellWidth - boxPadding / 2
				const y = padding.top + startRow * cellHeight - boxPadding / 2
				const boxWidth = (endCol - startCol + 1) * cellWidth + boxPadding
				const boxHeight = (endRow - startRow + 1) * cellHeight + boxPadding
				svg += `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="none" stroke="black" stroke-width="2"/>`
			}

			// Draw outer box first (so it appears behind inner box)
			if (boxes.length >= 2) {
				// Overall outer box around entire grid with extra padding
				drawBox(0, numRows - 1, 0, numCols - 1, 10)
			}

			if (boxes.length >= 1) {
				// Inner box around first 3 columns (blue area) - smaller padding
				drawBox(0, numRows - 1, 0, 2, -5)
			}
		}
	} else {
		// --- Sequential Layout Logic (original) ---
		const numRows = Math.ceil(totalItems / itemsPerRow)
		const cellWidth = chartWidth / itemsPerRow
		const cellHeight = chartHeight / numRows
		const iconRadiusX = cellWidth * 0.1
		const iconRadiusY = iconRadiusX

		// Flatten the items array for easier rendering
		const flatItems: { color: string; style: "filled" | "outline" }[] = []
		for (const group of items) {
			for (let i = 0; i < group.count; i++) {
				flatItems.push({ color: group.color, style: group.style })
			}
		}

		// 1. Render all item icons
		for (let i = 0; i < totalItems; i++) {
			const row = Math.floor(i / itemsPerRow)
			const col = i % itemsPerRow

			const cx = padding.left + col * cellWidth + cellWidth / 2
			const cy = padding.top + row * cellHeight + cellHeight / 2

			const item = flatItems[i]
			if (!item) continue

			const fill = item.style === "filled" ? item.color : "none"
			const stroke = item.color

			svg += `<ellipse cx="${cx}" cy="${cy}" rx="${iconRadiusX}" ry="${iconRadiusY}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`
		}

		// Helper function to draw a box based on grid cell coordinates
		const drawBox = (startRow: number, endRow: number, startCol: number, endCol: number) => {
			const boxPadding = cellWidth * 0.2
			const x = padding.left + startCol * cellWidth + boxPadding / 2
			const y = padding.top + startRow * cellHeight + boxPadding / 2
			const boxWidth = (endCol - startCol + 1) * cellWidth - boxPadding
			const boxHeight = (endRow - startRow + 1) * cellHeight - boxPadding
			svg += `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="none" stroke="black" stroke-width="2"/>`
		}

		// 2. Render Partition Boxes
		if (partitions && partitions > 0 && totalItems % partitions === 0) {
			const itemsPerPartition = totalItems / partitions
			if (itemsPerPartition % itemsPerRow === 0) {
				const rowsPerPartition = itemsPerPartition / itemsPerRow
				for (let i = 0; i < partitions; i++) {
					const startRow = i * rowsPerPartition
					const endRow = startRow + rowsPerPartition - 1
					drawBox(startRow, endRow, 0, itemsPerRow - 1)
				}
			} else {
				const colsPerPartition = itemsPerRow / partitions
				for (let i = 0; i < partitions; i++) {
					const startCol = i * colsPerPartition
					const endCol = startCol + colsPerPartition - 1
					drawBox(0, numRows - 1, startCol, endCol)
				}
			}
		}

		// 3. Render Custom Boxes
		if (boxes) {
			for (const box of boxes) {
				const sr = Math.max(0, box.startRow)
				const er = Math.min(numRows - 1, box.endRow)
				const sc = Math.max(0, box.startCol)
				const ec = Math.min(itemsPerRow - 1, box.endCol)
				if (sr > er || sc > ec) continue
				drawBox(sr, er, sc, ec)
			}
		}
	}

	svg += "</svg>"
	return svg
}
