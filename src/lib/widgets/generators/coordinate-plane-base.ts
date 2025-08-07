import * as errors from "@superbuilders/errors"
import { z } from "zod"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or axis range")

// --- TYPE DEFINITIONS ---

// Factory function for axis schema to prevent $ref generation
export const createAxisOptionsSchema = () =>
	z
		.object({
			label: z
				.string()
				.nullable()
				.describe('The text title for the axis (e.g., "Number of Days"). If omitted, a simple "x" or "y" may be used.'),
			min: z.number().describe("The minimum value displayed on the axis."),
			max: z.number().describe("The maximum value displayed on the axis."),
			tickInterval: z.number().describe("The numeric interval between labeled tick marks on the axis."),
			showGridLines: z.boolean().describe("If true, display grid lines for this axis.")
		})
		.strict()

// For backwards compatibility and type inference
export const AxisOptionsSchema = createAxisOptionsSchema()
export type AxisOptions = z.infer<typeof AxisOptionsSchema>

// Factory function for point schema to prevent $ref generation
export const createPlotPointSchema = () =>
	z
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

// For backwards compatibility and type inference
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

// For backwards compatibility
export const SlopeInterceptLineSchema = createSlopeInterceptLineSchema()
export const StandardLineSchema = createStandardLineSchema()
export const PointSlopeLineSchema = createPointSlopeLineSchema()

// Factory function for line equation union
export const createLineEquationSchema = () =>
	z.discriminatedUnion("type", [
		createSlopeInterceptLineSchema(),
		createStandardLineSchema(),
		createPointSlopeLineSchema()
	])

export const LineEquationSchema = createLineEquationSchema()
export type LineEquation = z.infer<typeof LineEquationSchema>

// Factory function for line schema
export const createLineSchema = () =>
	z
		.object({
			id: z.string().describe('A unique identifier for the line (e.g., "line-a").'),
			equation: createLineEquationSchema().describe("The mathematical definition of the line."),
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

export const PolylineSchema = createPolylineSchema()
export type Polyline = z.infer<typeof PolylineSchema>

// --- HELPER FUNCTIONS ---

/**
 * Formats a numeric value as a π-based fraction if it's a multiple of π/4,
 * otherwise returns the original number as a string.
 */
function formatPiLabel(value: number): string {
	const tolerance = 1e-10
	const piQuarter = Math.PI / 4

	// Check if value is close to zero
	if (Math.abs(value) < tolerance) {
		return "0"
	}

	// Check if value is a multiple of π/4
	const ratio = value / piQuarter
	if (Math.abs(ratio - Math.round(ratio)) < tolerance) {
		const rounded = Math.round(ratio)

		// Special cases
		if (rounded === 0) return "0"
		if (rounded === 1) return "π/4"
		if (rounded === -1) return "-π/4"
		if (rounded === 2) return "π/2"
		if (rounded === -2) return "-π/2"
		if (rounded === 3) return "3π/4"
		if (rounded === -3) return "-3π/4"
		if (rounded === 4) return "π"
		if (rounded === -4) return "-π"
		if (rounded === 6) return "3π/2"
		if (rounded === -6) return "-3π/2"
		if (rounded === 8) return "2π"
		if (rounded === -8) return "-2π"

		// General case for other multiples
		if (rounded % 4 === 0) {
			const piMultiple = rounded / 4
			if (piMultiple === 1) return "π"
			if (piMultiple === -1) return "-π"
			return `${piMultiple}π`
		}
		if (rounded % 2 === 0) {
			const halfPiMultiple = rounded / 2
			if (halfPiMultiple === 1) return "π/2"
			if (halfPiMultiple === -1) return "-π/2"
			return `${halfPiMultiple}π/2`
		}
		// Quarter π multiples
		if (rounded === 1) return "π/4"
		if (rounded === -1) return "-π/4"
		return `${rounded}π/4`
	}

	// Not a π multiple, return regular number
	return String(value)
}

// --- CORE GENERATION LOGIC ---

export interface CoordinatePlaneBase {
	svg: string
	toSvgX: (val: number) => number
	toSvgY: (val: number) => number
	width: number
	height: number
	pointMap: Map<string, PlotPoint>
}

/**
 * Internal utility to generate the foundational SVG coordinate plane.
 * @returns An object containing the base SVG string, scaling functions, and point map.
 */
export function generateCoordinatePlaneBase(
	width: number,
	height: number,
	xAxis: AxisOptions,
	yAxis: AxisOptions,
	showQuadrantLabels = false,
	points: PlotPoint[] = []
): CoordinatePlaneBase {
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

	// Build point map for ID resolution
	const pointMap = new Map(points.map((pt) => [pt.id, pt]))

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

	// Axes
	svg += `<line x1="${pad.left}" y1="${zeroY}" x2="${width - pad.right}" y2="${zeroY}" stroke="black" stroke-width="1.5"/>`
	svg += `<line x1="${zeroX}" y1="${pad.top}" x2="${zeroX}" y2="${height - pad.bottom}" stroke="black" stroke-width="1.5"/>`

	// Ticks and labels
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		if (t === 0) continue
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${zeroY - 4}" x2="${x}" y2="${zeroY + 4}" stroke="black"/>`
		svg += `<text x="${x}" y="${zeroY + 15}" fill="black" text-anchor="middle">${formatPiLabel(t)}</text>`
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		if (t === 0) continue
		const y = toSvgY(t)
		svg += `<line x1="${zeroX - 4}" y1="${y}" x2="${zeroX + 4}" y2="${y}" stroke="black"/>`
		svg += `<text x="${zeroX - 8}" y="${y + 4}" fill="black" text-anchor="end">${formatPiLabel(t)}</text>`
	}

	// Axis labels
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

	return { svg, toSvgX, toSvgY, width, height, pointMap }
}

/**
 * Utility to plot an array of points onto an existing SVG canvas.
 * @param points Array of point objects to plot.
 * @param toSvgX The scaling function for the x-coordinate.
 * @param toSvgY The scaling function for the y-coordinate.
 * @returns An SVG string containing all the plotted points.
 */
export function renderPoints(
	points: PlotPoint[],
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number
): string {
	let pointsSvg = ""
	if (!points) return ""

	for (const p of points) {
		const px = toSvgX(p.x)
		const py = toSvgY(p.y)
		const fill = p.style === "open" ? "none" : p.color
		const stroke = p.color
		pointsSvg += `<circle cx="${px}" cy="${py}" r="4" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
		if (p.label) {
			pointsSvg += `<text x="${px + 6}" y="${py - 6}" fill="black">${p.label}</text>`
		}
	}
	return pointsSvg
}

/**
 * Utility to render lines with support for all equation types.
 */
export function renderLines(
	lines: Line[],
	xAxis: AxisOptions,
	yAxis: AxisOptions,
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number
): string {
	let linesSvg = ""
	if (!lines) return ""

	for (const l of lines) {
		let y1: number
		let y2: number
		let isVertical = false
		let verticalX: number | null = null

		if (l.equation.type === "slopeIntercept") {
			const { slope, yIntercept } = l.equation
			y1 = slope * xAxis.min + yIntercept
			y2 = slope * xAxis.max + yIntercept
		} else if (l.equation.type === "standard") {
			// Standard form: Ax + By = C
			const { A, B, C } = l.equation
			if (B === 0) {
				// Vertical line: x = C/A
				isVertical = true
				verticalX = C / A
				y1 = yAxis.min
				y2 = yAxis.max
			} else {
				// Solve for y: y = (C - Ax) / B
				y1 = (C - A * xAxis.min) / B
				y2 = (C - A * xAxis.max) / B
			}
		} else {
			// Point-slope form: y - y1 = m(x - x1)
			const { x1, y1: yPoint, slope } = l.equation
			y1 = slope * (xAxis.min - x1) + yPoint
			y2 = slope * (xAxis.max - x1) + yPoint
		}

		const dash = l.style === "dashed" ? ' stroke-dasharray="5 3"' : ""
		const x1Svg = isVertical && verticalX !== null ? toSvgX(verticalX) : toSvgX(xAxis.min)
		const x2Svg = isVertical && verticalX !== null ? toSvgX(verticalX) : toSvgX(xAxis.max)

		linesSvg += `<line x1="${x1Svg}" y1="${toSvgY(y1)}" x2="${x2Svg}" y2="${toSvgY(y2)}" stroke="${l.color}" stroke-width="2"${dash}/>`
	}

	return linesSvg
}

/**
 * Utility to render polygons that reference points by ID.
 */
export function renderPolygons(
	polygons: Polygon[],
	pointMap: Map<string, PlotPoint>,
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number
): string {
	let polygonsSvg = ""
	if (!polygons) return ""

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
			polygonsSvg += `<${tag} points="${polyPointsStr}" fill="${fill}" stroke="${poly.strokeColor}" stroke-width="2"/>`
		}
	}

	return polygonsSvg
}

/**
 * Utility to render distance visualizations between points.
 */
export function renderDistances(
	distances: Distance[],
	pointMap: Map<string, PlotPoint>,
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number
): string {
	let distancesSvg = ""
	if (!distances) return ""

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
		distancesSvg += `<line x1="${p1Svg.x}" y1="${p1Svg.y}" x2="${p2Svg.x}" y2="${p2Svg.y}" ${stroke}${dash}/>`

		if (dist.showLegs) {
			// Horizontal and Vertical Legs
			distancesSvg += `<line x1="${p1Svg.x}" y1="${p1Svg.y}" x2="${cornerSvg.x}" y2="${cornerSvg.y}" ${stroke}${dash}/>`
			distancesSvg += `<line x1="${cornerSvg.x}" y1="${cornerSvg.y}" x2="${p2Svg.x}" y2="${p2Svg.y}" ${stroke}${dash}/>`
		}

		// TODO: Add leg labels and hypotenuse labels if needed
	}

	return distancesSvg
}

/**
 * Utility to render polylines (function plots).
 */
export function renderPolylines(
	polylines: Polyline[],
	toSvgX: (v: number) => number,
	toSvgY: (v: number) => number
): string {
	let polylinesSvg = ""
	if (!polylines) return ""

	for (const polyline of polylines) {
		const pointsStr = polyline.points.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")

		if (pointsStr) {
			const dash = polyline.style === "dashed" ? ' stroke-dasharray="5 3"' : ""
			polylinesSvg += `<polyline points="${pointsStr}" fill="none" stroke="${polyline.color}" stroke-width="2"${dash}/>`
		}
	}

	return polylinesSvg
}
