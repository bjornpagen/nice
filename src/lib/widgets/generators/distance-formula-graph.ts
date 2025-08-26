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
		type: z
			.literal("distanceFormulaGraph")
			.describe("Identifies this as a distance formula graph widget for visualizing distances between points."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should accommodate axis labels and distance annotations."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Typically equal to width for square aspect ratio."
			),
		xAxis: createAxisOptionsSchema().describe(
			"Horizontal axis configuration with range, ticks, and optional grid. The min/max should encompass all plotted points with padding."
		),
		yAxis: createAxisOptionsSchema().describe(
			"Vertical axis configuration with range, ticks, and optional grid. The min/max should encompass all plotted points with padding."
		),
		showQuadrantLabels: z
			.boolean()
			.describe(
				"Whether to show Roman numerals (I, II, III, IV) in quadrants. True helps with quadrant identification in distance problems."
			),
		points: z
			.array(createPlotPointSchema())
			.describe(
				"Points to plot on the plane. Each point can have a label. Points referenced in distances should be defined here. Empty array if only showing distances."
			),
		distances: z
			.array(createDistanceSchema())
			.describe(
				"Distance measurements to visualize. Each shows horizontal leg, vertical leg, and hypotenuse with labels. Demonstrates Pythagorean theorem visually. Empty array means no distances."
			)
	})
	.strict()
	.describe(
		"Creates a coordinate plane specifically designed for distance formula visualization. Shows the right triangle formed by two points with labeled legs (Δx, Δy) and hypotenuse (distance). Essential for teaching d = √[(x₂-x₁)² + (y₂-y₁)²] geometrically."
	)

export type DistanceFormulaGraphProps = z.infer<typeof DistanceFormulaGraphPropsSchema>

export const generateDistanceFormulaGraph: WidgetGenerator<typeof DistanceFormulaGraphPropsSchema> = (props) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points, distances } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)
	let content = ""

	// Render distances first (background)
	content += renderDistances(distances, base.pointMap, base.toSvgX, base.toSvgY, base.ext)

	// Render points last (foreground)
	content += renderPoints(points, base.toSvgX, base.toSvgY, base.ext)

	return `${base.svg}${content}</svg>`
}
