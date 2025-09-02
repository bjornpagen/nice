import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import type { Canvas } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"

// --- START: Moved Zod Schema Definitions ---
// These schemas were previously in coordinate-plane-base.ts and are now homed here.

// Factory function for axis schema to prevent $ref generation
export const createAxisOptionsSchema = () =>
	z
		.object({
			label: z.string().describe('The text title for the axis (e.g., "Number of Days").'),
			min: z.number().describe("The minimum value displayed on the axis."),
			max: z.number().describe("The maximum value displayed on the axis."),
			tickInterval: z.number().describe("The numeric interval between labeled tick marks on the axis."),
			showGridLines: z.boolean().describe("If true, display grid lines for this axis.")
		})
		.strict()

export const AxisOptionsSchema = createAxisOptionsSchema()
export type AxisOptions = z.infer<typeof AxisOptionsSchema>

// Factory function for point schema to prevent $ref generation
export const createPlotPointSchema = () =>
	z
		.object({
			id: z.string().describe("A unique identifier for this point, used to reference it when creating polygons."),
			x: z.number().describe("The value of the point on the horizontal (X) axis."),
			y: z.number().describe("The value of the point on the vertical (Y) axis."),
			label: z.string().describe('A text label to display near the point (e.g., "A", "(m, n)").'),
			color: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe("The color of the point, as a CSS color string."),
			style: z.enum(["open", "closed"]).describe("Visual style for the point marker.")
		})
		.strict()

export const PlotPointSchema = createPlotPointSchema()
export type PlotPoint = z.infer<typeof PlotPointSchema>

// Factory functions for line equation schemas to prevent $ref generation
export const createSlopeInterceptLineSchema = () =>
	z
		.object({
			type: z.literal("slopeIntercept").describe("Specifies a straight line in y = mx + b form."),
			slope: z.number().describe("The slope of the line (m)."),
			yIntercept: z.number().describe("The y-value where the line crosses the Y-axis (b).")
		})
		.strict()

export const createStandardLineSchema = () =>
	z
		.object({
			type: z.literal("standard").describe("Specifies a straight line in Ax + By = C form."),
			A: z.number().describe("The coefficient of x."),
			B: z.number().describe("The coefficient of y."),
			C: z.number().describe("The constant term.")
		})
		.strict()

export const createPointSlopeLineSchema = () =>
	z
		.object({
			type: z.literal("pointSlope").describe("Specifies a straight line in point-slope form."),
			x1: z.number().describe("The x-coordinate of the known point."),
			y1: z.number().describe("The y-coordinate of the known point."),
			slope: z.number().describe("The slope of the line.")
		})
		.strict()

// Factory function for line equation union
export const createLineEquationSchema = () =>
	z.discriminatedUnion("type", [
		createSlopeInterceptLineSchema(),
		createStandardLineSchema(),
		createPointSlopeLineSchema()
	])

// Factory function for line schema
export const createLineSchema = () =>
	z
		.object({
			id: z.string().describe('A unique identifier for the line (e.g., "line-a").'),
			equation: createLineEquationSchema().describe("The mathematical definition of the line."),
			color: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe('The color of the line, as a CSS color string (e.g., "red", "#FF0000").'),
			style: z.enum(["solid", "dashed"]).describe("The style of the line.")
		})
		.strict()

export const LineSchema = createLineSchema()
export type Line = z.infer<typeof LineSchema>

// Factory function for polygon schema
export const createPolygonSchema = () =>
	z
		.object({
			vertices: z
				.array(z.string())
				.min(2)
				.describe(
					"An array of point `id` strings, in the order they should be connected. Requires at least 2 points for a line, 3 for a polygon."
				),
			isClosed: z
				.boolean()
				.describe(
					"If true, connects the last vertex to the first to form a closed shape. If false, renders an open polyline."
				),
			fillColor: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe(
					"The fill color of the polygon, as a CSS color string (e.g., with alpha for transparency). Only applies if isClosed is true."
				),
			strokeColor: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe("The border color of the polygon."),
			label: z.string().describe("A label for the polygon itself.")
		})
		.strict()

export const PolygonSchema = createPolygonSchema()
export type Polygon = z.infer<typeof PolygonSchema>

// Factory function for distance schema
export const createDistanceSchema = () =>
	z
		.object({
			pointId1: z.string().describe("The ID of the first point."),
			pointId2: z.string().describe("The ID of the second point."),
			showLegs: z.boolean().describe("If true, draws the 'rise' and 'run' legs of the right triangle."),
			showLegLabels: z.boolean().describe("If true, labels the legs with their lengths."),
			hypotenuseLabel: z.string().describe("A label for the hypotenuse (the distance line)."),
			color: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe("The color of the distance lines."),
			style: z.enum(["solid", "dashed"]).describe("The style of the distance lines.")
		})
		.strict()

export const DistanceSchema = createDistanceSchema()
export type Distance = z.infer<typeof DistanceSchema>

// Factory function for polyline schema
export const createPolylineSchema = () =>
	z
		.object({
			id: z.string().describe("A unique identifier for this polyline."),
			points: z
				.array(z.object({ x: z.number(), y: z.number() }))
				.describe("An array of {x, y} points to connect in order."),
			color: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe("The color of the polyline."),
			style: z.enum(["solid", "dashed"]).describe("The style of the polyline.")
		})
		.strict()

export const PolylineSchema = createPolylineSchema()
export type Polyline = z.infer<typeof PolylineSchema>

/**
 * Utility to render points using Canvas API.
 */
export function renderPoints(
	points: PlotPoint[],
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number,
	canvas: Canvas
): void {
	// The Zod schema ensures `points` is an array, so `if (!points)` is not necessary.
	for (const p of points) {
		const px = toSvgX(p.x)
		const py = toSvgY(p.y)
		const fill = p.style === "open" ? theme.colors.white : p.color

		canvas.drawCircle(px, py, theme.geometry.pointRadius.base, {
			fill,
			stroke: p.color,
			strokeWidth: theme.stroke.width.base
		})

		canvas.drawText({
			x: px + 6,
			y: py - 6,
			text: abbreviateMonth(p.label),
			fill: theme.colors.text
		})
	}
}

/**
 * Utility to render lines with support for all equation types using Canvas API.
 */
export function renderLines(
	lines: Line[],
	xAxis: AxisOptions,
	yAxis: AxisOptions,
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number,
	canvas: Canvas
): void {
	if (!lines) return

	for (const l of lines) {
		let y1: number,
			y2: number,
			isVertical = false,
			verticalX: number | null = null

		if (l.equation.type === "slopeIntercept") {
			const { slope, yIntercept } = l.equation
			y1 = slope * xAxis.min + yIntercept
			y2 = slope * xAxis.max + yIntercept
		} else if (l.equation.type === "standard") {
			const { A, B, C } = l.equation
			if (B === 0) {
				isVertical = true
				verticalX = C / A
				y1 = yAxis.min
				y2 = yAxis.max
			} else {
				y1 = (C - A * xAxis.min) / B
				y2 = (C - A * xAxis.max) / B
			}
		} else {
			const { x1, y1: yPoint, slope } = l.equation
			y1 = slope * (xAxis.min - x1) + yPoint
			y2 = slope * (xAxis.max - x1) + yPoint
		}

		const dash = l.style === "dashed" ? "5 3" : undefined
		const x1Svg = isVertical && verticalX !== null ? toSvgX(verticalX) : toSvgX(xAxis.min)
		const x2Svg = isVertical && verticalX !== null ? toSvgX(verticalX) : toSvgX(xAxis.max)

		canvas.drawInClippedRegion((clippedCanvas) => {
			clippedCanvas.drawLine(x1Svg, toSvgY(y1), x2Svg, toSvgY(y2), {
				stroke: l.color,
				strokeWidth: theme.stroke.width.thick,
				dash: dash
			})
		})
	}
}

/**
 * Utility to render polygons that reference points by ID using Canvas API.
 */
export function renderPolygons(
	polygons: Polygon[],
	pointMap: Map<string, PlotPoint>,
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number,
	canvas: Canvas
): void {
	if (!polygons) return

	canvas.drawInClippedRegion((clippedCanvas) => {
		for (const poly of polygons) {
			const polyPoints = poly.vertices
				.map((id) => {
					const pt = pointMap.get(id)
					return pt ? { x: toSvgX(pt.x), y: toSvgY(pt.y) } : null
				})
				.filter((pt): pt is { x: number; y: number } => pt !== null)

			if (polyPoints.length > 0) {
				if (poly.isClosed) {
					clippedCanvas.drawPolygon(polyPoints, {
						fill: poly.fillColor,
						stroke: poly.strokeColor,
						strokeWidth: theme.stroke.width.thick
					})
				} else {
					clippedCanvas.drawPolyline(polyPoints, {
						stroke: poly.strokeColor,
						strokeWidth: theme.stroke.width.thick
					})
				}

				const centroidX = polyPoints.reduce((sum, pt) => sum + pt.x, 0) / polyPoints.length
				const bottomY = Math.max(...polyPoints.map((pt) => pt.y))
				const labelX = centroidX
				const labelY = bottomY + 20

				clippedCanvas.drawText({
					x: labelX,
					y: labelY,
					text: abbreviateMonth(poly.label),
					anchor: "middle",
					fontPx: theme.font.size.medium,
					fontWeight: "500",
					fill: poly.strokeColor
				})
			}
		}
	})
}

/**
 * Utility to render distance visualizations between points using Canvas API.
 */
export function renderDistances(
	distances: Distance[],
	pointMap: Map<string, PlotPoint>,
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number,
	canvas: Canvas
): void {
	if (!distances) return

	for (const dist of distances) {
		const p1 = pointMap.get(dist.pointId1)
		const p2 = pointMap.get(dist.pointId2)
		if (!p1 || !p2) continue

		const p1Svg = { x: toSvgX(p1.x), y: toSvgY(p1.y) }
		const p2Svg = { x: toSvgX(p2.x), y: toSvgY(p2.y) }
		const cornerSvg = { x: toSvgX(p2.x), y: toSvgY(p1.y) }

		const dash = dist.style === "dashed" ? "4 3" : undefined

		// Hypotenuse
		canvas.drawLine(p1Svg.x, p1Svg.y, p2Svg.x, p2Svg.y, {
			stroke: dist.color,
			strokeWidth: theme.stroke.width.base,
			dash: dash
		})

		if (dist.showLegs) {
			// Horizontal and Vertical Legs
			canvas.drawLine(p1Svg.x, p1Svg.y, cornerSvg.x, cornerSvg.y, {
				stroke: dist.color,
				strokeWidth: theme.stroke.width.base,
				dash: dash
			})
			canvas.drawLine(cornerSvg.x, cornerSvg.y, p2Svg.x, p2Svg.y, {
				stroke: dist.color,
				strokeWidth: theme.stroke.width.base,
				dash: dash
			})
		}

		// TODO: Add leg labels and hypotenuse labels if needed
	}
}

/**
 * Utility to render polylines (function plots) using Canvas API.
 */
export function renderPolylines(
	polylines: Polyline[],
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number,
	canvas: Canvas
): void {
	if (!polylines) return

	canvas.drawInClippedRegion((clippedCanvas) => {
		for (const polyline of polylines) {
			const points = polyline.points.map((p) => ({ x: toSvgX(p.x), y: toSvgY(p.y) }))
			if (points.length > 0) {
				const dash = polyline.style === "dashed" ? "5 3" : undefined
				clippedCanvas.drawPolyline(points, {
					stroke: polyline.color,
					strokeWidth: theme.stroke.width.thick,
					dash: dash
				})
			}
		}
	})
}
