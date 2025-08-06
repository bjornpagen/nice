import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the dimensions for a single rectangle.
const RectangleDimensionsSchema = z
	.object({
		width: z.number().positive().describe("The width of the rectangle."),
		height: z.number().positive().describe("The height of the rectangle.")
	})
	.strict()

// Defines a single transformation, including the shape before and after.
const ShapeTransformSchema = z
	.object({
		label: z.string().describe("The label for this transformation group (e.g., 'Shape A')."),
		before: RectangleDimensionsSchema.describe("The dimensions of the shape before the transformation."),
		after: RectangleDimensionsSchema.describe("The dimensions of the shape after the transformation."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "#9AB8ED")
			.describe("The fill color for both the before and after shapes in this group.")
	})
	.strict()

// The main Zod schema for the scaleCopiesSlider widget.
export const ScaleCopiesSliderPropsSchema = z
	.object({
		type: z.literal("scaleCopiesSlider"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 500)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 220)
			.describe("The total height of the output SVG container in pixels."),
		shapeA: ShapeTransformSchema.describe(
			"The first transformation to display, typically corresponding to the 'Slider for Shape A'."
		),
		shapeB: ShapeTransformSchema.describe(
			"The second transformation to display, typically corresponding to the 'Slider for Shape B'."
		)
	})
	.strict()
	.describe(
		"Generates a static SVG diagram that visually represents the concept of scale copies. This widget displays two independent transformations, each with a 'before' and 'after' state. One transformation shows a shape being scaled proportionally (a true scale copy), while the other shows a non-proportional change. This is ideal for questions that ask students to identify which transformation results in a scale copy, mirroring the functionality of an interactive slider in a static format."
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
	const drawShapeGroup = (shape: z.infer<typeof ShapeTransformSchema>, yOffset: number, title: string): string => {
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

		// --- Main Row Label ---
		groupSvg += `<text x="${width / 2}" y="${yOffset - 8}" text-anchor="middle" class="label">${title}</text>`

		return groupSvg
	}

	// Draw Shape A group in the top half
	svg += drawShapeGroup(shapeA, padding.top, shapeA.label)

	// Draw Shape B group in the bottom half
	const shapeB_Y_Offset = padding.top + rowHeight + rowGap
	svg += drawShapeGroup(shapeB, shapeB_Y_Offset, shapeB.label)

	svg += "</svg>"
	return svg
}
