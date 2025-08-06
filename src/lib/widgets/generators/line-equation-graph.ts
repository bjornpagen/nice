import { z } from "zod"
import {
	AxisOptionsSchema,
	generateCoordinatePlaneBase,
	LineSchema,
	PlotPointSchema,
	renderLines,
	renderPoints
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const LineEquationGraphPropsSchema = z
	.object({
		type: z.literal("lineEquationGraph"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total height of the output SVG container in pixels."),
		xAxis: AxisOptionsSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: AxisOptionsSchema.describe("Configuration for the vertical (Y) axis."),
		showQuadrantLabels: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		lines: z.array(LineSchema).describe("An array of infinite lines to draw on the plane, defined by their equations."),
		points: z.array(PlotPointSchema).nullable().describe("An optional array of points to plot on the plane.")
	})
	.strict()
	.describe(
		"Generates a coordinate plane focused on plotting linear equations with support for slope-intercept, standard form, and point-slope equations."
	)

export type LineEquationGraphProps = z.infer<typeof LineEquationGraphPropsSchema>

export const generateLineEquationGraph: WidgetGenerator<typeof LineEquationGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, lines, points } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points || [])
	let content = ""

	// Render lines first (background)
	content += renderLines(lines, xAxis, yAxis, base.toSvgX, base.toSvgY)

	// Render points last (foreground)
	if (points) {
		content += renderPoints(points, base.toSvgX, base.toSvgY)
	}

	return `${base.svg}${content}</svg>`
}
