import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single data point on the coordinate plane
const CoordinatePointSchema = z.object({
	x: z.number().describe("The value of the point on the horizontal (X) axis."),
	y: z.number().describe("The value of the point on the vertical (Y) axis.")
})

// Defines the properties of an axis (X or Y)
const AxisSchema = z.object({
	label: z.string().optional().describe("An optional text title for the axis."),
	min: z.number().describe("The minimum value displayed on the axis."),
	max: z.number().describe("The maximum value displayed on the axis."),
	tickInterval: z.number().describe("The numeric interval between labeled tick marks on the axis."),
	showGridLines: z.boolean().default(true).describe("If true, display grid lines for this axis.")
})

// The main Zod schema for the coordinatePlaneWithPoints function
export const CoordinatePlaneWithPointsPropsSchema = z
	.object({
		width: z.number().default(350).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(350).describe("The total height of the output SVG container in pixels."),
		xAxis: AxisSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: AxisSchema.describe("Configuration for the vertical (Y) axis."),
		points: z.array(CoordinatePointSchema).min(1).describe("An array of data points to be plotted.")
	})
	.describe(
		'This template is designed to generate a clear and standards-compliant two-dimensional Cartesian coordinate plane as an SVG graphic, embedded within an HTML <div>. It is specifically for plotting a discrete set of ordered pairs, which is ideal for questions where students need to identify the mathematical rule or relationship connecting a few example points. The generator will construct a complete coordinate system, typically focusing on the first quadrant but fully configurable. It will render X and Y axes, which can be labeled with titles (e.g., "Number of hours," "Distance traveled"). Both axes will be marked with numbered tick marks at specified intervals, and the visible range (minimum and maximum values) of each axis is fully customizable. Optional grid lines (both major and minor) can be displayed to help students read the coordinates accurately. The core of the graphic consists of several data points, each rendered as a solid, filled circle at its precise (x, y) coordinate. The final output is a clean, to-scale, and accessible SVG diagram ready for inclusion in a QTI item body, helping students visualize the relationship between two variables from a set of examples.'
	)

export type CoordinatePlaneWithPointsProps = z.infer<typeof CoordinatePlaneWithPointsPropsSchema>

/**
 * This template is designed to generate a clear and standards-compliant two-dimensional
 * Cartesian coordinate plane as an SVG graphic. It is specifically for plotting a discrete
 * set of ordered pairs, ideal for questions where students need to identify mathematical
 * rules or relationships.
 */
export const generateCoordinatePlaneWithPoints: WidgetGenerator<typeof CoordinatePlaneWithPointsPropsSchema> = (
	_data
) => {
	// TODO: Implement coordinate-plane-with-points generation
	return "<svg><!-- CoordinatePlaneWithPoints implementation --></svg>"
}
