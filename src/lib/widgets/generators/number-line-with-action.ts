import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a custom label for a specific position on the number line
const NumberLineCustomLabelSchema = z.object({
	value: z.number().describe("The numeric position of the label."),
	text: z.string().describe('The text to display for the label (e.g., "-11°C", "?°C").')
})

// Defines the action arrow to be drawn over the number line
const ActionArrowSchema = z.object({
	startValue: z.number().describe("The numeric value where the action arrow begins."),
	change: z
		.number()
		.describe("The amount of change. A positive value moves right/up, a negative value moves left/down."),
	label: z.string().describe('The text label to display alongside the arrow (e.g., "+5°C", "-24").')
})

// The main Zod schema for the numberLineWithAction function
export const NumberLineWithActionPropsSchema = z
	.object({
		width: z.number().default(260).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(325).describe("The total height of the output SVG container in pixels."),
		orientation: z.enum(["horizontal", "vertical"]).default("vertical").describe("The orientation of the number line."),
		min: z.number().describe("The minimum value displayed on the number line."),
		max: z.number().describe("The maximum value displayed on the number line."),
		tickInterval: z.number().describe("The numeric interval between tick marks."),
		customLabels: z
			.array(NumberLineCustomLabelSchema)
			.describe("An array providing text labels for key points, such as the start value and the unknown end value."),
		action: ActionArrowSchema.describe("Configuration for the action arrow representing the change.")
	})
	.describe(
		'This template extends the basic number line to visually represent a dynamic process or operation, such as addition or subtraction. It is perfect for illustrating word problems that involve a change from a starting value. The generator will render a number line, mark a starting point, and draw a curved arrow to visually represent an "action" or change (e.g., "+5°C"). The destination of the arrow can be labeled with a question mark ("?"), making it ideal for problems where the student must calculate the result.'
	)

export type NumberLineWithActionProps = z.infer<typeof NumberLineWithActionPropsSchema>

/**
 * This template extends the basic number line to visually represent a dynamic process or operation,
 * such as addition or subtraction.
 */
export const generateNumberLineWithAction: WidgetGenerator<typeof NumberLineWithActionPropsSchema> = (_data) => {
	// TODO: Implement number-line-with-action generation
	return "<svg><!-- NumberLineWithAction implementation --></svg>"
}
