import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties for a single partitioned shape (e.g., one square)
const ShapeDefinitionSchema = z
	.object({
		type: z.enum(["rectangle", "circle"]).describe("The type of geometric shape to render."),
		totalParts: z
			.number()
			.int()
			.positive()
			.describe(
				"The total number of equal parts the shape is divided into. For a rectangle, this is rows * columns. For a circle, this is segments."
			),
		shadedParts: z.number().int().min(0).describe("The number of parts that should be shaded."),
		rows: z.number().int().positive().optional().describe("For rectangles, the number of rows in the grid."),
		columns: z.number().int().positive().optional().describe("For rectangles, the number of columns in the grid."),
		shadeColor: z.string().default("#6495ED").describe("A CSS color string for the shaded portions.").optional()
	})
	.refine(
		(data) => {
			// Ensure shadedParts is not greater than totalParts
			return data.shadedParts <= data.totalParts
		},
		{
			message: "shadedParts cannot be greater than totalParts"
		}
	)
	.refine(
		(data) => {
			// For rectangles, rows and columns must multiply to totalParts
			if (data.type === "rectangle" && data.rows && data.columns) {
				return data.rows * data.columns === data.totalParts
			}
			return true
		},
		{
			message: "For a rectangle, rows * columns must equal totalParts"
		}
	)

// The main Zod schema for the partitionedShape function
export const PartitionedShapePropsSchema = z
	.object({
		shapes: z
			.array(ShapeDefinitionSchema)
			.min(1)
			.describe(
				"An array of one or more shape definitions. Multiple shapes are used to represent values greater than 100%."
			),
		width: z.number().default(200).describe("The width of the SVG container for each shape in pixels."),
		height: z.number().default(200).describe("The height of the SVG container for each shape in pixels."),
		layout: z
			.enum(["horizontal", "vertical"])
			.default("horizontal")
			.describe("The arrangement of multiple shapes.")
			.optional()
	})
	.describe(
		"This template is a highly versatile tool for generating SVG diagrams that visually represent fractions, decimals, and percentages. It replaces the `fractionBar` widget. It renders one or more geometric shapes (rectangles or circles) that are divided into a set number of equal parts, with a specified number of those parts shaded to illustrate a part-to-whole relationship. The generator is capable of creating: Grids and Bars: Rectangles can be partitioned into grids or single-row/column bars (fraction bars). Pie Charts: Circles can be divided into equal segments. Values Greater Than 100%: The template can render an array of shapes to model improper fractions or percentages over 100. The output is a clear, precise, and accessible SVG graphic ideal for questions requiring students to interpret visual models of proportions."
	)

export type PartitionedShapeProps = z.infer<typeof PartitionedShapePropsSchema>

/**
 * This template is a highly versatile tool for generating SVG diagrams that visually
 * represent fractions, decimals, and percentages. It renders one or more geometric shapes
 * (rectangles or circles) that are divided into a set number of equal parts.
 */
export const generatePartitionedShape: WidgetGenerator<typeof PartitionedShapePropsSchema> = (data) => {
	const { shapes, width: shapeWidth, height: shapeHeight, layout } = data
	const rad = (deg: number) => (deg * Math.PI) / 180
	const gap = 20
	const totalWidth = layout === "horizontal" ? shapes.length * shapeWidth + (shapes.length - 1) * gap : shapeWidth
	const totalHeight = layout === "vertical" ? shapes.length * shapeHeight + (shapes.length - 1) * gap : shapeHeight

	let svg = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">`

	shapes.forEach((s, idx) => {
		const xOffset = layout === "horizontal" ? idx * (shapeWidth + gap) : 0
		const yOffset = layout === "vertical" ? idx * (shapeHeight + gap) : 0

		if (s.type === "rectangle") {
			const rows = s.rows || 1
			const cols = s.columns || s.totalParts
			const cellW = shapeWidth / cols
			const cellH = shapeHeight / rows
			for (let i = 0; i < s.totalParts; i++) {
				const row = Math.floor(i / cols)
				const col = i % cols
				const fill = i < s.shadedParts ? s.shadeColor : "none"
				svg += `<rect x="${xOffset + col * cellW}" y="${yOffset + row * cellH}" width="${cellW}" height="${cellH}" fill="${fill}" stroke="#333333" stroke-width="1"/>`
			}
		} else if (s.type === "circle") {
			const cx = xOffset + shapeWidth / 2
			const cy = yOffset + shapeHeight / 2
			const r = Math.min(shapeWidth, shapeHeight) / 2 - 5
			const angleStep = 360 / s.totalParts

			for (let i = 0; i < s.totalParts; i++) {
				const startAngle = i * angleStep - 90 // Start from top
				const endAngle = (i + 1) * angleStep - 90
				const startRad = rad(startAngle)
				const endRad = rad(endAngle)
				const largeArc = angleStep > 180 ? 1 : 0
				const fill = i < s.shadedParts ? s.shadeColor : "none"

				const x1 = cx + r * Math.cos(startRad)
				const y1 = cy + r * Math.sin(startRad)
				const x2 = cx + r * Math.cos(endRad)
				const y2 = cy + r * Math.sin(endRad)

				svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${fill}" stroke="#333333" stroke-width="1"/>`
			}
		}
	})

	svg += "</svg>"
	return svg
}
