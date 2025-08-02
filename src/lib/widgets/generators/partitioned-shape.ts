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
		shadeColor: z.string().default("#6495ED").describe("A CSS color string for the shaded portions.")
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
		layout: z.enum(["horizontal", "vertical"]).default("horizontal").describe("The arrangement of multiple shapes.")
	})
	.describe(
		'This template is a highly versatile tool for generating SVG diagrams that visually represent fractions, decimals, and percentages. It renders one or more geometric shapes (rectangles or circles) that are divided into a set number of equal parts, with a specified number of those parts shaded to illustrate a part-to-whole relationship. The generator is capable of creating: Grids: Rectangles can be partitioned into a grid of rows and columns (e.g., a 10x10 grid to represent hundredths). Bars/Strips: A single row (rows: 1) or single column (columns: 1) grid can be used to create horizontal or vertical bar models. Pie Charts: Circles can be divided into a specified number of equal segments to create pie-chart-like visuals. Values Greater Than 100%: The template can render an array of shapes to model improper fractions or percentages over 100. For instance, to show 152%, it can generate one fully shaded shape (representing the "100") and a second shape with 52% of its parts shaded. The output is a clear, precise, and accessible SVG graphic embedded in a <div>. The colors of the shaded and unshaded portions, as well as the stroke, can be customized. This makes it an ideal tool for questions requiring students to interpret visual models of proportions.'
	)

export type PartitionedShapeProps = z.infer<typeof PartitionedShapePropsSchema>

/**
 * This template is a highly versatile tool for generating SVG diagrams that visually
 * represent fractions, decimals, and percentages. It renders one or more geometric shapes
 * (rectangles or circles) that are divided into a set number of equal parts.
 */
export const generatePartitionedShape: WidgetGenerator<typeof PartitionedShapePropsSchema> = (_data) => {
	// TODO: Implement partitioned-shape generation
	return "<svg><!-- PartitionedShape implementation --></svg>"
}
