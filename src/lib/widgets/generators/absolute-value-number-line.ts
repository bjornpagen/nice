import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const AbsoluteValueNumberLinePropsSchema = z
	.object({
		width: z.number().default(480).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(80).describe("The total height of the output SVG container in pixels."),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		value: z.number().describe("The number whose absolute value is being illustrated."),
		highlightColor: z
			.string()
			.default("rgba(217, 95, 79, 0.8)")
			.describe("The CSS color for the highlighted distance segment and the point."),
		showDistanceLabel: z
			.boolean()
			.default(true)
			.describe("If true, shows a text label indicating the distance from zero.")
	})
	.describe(
		'This template is a specialized pedagogical tool designed to generate an SVG graphic that visually demonstrates the concept of absolute value as distance from zero. It creates a clear, focused illustration perfect for introductory questions on the topic. The generator will render a horizontal number line with a specified range and tick marks. The key function is to highlight the absolute value of a single, specified number. It does this by: 1. Placing a filled circle at the location of the number on the line (e.g., at 2 or -5). 2. Drawing a distinctly colored or bolded segment along the number line, starting from 0 and ending at the plotted point. 3. Optionally, an arc or a label can be drawn above this segment to emphasize the "distance" and state its value (e.g., a label showing "Distance is 2"). This creates an unambiguous visual that connects the abstract concept of |x| to the concrete idea of measuring a length from the origin, regardless of direction.'
	)

export type AbsoluteValueNumberLineProps = z.infer<typeof AbsoluteValueNumberLinePropsSchema>

/**
 * This template is a specialized pedagogical tool designed to generate an SVG graphic
 * that visually demonstrates the concept of absolute value as distance from zero.
 * It creates a clear, focused illustration perfect for introductory questions on the topic.
 */
export const generateAbsoluteValueNumberLine: WidgetGenerator<typeof AbsoluteValueNumberLinePropsSchema> = (_data) => {
	// TODO: Implement absolute-value-number-line generation
	return "<svg><!-- AbsoluteValueNumberLine implementation --></svg>"
}
