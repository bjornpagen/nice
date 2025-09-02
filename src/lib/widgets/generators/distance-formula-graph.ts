import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import {
	createAxisOptionsSchema,
	createDistanceSchema,
	createPlotPointSchema,
	renderDistances,
	renderPoints
} from "@/lib/widgets/utils/canvas-utils"
import { PADDING } from "@/lib/widgets/utils/constants"
import { setupCoordinatePlaneV2 } from "@/lib/widgets/utils/coordinate-plane-v2"
import { theme } from "@/lib/widgets/utils/theme"

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

	// 1. Call the base generator and get the body content and extents object
	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	const baseInfo = setupCoordinatePlaneV2(
		{
			width,
			height,
			xAxis: {
				label: xAxis.label,
				min: xAxis.min,
				max: xAxis.max,
				tickInterval: xAxis.tickInterval,
				showGridLines: xAxis.showGridLines
			},
			yAxis: {
				label: yAxis.label,
				min: yAxis.min,
				max: yAxis.max,
				tickInterval: yAxis.tickInterval,
				showGridLines: yAxis.showGridLines
			},
			showQuadrantLabels: true
		},
		canvas
	)

	// Create point map for ID resolution
	const pointMap = new Map(points.map((pt) => [pt.id, pt]))

	// Render elements using Canvas API
	renderDistances(distances, pointMap, baseInfo.toSvgX, baseInfo.toSvgY, canvas)
	renderPoints(points, baseInfo.toSvgX, baseInfo.toSvgY, canvas)

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
