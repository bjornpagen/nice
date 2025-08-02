import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the labels and colors for the regions in the diagram
const NumberSetStyleSchema = z.object({
	label: z.string().describe('The text label for the number set (e.g., "Whole numbers").'),
	color: z.string().describe('The CSS fill color for the region (e.g., "#E8F0FE").')
})

// The main Zod schema for the numberSetDiagram function
export const NumberSetDiagramPropsSchema = z
	.object({
		width: z.number().default(475).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(180).describe("The total height of the output SVG container in pixels."),
		sets: z
			.object({
				whole: NumberSetStyleSchema,
				integer: NumberSetStyleSchema,
				rational: NumberSetStyleSchema,
				irrational: NumberSetStyleSchema
			})
			.describe("An object containing the labels and colors for each number set region.")
	})
	.describe(
		"Generates a static SVG Euler diagram that visually represents the hierarchical relationship between the sets of whole, integer, rational, and irrational numbers. It renders nested ovals for the first three sets and a separate oval for irrational numbers, with each region clearly labeled and colored. This provides a classic visual aid for classifying numbers."
	)

export type NumberSetDiagramProps = z.infer<typeof NumberSetDiagramPropsSchema>

/**
 * Generates a static SVG Euler diagram that visually represents the hierarchical
 * relationship between different sets of numbers (whole, integer, rational, irrational).
 */
export const generateNumberSetDiagram: WidgetGenerator<typeof NumberSetDiagramPropsSchema> = (_data) => {
	// TODO: Implement number-set-diagram generation
	return "<svg><!-- NumberSetDiagram implementation --></svg>"
}
