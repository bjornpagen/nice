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
		"This template generates a highly customizable SVG graphic of a number line for the purpose of visualizing simple inequalities. It is ideal for questions that require students to graph an inequality or interpret a graph of an inequality. The generator constructs a horizontal line axis with a configurable numerical range (minimum and maximum values). The line is marked with major tick marks at a specified interval, and each major tick is labeled with its corresponding value. The core functionality is to represent the solution set of an inequality (e.g., x < -1 or x >= 4). This is achieved by drawing two components: 1. An Endpoint Circle: A circle is placed at the boundary value of the inequality. The style of this circle is configurable as either 'open' (for strict inequalities < and >) or 'closed'/'filled' (for inclusive inequalities ≤ and ≥). 2. A Ray: An arrowed line (ray) is drawn from the endpoint circle, extending infinitely in one direction. The direction is configurable as either 'left' (for \"less than\") or 'right' (for \"greater than\"). Additionally, this template supports optional text labels placed above the line to provide context in word problems, labeling the regions to the left and right of the boundary value (e.g., \"Slower than sound,\" \"Faster than sound\"). The final SVG is a clear and mathematically precise representation of an inequality."
	)

export type InequalityNumberLineProps = z.infer<typeof InequalityNumberLinePropsSchema>

/**
 * This template generates a highly customizable SVG graphic of a number line for
 * the purpose of visualizing simple inequalities. It is ideal for questions that
 * require students to graph an inequality or interpret a graph of an inequality.
 */
export const generateInequalityNumberLine: WidgetGenerator<typeof InequalityNumberLinePropsSchema> = (_data) => {
	// TODO: Implement inequality-number-line generation
	return "<svg><!-- InequalityNumberLine implementation --></svg>"
}
