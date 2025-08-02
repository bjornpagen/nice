import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the numberLineForOpposites function
export const NumberLineForOppositesPropsSchema = z
	.object({
		width: z.number().default(460).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(90).describe("The total height of the output SVG container in pixels."),
		maxAbsValue: z
			.number()
			.describe("The maximum absolute value for the number line bounds (e.g., 10 for a value of 8.3)."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		value: z
			.number()
			.describe(
				"The absolute value of the number whose opposite is being illustrated (e.g., for -8.3 and 8.3, the value is 8.3)."
			),
		positiveLabel: z
			.string()
			.optional()
			.describe('The label for the positive point (defaults to the number itself, but can be "?").'),
		negativeLabel: z
			.string()
			.optional()
			.describe('The label for the negative point (defaults to the number itself, but can be "?").'),
		showArrows: z.boolean().default(true).describe("If true, shows symmetric arrows from 0 to each point.")
	})
	.describe(
		'This template is specifically designed to generate an SVG diagram that illustrates the concept of opposite numbers. The diagram\'s purpose is to visually reinforce that opposite numbers are equidistant from zero. The generator will create a horizontal number line that is always centered on 0. Based on a single input value, it will automatically plot two points: one at the negative value (-value) and one at the positive value (+value). To emphasize the relationship, the template will draw two symmetric arrows originating from 0 and pointing to each of the two points. The points can be labeled differently; for example, one can show its numerical value (e.g., "8.3") while its opposite is labeled with a question mark, prompting the student to identify it. This creates a clear, pedagogical diagram for questions about number opposites.'
	)

export type NumberLineForOppositesProps = z.infer<typeof NumberLineForOppositesPropsSchema>

/**
 * This template is specifically designed to generate an SVG diagram that illustrates
 * the concept of opposite numbers. The diagram's purpose is to visually reinforce
 * that opposite numbers are equidistant from zero.
 */
export const generateNumberLineForOpposites: WidgetGenerator<typeof NumberLineForOppositesPropsSchema> = (_data) => {
	// TODO: Implement number-line-for-opposites generation
	return "<svg><!-- NumberLineForOpposites implementation --></svg>"
}
