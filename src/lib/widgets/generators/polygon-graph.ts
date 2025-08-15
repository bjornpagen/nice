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
		type: z.literal("polygonGraph").describe("Identifies this as a polygon graph for drawing shapes on a coordinate plane."),
		width: z.number().positive().describe("Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should accommodate all vertices and labels."),
		height: z.number().positive().describe("Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Often equal to width for square aspect ratio."),
		xAxis: createAxisOptionsSchema().describe("Configuration for the horizontal x-axis including range, tick marks, labels, and optional grid lines."),
		yAxis: createAxisOptionsSchema().describe("Configuration for the vertical y-axis including range, tick marks, labels, and optional grid lines."),
		showQuadrantLabels: z.boolean().describe("Whether to display Roman numerals (I, II, III, IV) in each quadrant. Helps with quadrant identification."),
		points: z.array(createPlotPointSchema()).describe("Labeled points that can be referenced by polygons. Each point has an ID for polygon vertex references. Can include standalone points."),
		polygons: z.array(createPolygonSchema()).describe("Polygons defined by referencing point IDs. Can be closed shapes or open polylines. Each can have different colors and styles. Empty array shows just points.")
	})
	.strict()
	.describe("Creates a coordinate plane for drawing polygons and polylines by connecting named points. Points are defined once and can be reused in multiple polygons. Supports both closed shapes (triangles, quadrilaterals) and open paths. Perfect for coordinate geometry, transformations, and exploring properties of shapes on the coordinate plane.")

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
