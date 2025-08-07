import { z } from "zod"
import {
	createAxisOptionsSchema,
	createPlotPointSchema,
	createPolygonSchema,
	generateCoordinatePlaneBase,
	renderPoints,
	renderPolygons
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const PolygonGraphPropsSchema = z
	.object({
		type: z.literal("polygonGraph"),
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
		points: z.array(createPlotPointSchema()).describe("An array of points that can be referenced by polygons."),
		polygons: z
			.array(createPolygonSchema())
			.describe("An array of polygons or polylines to draw on the plane by connecting the defined points.")
	})
	.strict()
	.describe(
		"Generates a coordinate plane focused on drawing polygons and polylines by connecting points referenced by their IDs."
	)

export type PolygonGraphProps = z.infer<typeof PolygonGraphPropsSchema>

export const generatePolygonGraph: WidgetGenerator<typeof PolygonGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points, polygons } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)
	let content = ""

	// Render polygons first (background)
	content += renderPolygons(polygons, base.pointMap, base.toSvgX, base.toSvgY)

	// Render points last (foreground)
	content += renderPoints(points, base.toSvgX, base.toSvgY)

	return `${base.svg}${content}</svg>`
}
