import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

function createRectSchema() {
	return z
		.object({
			width: z
				.number()
				.positive()
				.describe(
					"Width of the rectangle in relative units (e.g., 4, 6, 2.5). Not pixels - scaled to fit display area."
				),
			height: z
				.number()
				.positive()
				.describe(
					"Height of the rectangle in relative units (e.g., 3, 4, 1.5). Proportions matter more than absolute values."
				)
		})
		.strict()
}

function createGroupSchema() {
	return z
		.object({
			label: z
				.string()
				.nullable()
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
				.describe(
					"Label for this shape transformation (e.g., 'Shape A', 'Rectangle 1', 'Original', null). Displayed as a header for the shape pair. Null for no label."
				),
			before: createRectSchema().describe("Dimensions of the original rectangle before transformation."),
			after: createRectSchema().describe(
				"Dimensions of the rectangle after transformation. Compare proportions to 'before' to show scaling type."
			),
			color: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe(
					"CSS fill color for both rectangles in this group (e.g., '#4472C4' for blue, 'orange', 'rgba(255,0,0,0.7)'). Distinguishes the two shape groups."
				)
		})
		.strict()
}

export const ScaleCopiesSliderPropsSchema = z
	.object({
		type: z
			.literal("scaleCopiesSlider")
			.describe(
				"Identifies this as a scale copies comparison widget showing proportional vs non-proportional scaling."
			),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the widget in pixels (e.g., 600, 700, 500). Must accommodate both shape groups side by side."
			),
		height: z
			.number()
			.positive()
			.describe("Total height of the widget in pixels (e.g., 400, 350, 300). Must fit labels and largest rectangles."),
		shapeA: createGroupSchema().describe(
			"First shape transformation, typically showing proportional scaling where width and height scale by same factor."
		),
		shapeB: createGroupSchema().describe(
			"Second shape transformation, typically showing non-proportional scaling where dimensions scale differently."
		)
	})
	.strict()
	.describe(
		"Compares two rectangle transformations side-by-side to illustrate proportional (similar shapes) vs non-proportional scaling. Each group shows before/after rectangles. Essential for teaching similarity, scale factors, and distinguishing between scaling that preserves shape vs distortion."
	)

export type ScaleCopiesSliderProps = z.infer<typeof ScaleCopiesSliderPropsSchema>

/**
 * Generates an SVG diagram to visually compare a proportional scaling
 * transformation against a non-proportional one.
 */
export const generateScaleCopiesSlider: WidgetGenerator<typeof ScaleCopiesSliderPropsSchema> = (props) => {
	const { width, height, shapeA, shapeB } = props

	const padding = { top: 30, right: 20, bottom: 30, left: 20 }
	const rowGap = 20
	const colGap = 30 // Gap for the arrow

	// The available drawing area for each of the two main rows (Shape A and Shape B)
	const rowHeight = (height - padding.top - padding.bottom - rowGap) / 2
	// The available drawing area for each shape (Before/After) within a row
	const shapeWidth = (width - padding.left - padding.right - colGap) / 2

	// Find the maximum width and height across all four shapes to determine a universal scale factor
	const allShapes = [shapeA.before, shapeA.after, shapeB.before, shapeB.after]
	const maxWidth = Math.max(...allShapes.map((s) => s.width))
	const maxHeight = Math.max(...allShapes.map((s) => s.height))

	// Calculate scale to fit the largest shape within the allocated areas
	const scale = Math.min(shapeWidth / maxWidth, rowHeight / maxHeight)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += "<style>.label { font-size: 14px; font-weight: bold; } .sub-label { font-size: 12px; fill: #555; }</style>"

	/**
	 * Helper function to draw a single row (e.g., for Shape A) containing
	 * the "Before" shape, an arrow, and the "After" shape.
	 */
	const drawShapeGroup = (shape: ScaleCopiesSliderProps["shapeA"], yOffset: number): string => {
		let groupSvg = ""

		// --- Before Shape ---
		const beforeW = shape.before.width * scale
		const beforeH = shape.before.height * scale
		const beforeX = padding.left + (shapeWidth - beforeW) / 2 // Center within its column
		const beforeY = yOffset + (rowHeight - beforeH) / 2 // Center within its row
		groupSvg += `<rect x="${beforeX}" y="${beforeY}" width="${beforeW}" height="${beforeH}" fill="${shape.color}" stroke="#333" stroke-width="1"/>`
		groupSvg += `<text x="${padding.left + shapeWidth / 2}" y="${yOffset + rowHeight + 15}" text-anchor="middle" class="sub-label">Before</text>`

		// --- Arrow ---
		const arrowXStart = padding.left + shapeWidth + 5
		const arrowXEnd = arrowXStart + colGap - 10
		const arrowY = yOffset + rowHeight / 2
		groupSvg += `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#333"/></marker></defs>`
		groupSvg += `<line x1="${arrowXStart}" y1="${arrowY}" x2="${arrowXEnd}" y2="${arrowY}" stroke="#333" stroke-width="1.5" marker-end="url(#arrowhead)"/>`

		// --- After Shape ---
		const afterW = shape.after.width * scale
		const afterH = shape.after.height * scale
		const afterX = padding.left + shapeWidth + colGap + (shapeWidth - afterW) / 2 // Center
		const afterY = yOffset + (rowHeight - afterH) / 2 // Center
		groupSvg += `<rect x="${afterX}" y="${afterY}" width="${afterW}" height="${afterH}" fill="${shape.color}" stroke="#333" stroke-width="1"/>`
		groupSvg += `<text x="${padding.left + shapeWidth + colGap + shapeWidth / 2}" y="${yOffset + rowHeight + 15}" text-anchor="middle" class="sub-label">After</text>`

		// --- Main Row Label (only if label exists) ---
		if (shape.label !== null) {
			groupSvg += `<text x="${width / 2}" y="${yOffset - 8}" text-anchor="middle" class="label">${shape.label}</text>`
		}

		return groupSvg
	}

	// Draw Shape A group in the top half
	svg += drawShapeGroup(shapeA, padding.top)

	// Draw Shape B group in the bottom half
	const shapeB_Y_Offset = padding.top + rowHeight + rowGap
	svg += drawShapeGroup(shapeB, shapeB_Y_Offset)

	svg += "</svg>"
	return svg
}
