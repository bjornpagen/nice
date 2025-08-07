import { z } from "zod"
import {
	createAxisOptionsSchema,
	createPlotPointSchema,
	createPolylineSchema,
	generateCoordinatePlaneBase,
	renderPoints,
	renderPolylines
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const FunctionPlotGraphPropsSchema = z
	.object({
		type: z.literal("functionPlotGraph"),
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
		xAxis: createAxisOptionsSchema().describe("Configuration for the horizontal (X) axis."),
		yAxis: createAxisOptionsSchema().describe("Configuration for the vertical (Y) axis."),
		showQuadrantLabels: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		polylines: z
			.array(createPolylineSchema())
			.describe("An array of polylines (function graphs) to draw on the plane."),
		points: z
			.array(createPlotPointSchema())
			.nullable()
			.describe("An optional array of points to highlight key features on the functions.")
	})
	.strict()
	.describe("Generates a coordinate plane focused on plotting mathematical functions as connected polylines.")

export type FunctionPlotGraphProps = z.infer<typeof FunctionPlotGraphPropsSchema>

export const generateFunctionPlotGraph: WidgetGenerator<typeof FunctionPlotGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, polylines, points } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points || [])
	let content = ""

	// Render polylines first (background)
	content += renderPolylines(polylines, base.toSvgX, base.toSvgY)

	// Render points last (foreground) - for highlighting key points on the functions
	if (points) {
		content += renderPoints(points, base.toSvgX, base.toSvgY)
	}

	return `${base.svg}${content}</svg>`
}
