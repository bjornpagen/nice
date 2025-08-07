import { z } from "zod"
import {
	createAxisOptionsSchema,
	createDistanceSchema,
	createPlotPointSchema,
	generateCoordinatePlaneBase,
	renderDistances,
	renderPoints
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const DistanceFormulaGraphPropsSchema = z
	.object({
		type: z.literal("distanceFormulaGraph"),
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
		points: z
			.array(createPlotPointSchema())
			.describe("An array of points that can be referenced by distance visualizations."),
		distances: z.array(createDistanceSchema()).describe("An array of distances to visualize between points.")
	})
	.strict()
	.describe(
		"Generates a coordinate plane focused on visualizing distances between points with optional right triangle legs and labels."
	)

export type DistanceFormulaGraphProps = z.infer<typeof DistanceFormulaGraphPropsSchema>

export const generateDistanceFormulaGraph: WidgetGenerator<typeof DistanceFormulaGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points, distances } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)
	let content = ""

	// Render distances first (background)
	content += renderDistances(distances, base.pointMap, base.toSvgX, base.toSvgY)

	// Render points last (foreground)
	content += renderPoints(points, base.toSvgX, base.toSvgY)

	return `${base.svg}${content}</svg>`
}
