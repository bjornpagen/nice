import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a boundary point for an inequality range
const InequalityBoundarySchema = z.object({
	value: z.number().describe("The numerical value of the boundary point."),
	type: z
		.enum(["open", "closed"])
		.describe('The type of circle at the boundary: "open" for < or >, "closed" for ≤ or ≥.')
})

// Defines a single continuous range to be graphed on the number line
const InequalityRangeSchema = z.object({
	start: InequalityBoundarySchema.optional().describe(
		"The starting boundary of the range. If omitted, the range extends to negative infinity."
	),
	end: InequalityBoundarySchema.optional().describe(
		"The ending boundary of the range. If omitted, the range extends to positive infinity."
	),
	color: z
		.string()
		.default("rgba(66, 133, 244, 0.7)")
		.describe("The color of the shaded range and its boundary points.")
})

// The main Zod schema for the inequalityNumberLine function
export const InequalityNumberLinePropsSchema = z
	.object({
		width: z.number().default(460).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(80).describe("The total height of the output SVG container in pixels."),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		ranges: z
			.array(InequalityRangeSchema)
			.min(1)
			.describe("An array of one or more inequality ranges to be graphed on the line.")
	})
	.describe(
		"Generates an SVG number line to graph the solution set of one or more inequalities. This widget is ideal for visualizing simple inequalities (e.g., x > 5), compound 'and' inequalities (e.g., -2 < x ≤ 3), and compound 'or' inequalities (e.g., x ≤ 0 or x > 4). It renders a number line with a configurable range and tick marks. For each specified range, it draws a highlighted segment and places circles at the boundary points. The circles can be 'open' (for <, >) or 'closed' (for ≤, ≥), providing a mathematically precise representation of the solution."
	)

export type InequalityNumberLineProps = z.infer<typeof InequalityNumberLinePropsSchema>

/**
 * Generates an SVG number line to graph the solution set of single or compound inequalities,
 * using open/closed circles and shaded regions to represent the solution.
 */
export const generateInequalityNumberLine: WidgetGenerator<typeof InequalityNumberLinePropsSchema> = (_data) => {
	// TODO: Implement inequality-number-line generation
	return "<svg><!-- InequalityNumberLine implementation --></svg>"
}
