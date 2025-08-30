import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING, TICK_LABEL_FONT_PX } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import {
	calculateIntersectionAwareTicks,
	calculateXAxisLayout,
	calculateYAxisLayoutAxisAware,
	computeDynamicWidth,
	createChartClipPath,
	includeRotatedYAxisLabel,
	includeText,
	includePointX,
	initExtents,
	type Extents
} from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { computeAndRenderXAxis, computeAndRenderYAxis, type AxisSpec, type AxisSpecX, type AxisSpecY } from "@/lib/widgets/utils/axes"
import {
	CHART_TITLE_TOP_PADDING_PX,
	CHART_TITLE_FONT_PX,
	CHART_TITLE_BOTTOM_PADDING_PX,
	AXIS_VIEWBOX_PADDING,
	ESTIMATED_BOTTOM_MARGIN_PX,
	LABEL_AVG_CHAR_WIDTH_PX
} from "@/lib/widgets/utils/constants"
import { estimateWrappedTextDimensions, renderWrappedText } from "@/lib/widgets/utils/text"

export const ErrInvalidDimensions = errors.new("invalid chart dimensions or axis range")

// --- TYPE DEFINITIONS ---

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
	svgBody: string // Changed from 'svg'
	toSvgX: (val: number) => number
	toSvgY: (val: number) => number
	width: number // This is now the initial width, not dynamic
	height: number
	pointMap: Map<string, PlotPoint>
	ext: Extents
}

/**
 * Internal utility to generate the foundational SVG coordinate plane.
 * @returns An object containing the base SVG body string, scaling functions, and point map.
 */
export function generateCoordinatePlaneBase(
	width: number,
	height: number,
	xAxis: AxisOptions,
	yAxis: AxisOptions,
	showQuadrantLabels = false,
	points: PlotPoint[] = []
): CoordinatePlaneBase {
	// Calculate vertical margins first to determine chartHeight
	const { bottomMargin, xAxisTitleY } = calculateXAxisLayout(true) // has tick labels
	// Ensure enough top headroom for top-most Y tick label ascenders
	const approximateAscentPx = Math.ceil(TICK_LABEL_FONT_PX * 0.8)
	const baselineOffsetPx = 4
	const requiredTopHeadroom = Math.max(0, approximateAscentPx - baselineOffsetPx)
	const padWithoutLeft = { top: Math.max(PADDING, requiredTopHeadroom), right: PADDING, bottom: bottomMargin }
	
	// Calculate chartHeight based on vertical margins
	const chartHeight = height - padWithoutLeft.top - padWithoutLeft.bottom
	
	if (chartHeight <= 0 || xAxis.min >= xAxis.max || yAxis.min >= yAxis.max) {
		logger.error("invalid chart dimensions or axis range", { width, height, chartHeight, xAxis, yAxis })
		throw errors.wrap(
			ErrInvalidDimensions,
			`width: ${width}, height: ${height}, xAxis range: ${xAxis.min}-${xAxis.max}, yAxis range: ${yAxis.min}-${yAxis.max}`
		)
	}
	
	// Now calculate Y-axis layout using the determined chartHeight
	const { leftMargin, yAxisLabelX, anchorX } = calculateYAxisLayoutAxisAware(
		yAxis,
		xAxis,
		width,
		chartHeight,
		padWithoutLeft,
		{ axisPlacement: "internalZero", axisTitleFontPx: 14 }
	)
	const pad = { ...padWithoutLeft, left: leftMargin }
	
	// Calculate chartWidth with the final left margin
	const chartWidth = width - pad.left - pad.right
	if (chartWidth <= 0) {
		logger.error("invalid chart width", { width, chartWidth })
		throw errors.wrap(ErrInvalidDimensions, `width: ${width}, chartWidth: ${chartWidth}`)
	}

	const scaleX = chartWidth / (xAxis.max - xAxis.min)
	const scaleY = chartHeight / (yAxis.max - yAxis.min)

	const toSvgX = (val: number) => pad.left + (val - xAxis.min) * scaleX
	const toSvgY = (val: number) => height - pad.bottom - (val - yAxis.min) * scaleY

	const zeroX = anchorX
	const zeroY = toSvgY(0)

	// Build point map for ID resolution
	const pointMap = new Map(points.map((pt) => [pt.id, pt]))

	const ext = initExtents(width)
	let svgBody = `<style>.axis-label { font-size: 14px; text-anchor: middle; } .quadrant-label { font-size: 18px; fill: #ccc; text-anchor: middle; dominant-baseline: middle; }</style>`

	// Add clipping path for chart area to prevent lines from extending beyond bounds
	svgBody += createChartClipPath("chartArea", pad.left, pad.top, chartWidth, chartHeight)

	// Grid lines
	if (xAxis.showGridLines) {
		for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
			if (t === 0) continue
			const x = toSvgX(t)
			svgBody += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${height - pad.bottom}" stroke="${theme.colors.gridMajor}" stroke-width="${theme.stroke.width.thin}"/>`
		}
	}
	if (yAxis.showGridLines) {
		for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
			if (t === 0) continue
			const y = toSvgY(t)
			svgBody += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="${theme.colors.gridMajor}" stroke-width="${theme.stroke.width.thin}"/>`
		}
	}

	// Axes
	svgBody += `<line x1="${pad.left}" y1="${zeroY}" x2="${width - pad.right}" y2="${zeroY}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.base}"/>`
	svgBody += `<line x1="${zeroX}" y1="${pad.top}" x2="${zeroX}" y2="${height - pad.bottom}" stroke="${theme.colors.axis}" stroke-width="${theme.stroke.width.base}"/>`

	// X-axis ticks and labels with intersection collision avoidance
	const xTickValues: number[] = []
	for (let t = xAxis.min; t <= xAxis.max; t += xAxis.tickInterval) {
		xTickValues.push(t)
	}
	const selectedXTicks = calculateIntersectionAwareTicks(xTickValues, true)

	xTickValues.forEach((t, i) => {
		if (t === 0) return // Skip origin
		const x = toSvgX(t)
		svgBody += `<line x1="${x}" y1="${zeroY - 4}" x2="${x}" y2="${zeroY + 4}" stroke="${theme.colors.axis}"/>`
		if (selectedXTicks.has(i)) {
			const label = formatPiLabel(t)
			svgBody += `<text x="${x}" y="${zeroY + 15}" fill="${theme.colors.axisLabel}" text-anchor="middle">${label}</text>`
			includeText(ext, x, label, "middle", 7)
		}
	})

	// Y-axis ticks and labels with intersection collision avoidance
	const yTickValues: number[] = []
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		yTickValues.push(t)
	}
	const selectedYTicks = calculateIntersectionAwareTicks(yTickValues, false)

	yTickValues.forEach((t, i) => {
		if (t === 0) return // Skip origin
		const y = toSvgY(t)
		svgBody += `<line x1="${zeroX - 4}" y1="${y}" x2="${zeroX + 4}" y2="${y}" stroke="${theme.colors.axis}"/>`
		if (selectedYTicks.has(i)) {
			const label = formatPiLabel(t)
			svgBody += `<text x="${zeroX - 8}" y="${y + 4}" fill="${theme.colors.axisLabel}" text-anchor="end">${label}</text>`
			includeText(ext, zeroX - 8, label, "end", 7)
		}
	})

	// Axis labels
	svgBody += `<text x="${pad.left + chartWidth / 2}" y="${height - pad.bottom + xAxisTitleY}" class="axis-label">${abbreviateMonth(xAxis.label)}</text>`
	includeText(ext, pad.left + chartWidth / 2, abbreviateMonth(xAxis.label), "middle", 7)
	svgBody += `<text x="${yAxisLabelX}" y="${pad.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${yAxisLabelX}, ${pad.top + chartHeight / 2})">${abbreviateMonth(yAxis.label)}</text>`
	includeRotatedYAxisLabel(ext, yAxisLabelX, abbreviateMonth(yAxis.label), chartHeight)

	// Quadrant labels
	if (showQuadrantLabels) {
		svgBody += `<text x="${zeroX + chartWidth / 4}" y="${zeroY - chartHeight / 4}" class="quadrant-label">I</text>`
		svgBody += `<text x="${zeroX - chartWidth / 4}" y="${zeroY - chartHeight / 4}" class="quadrant-label">II</text>`
		svgBody += `<text x="${zeroX - chartWidth / 4}" y="${zeroY + chartHeight / 4}" class="quadrant-label">III</text>`
		svgBody += `<text x="${zeroX + chartWidth / 4}" y="${zeroY + chartHeight / 4}" class="quadrant-label">IV</text>`
	}

	// --- REMOVED ---
	// const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	// svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	// svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)

	return { svgBody, toSvgX, toSvgY, width, height, pointMap, ext }
}

// --- V2 ORCHESTRATOR USING UNIFIED AXIS ENGINE ---

let chartIdCounter = 0

// The public-facing options type will also be a discriminated union.
type AxisOptionsFromWidgetX =
	| {
			xScaleType: "numeric"
			label: string
			min: number // Required for numeric
			max: number // Required for numeric
			tickInterval: number // Required for numeric
			showGridLines: boolean
			showTickLabels: boolean
			showTicks?: boolean
			labelFormatter?: (value: number) => string
		}
	| {
			xScaleType: "categoryBand" | "categoryPoint"
			label: string
			categories: string[] // Required for category
			showGridLines: boolean
			showTickLabels: boolean
			showTicks?: boolean
		}

type AxisOptionsFromWidgetY = {
	label: string
	min: number
	max: number
	tickInterval: number
	showGridLines: boolean
	showTickLabels: boolean
	showTicks?: boolean
	labelFormatter?: (value: number) => string
}

export type CoordinatePlaneBaseV2 = {
	svgBody: string
	clipId: string
	toSvgX: (val: number) => number
	toSvgY: (val: number) => number
	chartArea: { top: number; left: number; width: number; height: number }
	ext: Extents
	bandWidth?: number
	outsideTopPx: number
	outsideBottomPx: number
}

export function generateCoordinatePlaneBaseV2(
	width: number,
	height: number,
	title: string | null,
	xAxis: AxisOptionsFromWidgetX, // Use new X-specific discriminated union type
	yAxis: AxisOptionsFromWidgetY
): CoordinatePlaneBaseV2 {
	const ext = initExtents(width)
	let svgBody = ""

	const clipId = `chartArea-${chartIdCounter++}`

	const hasTitle = !!title
	let titleHeight = 0
	if (hasTitle) {
		const dims = estimateWrappedTextDimensions(title as string, width - AXIS_VIEWBOX_PADDING * 2, CHART_TITLE_FONT_PX)
		titleHeight = CHART_TITLE_TOP_PADDING_PX + dims.height + CHART_TITLE_BOTTOM_PADDING_PX
	}

	// Treat provided width/height as the chart (axis) area size
	// Compute pads using a probe area anchored at (0,0) with the full axis area
	const probeArea = {
		top: 0,
		left: 0,
		width: width,
		height: Math.max(1, height)
	}

	const yAxisSpec: AxisSpecY = { ...yAxis, placement: "left", domain: { min: yAxis.min, max: yAxis.max } }
	const xAxisSpec: AxisSpecX = xAxis.xScaleType === "numeric" 
		? {
			...xAxis,
			placement: "bottom" as const,
			domain: { min: xAxis.min, max: xAxis.max }
		}
		: {
			...xAxis,
			placement: "bottom" as const
		}

	// Create legacy AxisSpec for Y-axis compatibility
	const yAxisLegacySpec: AxisSpec = { ...yAxisSpec, placement: "left" }
	const xAxisLegacySpec: AxisSpec = xAxis.xScaleType === "numeric"
		? {
			domain: { min: xAxis.min, max: xAxis.max },
			tickInterval: xAxis.tickInterval,
			label: xAxis.label,
			showGridLines: xAxis.showGridLines,
			showTickLabels: xAxis.showTickLabels,
			showTicks: xAxis.showTicks,
			placement: "bottom",
			labelFormatter: xAxis.labelFormatter
		}
		: {
			domain: { min: 0, max: xAxis.categories.length },
			tickInterval: 1,
			label: xAxis.label,
			showGridLines: xAxis.showGridLines,
			showTickLabels: xAxis.showTickLabels,
			showTicks: xAxis.showTicks,
			placement: "bottom",
			categories: xAxis.categories
		}

	const yProbe = computeAndRenderYAxis(yAxisLegacySpec, probeArea, xAxisLegacySpec)
	const xProbe = computeAndRenderXAxis(xAxisSpec, probeArea)

	const outsideTopPx = hasTitle ? titleHeight : 0
	const outsideBottomPx = xProbe.pads.bottom
	const leftOutsidePx = yProbe.pads.left

	// Final chart area places the axis area inside the total SVG canvas
	const chartArea = {
		top: outsideTopPx,
		left: leftOutsidePx,
		width: width,
		height: height
	}

	// Render title (outside, above chart area)
	if (hasTitle) {
		const titleX = leftOutsidePx + width / 2
		const titleY = CHART_TITLE_TOP_PADDING_PX
		svgBody += renderWrappedText(title as string, titleX, titleY, "title", "1.1em", width)
		includeText(ext, titleX, title as string, "middle", LABEL_AVG_CHAR_WIDTH_PX)
	}

	// Render axes against the final chartArea
	const yRes = computeAndRenderYAxis(yAxisLegacySpec, chartArea, xAxisLegacySpec)
	svgBody += yRes.markup
	const xRes = computeAndRenderXAxis(xAxisSpec, chartArea)
	svgBody += xRes.markup

	// Clip path for geometry (only chart content, not axes/labels)
	svgBody += createChartClipPath(clipId, chartArea.left, chartArea.top, chartArea.width, chartArea.height)

	// Register extents for axis hardware/text
	yRes.registerExtents(ext)
	xRes.registerExtents(ext)
	// Also include the right boundary of the chart area to ensure width grows as needed
	includePointX(ext, chartArea.left + chartArea.width)

	// Scaling functions
	const yRange = yAxis.max - yAxis.min
	const toSvgX = xRes.toSvg
	function toSvgY(val: number): number {
		const frac = (val - yAxis.min) / yRange
		return chartArea.top + chartArea.height - frac * chartArea.height
	}

	const bandWidth = xRes.bandWidth !== undefined ? xRes.bandWidth : yRes.bandWidth

	return { svgBody, clipId, toSvgX, toSvgY, chartArea, ext, bandWidth, outsideTopPx, outsideBottomPx }
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
	toSvgY: (v: number) => number,
	ext: Extents
): string {
	let pointsSvg = ""
	if (!points) return ""

	for (const p of points) {
		const px = toSvgX(p.x)
		const py = toSvgY(p.y)
		const fill = p.style === "open" ? "none" : p.color
		const stroke = p.color
		pointsSvg += `<circle cx="${px}" cy="${py}" r="${theme.geometry.pointRadius.base}" fill="${fill}" stroke="${stroke}" stroke-width="${theme.stroke.width.base}"/>`
		pointsSvg += `<text x="${px + 6}" y="${py - 6}" fill="${theme.colors.text}">${abbreviateMonth(p.label)}</text>`
		// Add tracking for the point and its label
		includePointX(ext, px)
		includeText(ext, px + 6, abbreviateMonth(p.label), "start")
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
	toSvgY: (v: number) => number,
	ext: Extents
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

		linesSvg += `<line x1="${x1Svg}" y1="${toSvgY(y1)}" x2="${x2Svg}" y2="${toSvgY(y2)}" stroke="${l.color}" stroke-width="${theme.stroke.width.thick}"${dash}/>`
		// Add tracking for the line endpoints
		includePointX(ext, x1Svg)
		includePointX(ext, x2Svg)
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
	toSvgY: (v: number) => number,
	ext: Extents
): string {
	let polygonsSvg = ""
	if (!polygons) return ""

	for (const poly of polygons) {
		const polyPoints = poly.vertices
			.map((id) => {
				const pt = pointMap.get(id)
				return pt ? { x: toSvgX(pt.x), y: toSvgY(pt.y) } : null
			})
			.filter((pt): pt is { x: number; y: number } => pt !== null)

		// Add tracking for each vertex of the polygon
		polyPoints.forEach(pt => includePointX(ext, pt.x));

		const polyPointsStr = polyPoints.map((pt) => `${pt.x},${pt.y}`).join(" ")

		if (polyPointsStr) {
			const tag = poly.isClosed ? "polygon" : "polyline"
			const fill = poly.isClosed ? poly.fillColor : "none"
			polygonsSvg += `<${tag} points="${polyPointsStr}" fill="${fill}" stroke="${poly.strokeColor}" stroke-width="${theme.stroke.width.thick}"/>`

			// Render polygon label
			if (polyPoints.length > 0) {
				// Calculate the centroid of the polygon for label placement
				const centroidX = polyPoints.reduce((sum, pt) => sum + pt.x, 0) / polyPoints.length

				// Calculate the bottom-most point of the polygon
				const bottomY = Math.max(...polyPoints.map((pt) => pt.y))

				// Position label below the polygon
				const labelX = centroidX
				const labelY = bottomY + 20

				polygonsSvg += `<text x="${labelX}" y="${labelY}" fill="${poly.strokeColor}" text-anchor="middle" font-size="${theme.font.size.medium}" font-weight="500">${abbreviateMonth(poly.label)}</text>`
				// Add tracking for the polygon label
				includeText(ext, labelX, abbreviateMonth(poly.label), "middle")
			}
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
	toSvgY: (v: number) => number,
	ext: Extents
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
		const stroke = `stroke="${dist.color}" stroke-width="${theme.stroke.width.base}"`

		// Hypotenuse
		distancesSvg += `<line x1="${p1Svg.x}" y1="${p1Svg.y}" x2="${p2Svg.x}" y2="${p2Svg.y}" ${stroke}${dash}/>`
		// Add tracking for the distance endpoints
		includePointX(ext, p1Svg.x)
		includePointX(ext, p2Svg.x)

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
	toSvgY: (v: number) => number,
	ext: Extents
): string {
	let polylinesSvg = ""
	if (!polylines) return ""

	for (const polyline of polylines) {
		// Track all points in the polyline
		polyline.points.forEach(p => includePointX(ext, toSvgX(p.x)))
		const pointsStr = polyline.points.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")

		if (pointsStr) {
			const dash = polyline.style === "dashed" ? ' stroke-dasharray="5 3"' : ""
			polylinesSvg += `<polyline points="${pointsStr}" fill="none" stroke="${polyline.color}" stroke-width="${theme.stroke.width.thick}"${dash}/>`
		}
	}

	return polylinesSvg
}
