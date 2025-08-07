import { z } from "zod"
import {
	createAxisOptionsSchema,
	createPlotPointSchema,
	generateCoordinatePlaneBase,
	renderPoints
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const PointPlotGraphPropsSchema = z
	.object({
		type: z.literal("pointPlotGraph"),
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
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		points: z.array(createPlotPointSchema()).describe("An array of points to plot on the plane.")
	})
	.strict()
	.describe("Generates a coordinate plane focused on plotting individual points with labels and styling.")

export type PointPlotGraphProps = z.infer<typeof PointPlotGraphPropsSchema>

export const generatePointPlotGraph: WidgetGenerator<typeof PointPlotGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)

	let content = renderPoints(points, base.toSvgX, base.toSvgY)

	return `${base.svg}${content}</svg>`
}
