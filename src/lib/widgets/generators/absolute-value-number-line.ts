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
		"Generates an SVG number line to visually demonstrate the concept of absolute value as a distance from zero. The diagram renders a number line with a specified range, plots a point at a given value, and highlights the segment from zero to that point. This creates an unambiguous illustration that connects the abstract concept of |x| to the concrete idea of measuring a length from the origin, regardless of direction, making it ideal for introductory problems on the topic."
	)

export type AbsoluteValueNumberLineProps = z.infer<typeof AbsoluteValueNumberLinePropsSchema>

/**
 * Generates an SVG number line to visually demonstrate the concept of absolute value as
 * a distance from zero, perfect for introductory questions on the topic.
 */
export const generateAbsoluteValueNumberLine: WidgetGenerator<typeof AbsoluteValueNumberLinePropsSchema> = (_data) => {
	// TODO: Implement absolute-value-number-line generation
	return "<svg><!-- AbsoluteValueNumberLine implementation --></svg>"
}
