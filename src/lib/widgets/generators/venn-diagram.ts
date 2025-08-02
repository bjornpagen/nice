import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the vennDiagram function
export const VennDiagramPropsSchema = z
	.object({
		width: z.number().default(350).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(250).describe("The total height of the output SVG container in pixels."),
		circleA: z.object({
			label: z.string().describe('The label for the first circle (e.g., "Have a Dog").'),
			count: z.number().describe("The numerical count for the region unique to this circle (non-overlapping part)."),
			color: z.string().default("rgba(217, 95, 79, 0.5)").describe("The fill color for this circle.")
		}),
		circleB: z.object({
			label: z.string().describe('The label for the second circle (e.g., "Have a Cat").'),
			count: z.number().describe("The numerical count for the region unique to this circle (non-overlapping part)."),
			color: z.string().default("rgba(66, 133, 244, 0.5)").describe("The fill color for this circle.")
		}),
		intersectionCount: z.number().describe("The numerical count for the overlapping region of the two circles."),
		outsideCount: z.number().describe("The numerical count for the region outside of both circles.")
	})
	.describe(
		"This template generates a classic two-circle Venn diagram as an SVG graphic. It is designed to visually represent the relationship between two sets of data. It renders two labeled, overlapping circles and displays the numerical counts for each of the four distinct regions: Circle A only, Circle B only, the intersection, and the region outside both circles. This is ideal for translating set information into a two-way table or for calculating probabilities."
	)

export type VennDiagramProps = z.infer<typeof VennDiagramPropsSchema>

/**
 * This template generates a classic two-circle Venn diagram as an SVG graphic
 * to visually represent the relationship between two sets of data.
 */
export const generateVennDiagram: WidgetGenerator<typeof VennDiagramPropsSchema> = (_data) => {
	// TODO: Implement venn-diagram generation
	return "<svg><!-- VennDiagram implementation --></svg>"
}
