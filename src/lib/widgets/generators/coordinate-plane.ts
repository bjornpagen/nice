import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or axis range")

// Defines a single point to be plotted on the coordinate plane
const PointSchema = z
	.object({
		id: z.string().describe("A unique identifier for this point, used to reference it when creating polygons."),
		x: z.number().describe("The value of the point on the horizontal (X) axis."),
		y: z.number().describe("The value of the point on the vertical (Y) axis."),
		label: z.string().nullable().describe('An optional text label to display near the point (e.g., "A", "(m, n)").'),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "#4285F4")
			.describe("The color of the point, as a CSS color string."),
		style: z
			.enum(["open", "closed"])
			.nullable()
			.transform((val) => val ?? "closed")
			.describe("Visual style for the point marker.")
	})
	.strict()

// Defines a linear trend line using slope and y-intercept
const SlopeInterceptLineSchema = z
	.object({
		type: z.literal("slopeIntercept").describe("Specifies a straight line in y = mx + b form."),
		slope: z.number().describe("The slope of the line (m)."),
		yIntercept: z.number().describe("The y-value where the line crosses the Y-axis (b).")
	})
	.strict()

// Defines a line using standard form Ax + By = C
const StandardLineSchema = z
	.object({
		type: z.literal("standard"),
		A: z.number(),
		B: z.number(),
		C: z.number()
	})
	.strict()

// Defines a line using point-slope form y - y1 = m(x - x1)
const PointSlopeSchema = z
	.object({
		type: z.literal("pointSlope"),
		x1: z.number(),
		y1: z.number(),
		slope: z.number()
	})
	.strict()

// Defines a straight line to be plotted on the plane
const LineSchema = z
	.object({
		id: z.string().describe('A unique identifier for the line (e.g., "line-a").'),
		equation: z
			.discriminatedUnion("type", [SlopeInterceptLineSchema, StandardLineSchema, PointSlopeSchema])
			.describe("The mathematical definition of the line."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "#EA4335")
			.describe('The color of the line, as a CSS color string (e.g., "red", "#FF0000").'),
		style: z
			.enum(["solid", "dashed"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The style of the line.")
	})
	.strict()

// Defines a polygon or polyline to be drawn by connecting a series of points
const PolygonSchema = z
	.object({
		vertices: z
			.array(z.string())
			.min(2)
			.describe(
				"An array of point `id` strings, in the order they should be connected. Requires at least 2 points for a line, 3 for a polygon."
			),
		isClosed: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe(
				"If true, connects the last vertex to the first to form a closed shape. If false, renders an open polyline."
			),
		fillColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "rgba(66, 133, 244, 0.3)")
			.describe(
				"The fill color of the polygon, as a CSS color string (e.g., with alpha for transparency). Only applies if isClosed is true."
			),
		strokeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "rgba(66, 133, 244, 1)")
			.describe("The border color of the polygon."),
		label: z.string().nullable().describe("An optional label for the polygon itself.")
	})
	.strict()

// Defines a visual representation of the distance between two points
const DistanceSchema = z
	.object({
		pointId1: z.string().describe("The ID of the first point."),
		pointId2: z.string().describe("The ID of the second point."),
		showLegs: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe("If true, draws the 'rise' and 'run' legs of the right triangle."),
		showLegLabels: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, labels the legs with their lengths."),
		hypotenuseLabel: z.string().nullable().describe("An optional label for the hypotenuse (the distance line)."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "gray")
			.describe("The color of the distance lines."),
		style: z
			.enum(["solid", "dashed"])
			.nullable()
			.transform((val) => val ?? "dashed")
			.describe("The style of the distance lines.")
	})
	.strict()

// Defines a simple polyline/function graph from an array of points
const PolylineSchema = z
	.object({
		id: z.string().describe("A unique identifier for this polyline."),
		points: z
			.array(z.object({ x: z.number(), y: z.number() }))
			.describe("An array of {x, y} points to connect in order."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "black")
			.describe("The color of the polyline."),
		style: z
			.enum(["solid", "dashed"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The style of the polyline.")
	})
	.strict()

// The main Zod schema for the coordinatePlane function
export const CoordinatePlanePropsSchema = z
	.object({
		type: z.literal("coordinatePlane"),
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
		// INLINED: The AxisSchema definition is now directly inside the xAxis property.
		xAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.describe(
						'The text title for the axis (e.g., "Number of Days"). If omitted, a simple "x" or "y" may be used.'
					),
				min: z.number().describe("The minimum value displayed on the axis."),
				max: z.number().describe("The maximum value displayed on the axis."),
				tickInterval: z.number().describe("The numeric interval between labeled tick marks on the axis."),
				showGridLines: z
					.boolean()
					.nullable()
					.transform((val) => val ?? true)
					.describe("If true, display grid lines for this axis.")
			})
			.strict()
			.describe("Configuration for the horizontal (X) axis."),
		// INLINED: The AxisSchema definition is now directly inside the yAxis property.
		yAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.describe(
						'The text title for the axis (e.g., "Number of Days"). If omitted, a simple "x" or "y" may be used.'
					),
				min: z.number().describe("The minimum value displayed on the axis."),
				max: z.number().describe("The maximum value displayed on the axis."),
				tickInterval: z.number().describe("The numeric interval between labeled tick marks on the axis."),
				showGridLines: z
					.boolean()
					.nullable()
					.transform((val) => val ?? true)
					.describe("If true, display grid lines for this axis.")
			})
			.strict()
			.describe("Configuration for the vertical (Y) axis."),
		showQuadrantLabels: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		points: z.array(PointSchema).nullable().describe("An optional array of points to plot on the plane."),
		lines: z
			.array(LineSchema)
			.nullable()
			.describe("An optional array of infinite lines to draw on the plane, defined by their equations."),
		polygons: z
			.array(PolygonSchema)
			.nullable()
			.describe("An optional array of polygons or polylines to draw on the plane by connecting the defined points."),
		distances: z
			.array(DistanceSchema)
			.nullable()
			.describe("An optional array of distances to visualize between points."),
		polylines: z
			.array(PolylineSchema)
			.nullable()
			.describe("An optional array of polylines (function graphs) to draw on the plane.")
	})
	.strict()
	.describe(
		"Generates a complete two-dimensional Cartesian coordinate plane as an SVG graphic. This versatile widget can render a feature-rich plane with configurable axes, grid lines, and quadrant labels. It supports plotting labeled points, drawing polygons by connecting vertices, rendering open polylines (e.g., for piecewise functions), and plotting infinite lines from their slope-intercept equations. This single widget is suitable for a vast range of coordinate geometry problems."
	)

export type CoordinatePlaneProps = z.infer<typeof CoordinatePlanePropsSchema>

/**
 * Generates a versatile Cartesian coordinate plane for plotting points, lines, and polygons.
 * Supports a wide range of coordinate geometry problems.
 */
export const generateCoordinatePlane: WidgetGenerator<typeof CoordinatePlanePropsSchema> = (data) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, points, lines, polygons, distances, polylines } = data
	const pad = { top: 30, right: 30, bottom: 40, left: 40 }
	const chartWidth = width - pad.left - pad.right
	const chartHeight = height - pad.top - pad.bottom

	if (chartWidth <= 0 || chartHeight <= 0 || xAxis.min >= xAxis.max || yAxis.min >= yAxis.max) {
		throw errors.wrap(
			ErrInvalidDimensions,
			`width: ${width}, height: ${height}, xAxis range: ${xAxis.min}-${xAxis.max}, yAxis range: ${yAxis.min}-${yAxis.max}`
		)
	}

	const scaleX = chartWidth / (xAxis.max - xAxis.min)
	const scaleY = chartHeight / (yAxis.max - yAxis.min)

	const toSvgX = (val: number) => pad.left + (val - xAxis.min) * scaleX
	const toSvgY = (val: number) => height - pad.bottom - (val - yAxis.min) * scaleY

	const zeroX = toSvgX(0)
	const zeroY = toSvgY(0)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.axis-label { font-size: 14px; text-anchor: middle; } .quadrant-label { font-size: 18px; fill: #ccc; text-anchor: middle; dominant-baseline: middle; }</style>"

	// Grid lines
	if (xAxis.showGridLines) {
		for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
			if (t === 0) continue
			const x = toSvgX(t)
			svg += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${height - pad.bottom}" stroke="#eee" stroke-width="1"/>`
		}
	}
	if (yAxis.showGridLines) {
		for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
			if (t === 0) continue
			const y = toSvgY(t)
			svg += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#eee" stroke-width="1"/>`
		}
	}

	svg += `<line x1="${pad.left}" y1="${zeroY}" x2="${width - pad.right}" y2="${zeroY}" stroke="black" stroke-width="1.5"/>`
	svg += `<line x1="${zeroX}" y1="${pad.top}" x2="${zeroX}" y2="${height - pad.bottom}" stroke="black" stroke-width="1.5"/>`

	// Ticks and labels
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		if (t === 0) continue
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${zeroY - 4}" x2="${x}" y2="${zeroY + 4}" stroke="black"/>`
		svg += `<text x="${x}" y="${zeroY + 15}" fill="black" text-anchor="middle">${t}</text>`
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		if (t === 0) continue
		const y = toSvgY(t)
		svg += `<line x1="${zeroX - 4}" y1="${y}" x2="${zeroX + 4}" y2="${y}" stroke="black"/>`
		svg += `<text x="${zeroX - 8}" y="${y + 4}" fill="black" text-anchor="end">${t}</text>`
	}
	if (xAxis.label)
		svg += `<text x="${pad.left + chartWidth / 2}" y="${height - 5}" class="axis-label">${xAxis.label}</text>`
	if (yAxis.label)
		svg += `<text x="${pad.left - 25}" y="${pad.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${pad.left - 25}, ${pad.top + chartHeight / 2})">${yAxis.label}</text>`

	// Quadrant labels
	if (showQuadrantLabels) {
		svg += `<text x="${zeroX + chartWidth / 4}" y="${zeroY - chartHeight / 4}" class="quadrant-label">I</text>`
		svg += `<text x="${zeroX - chartWidth / 4}" y="${zeroY - chartHeight / 4}" class="quadrant-label">II</text>`
		svg += `<text x="${zeroX - chartWidth / 4}" y="${zeroY + chartHeight / 4}" class="quadrant-label">III</text>`
		svg += `<text x="${zeroX + chartWidth / 4}" y="${zeroY + chartHeight / 4}" class="quadrant-label">IV</text>`
	}

	// Polygons (drawn first to be in the background)
	const pointMap = new Map(points?.map((pt) => [pt.id, pt]) || [])
	if (polygons) {
		for (const poly of polygons) {
			const polyPointsStr = poly.vertices
				.map((id) => {
					const pt = pointMap.get(id)
					return pt ? `${toSvgX(pt.x)},${toSvgY(pt.y)}` : ""
				})
				.filter(Boolean)
				.join(" ")

			if (polyPointsStr) {
				const tag = poly.isClosed ? "polygon" : "polyline"
				const fill = poly.isClosed ? poly.fillColor : "none"
				svg += `<${tag} points="${polyPointsStr}" fill="${fill}" stroke="${poly.strokeColor}" stroke-width="2"/>`
			}
		}
	}

	// --- NEW: Render Distances ---
	if (distances) {
		for (const dist of distances) {
			const p1 = pointMap.get(dist.pointId1)
			const p2 = pointMap.get(dist.pointId2)
			if (!p1 || !p2) continue

			const p1Svg = { x: toSvgX(p1.x), y: toSvgY(p1.y) }
			const p2Svg = { x: toSvgX(p2.x), y: toSvgY(p2.y) }
			const cornerSvg = { x: toSvgX(p2.x), y: toSvgY(p1.y) }

			const dash = dist.style === "dashed" ? ` stroke-dasharray="4 3"` : ""
			const stroke = `stroke="${dist.color}" stroke-width="1.5"`

			// Hypotenuse
			svg += `<line x1="${p1Svg.x}" y1="${p1Svg.y}" x2="${p2Svg.x}" y2="${p2Svg.y}" ${stroke}${dash}/>`

			if (dist.showLegs) {
				// Horizontal and Vertical Legs
				svg += `<line x1="${p1Svg.x}" y1="${p1Svg.y}" x2="${cornerSvg.x}" y2="${cornerSvg.y}" ${stroke}${dash}/>`
				svg += `<line x1="${cornerSvg.x}" y1="${cornerSvg.y}" x2="${p2Svg.x}" y2="${p2Svg.y}" ${stroke}${dash}/>`
			}
		}
	}

	// --- UPDATE: Modify Line Rendering Logic ---
	if (lines) {
		for (const l of lines) {
			let y1: number
			let y2: number
			if (l.equation.type === "slopeIntercept") {
				const { slope, yIntercept } = l.equation
				y1 = slope * xAxis.min + yIntercept
				y2 = slope * xAxis.max + yIntercept
			} else if (l.equation.type === "standard") {
				// Standard form: Ax + By = C
				// Solve for y: y = (C - Ax) / B
				const { A, B, C } = l.equation
				if (B === 0) {
					// Vertical line: x = C/A
					const x = C / A
					if (x >= xAxis.min && x <= xAxis.max) {
						const dash = l.style === "dashed" ? ' stroke-dasharray="5 3"' : ""
						svg += `<line x1="${toSvgX(x)}" y1="${toSvgY(yAxis.min)}" x2="${toSvgX(x)}" y2="${toSvgY(yAxis.max)}" stroke="${l.color}" stroke-width="2"${dash}/>`
					}
					continue
				}
				y1 = (C - A * xAxis.min) / B
				y2 = (C - A * xAxis.max) / B
			} else {
				// Point-slope form: y - y1 = m(x - x1)
				// Solve for y: y = m(x - x1) + y1
				const { x1, y1: yPoint, slope } = l.equation
				y1 = slope * (xAxis.min - x1) + yPoint
				y2 = slope * (xAxis.max - x1) + yPoint
			}

			const dash = l.style === "dashed" ? ' stroke-dasharray="5 3"' : ""
			svg += `<line x1="${toSvgX(xAxis.min)}" y1="${toSvgY(y1)}" x2="${toSvgX(xAxis.max)}" y2="${toSvgY(y2)}" stroke="${l.color}" stroke-width="2"${dash}/>`
		}
	}

	// --- NEW: Render Polylines ---
	if (polylines) {
		for (const polyline of polylines) {
			const pointsStr = polyline.points.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")

			if (pointsStr) {
				const dash = polyline.style === "dashed" ? ' stroke-dasharray="5 3"' : ""
				svg += `<polyline points="${pointsStr}" fill="none" stroke="${polyline.color}" stroke-width="2"${dash}/>`
			}
		}
	}

	// Points (drawn last to be on top)
	if (points) {
		for (const p of points) {
			const px = toSvgX(p.x)
			const py = toSvgY(p.y)
			const fill = p.style === "open" ? "none" : p.color
			const stroke = p.color
			svg += `<circle cx="${px}" cy="${py}" r="4" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
			if (p.label) svg += `<text x="${px + 6}" y="${py - 6}" fill="black">${p.label}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
