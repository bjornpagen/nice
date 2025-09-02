import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { MATHML_INNER_PATTERN } from "@/lib/widgets/utils/mathml"
import { theme } from "@/lib/widgets/utils/theme"

// Defines the content and styling for a single cell in the grid.
const BoxGridCellSchema = z
	.object({
		content: z
			.discriminatedUnion("type", [
				z
					.object({
						type: z.literal("text").describe("Identifies this as plain text content"),
						content: z.string().describe("The actual text content to display")
					})
					.strict()
					.describe("Plain text content that will be rendered as-is"),
				z
					.object({
						type: z.literal("math").describe("Identifies this as mathematical content"),
						mathml: z
							.string()
							.regex(MATHML_INNER_PATTERN, "invalid mathml snippet; must be inner MathML without outer <math> wrapper")
							.describe("Inner MathML markup (no outer <math> element)")
					})
					.strict()
					.describe("Mathematical content represented in MathML format")
			])
			.describe("Inline content for the cell: either plain text or MathML"),
		backgroundColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Hex-only color for the cell background (e.g., '#FFE5B4', '#1E90FF', '#FF00004D' for ~30% alpha, null). Null means no background color (transparent)."
			)
	})
	.strict()

// The main Zod schema for the boxGrid function.
export const BoxGridPropsSchema = z
	.object({
		type: z
			.literal("boxGrid")
			.describe("Identifies this as a box grid widget for displaying tabular data with optional cell highlighting."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the grid in pixels including borders (e.g., 400, 500, 600). Must accommodate all columns with their content."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the grid in pixels including borders (e.g., 300, 400, 200). Must accommodate all rows."
			),
		data: z
			.array(z.array(BoxGridCellSchema))
			.describe(
				"2D array where data[row][col] represents the cell content. First row often contains headers. All rows should have the same number of columns for proper alignment."
			),
		showGridLines: z
			.boolean()
			.describe(
				"Whether to show borders between cells. True creates a traditional table look. False creates a borderless layout, useful for highlighting patterns."
			)
	})
	.strict()
	.describe(
		"Creates a grid/table structure for displaying data, patterns, or mathematical arrays. Supports individual cell highlighting for emphasis. Useful for multiplication tables, data organization, and pattern recognition."
	)

export type BoxGridProps = z.infer<typeof BoxGridPropsSchema>

/**
 * Helper function to get the label text from cell content
 */
function getCellLabel(content: { type: "text"; content: string } | { type: "math"; mathml: string }): string {
	if (content.type === "text") return content.content
	// math content: strip markup for a plain-text fallback
	return content.mathml
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
}

/**
 * Generates an SVG diagram of a grid of cells, with each cell capable of
 * displaying data and having a custom background color for highlighting.
 */
export const generateBoxGrid: WidgetGenerator<typeof BoxGridPropsSchema> = (props) => {
	const { width, height, data, showGridLines } = props

	const numRows = data.length
	if (numRows === 0) return `<svg width="${width}" height="${height}" />`
	const numCols = data[0]?.length ?? 0
	if (numCols === 0) return `<svg width="${width}" height="${height}" />`

	const cellWidth = width / numCols
	const cellHeight = height / numRows

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 14,
		lineHeightDefault: 1.2
	})

	canvas.addStyle(`
        .cell-text {
            font-size: 14px;
            text-anchor: middle;
            dominant-baseline: middle;
        }
    `)

	// Loop through data to draw backgrounds and text content
	for (let r = 0; r < numRows; r++) {
		for (let c = 0; c < numCols; c++) {
			const cell = data[r]?.[c]
			if (!cell) continue

			const x = c * cellWidth
			const y = r * cellHeight

			// Draw background rectangle for highlighting, if specified
			if (cell.backgroundColor && cell.backgroundColor !== "") {
				canvas.drawRect(x, y, cellWidth, cellHeight, {
					fill: cell.backgroundColor
				})
			}

			// Draw the text content (render text directly; for math, render a simple text fallback by stripping tags)
			const textX = x + cellWidth / 2
			const textY = y + cellHeight / 2
			const label = getCellLabel(cell.content)
			canvas.drawText({
				x: textX,
				y: textY,
				text: label,
				fontPx: 14,
				anchor: "middle",
				dominantBaseline: "middle",
				fill: theme.colors.text
			})
		}
	}

	// Loop again to draw grid lines on top of all content
	if (showGridLines) {
		for (let r = 0; r < numRows; r++) {
			for (let c = 0; c < numCols; c++) {
				const x = c * cellWidth
				const y = r * cellHeight
				canvas.drawRect(x, y, cellWidth, cellHeight, {
					fill: "none",
					stroke: theme.colors.border,
					strokeWidth: Number.parseFloat(theme.stroke.width.base)
				})
			}
		}
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}
