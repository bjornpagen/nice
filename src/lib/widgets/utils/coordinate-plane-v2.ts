import { PADDING, TICK_LABEL_FONT_PX } from "@/lib/widgets/utils/constants"
import type { Canvas } from "@/lib/widgets/utils/layout"
import { calculateIntersectionAwareTicks } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { abbreviateMonth } from "./labels"
import { buildTicks, formatTickInt } from "./ticks"

// Re-export types that are needed for the render functions
export type AxisOptions = {
	label: string
	min: number
	max: number
	tickInterval: number
	showGridLines: boolean
}

function formatPiLabel(value: number): string {
	// Placeholder for pi-formatting logic if needed in the future.
	return String(value)
}

/**
 * Sets up a 4-quadrant Cartesian coordinate plane with centered axes using the Canvas API.
 */
export function setupCoordinatePlaneV2(
	data: {
		width: number
		height: number
		xAxis: AxisOptions
		yAxis: AxisOptions
		showQuadrantLabels: boolean
	},
	canvas: Canvas
): {
	toSvgX: (val: number) => number
	toSvgY: (val: number) => number
	chartArea: { top: number; left: number; width: number; height: number }
} {
	const { width, height, xAxis, yAxis, showQuadrantLabels } = data

	// Define margins to create space for labels and ticks
	const margin = { top: PADDING, right: PADDING, bottom: 40, left: 40 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	const scaleX = chartWidth / (xAxis.max - xAxis.min)
	const scaleY = chartHeight / (yAxis.max - yAxis.min)

	const toSvgX = (val: number) => margin.left + (val - xAxis.min) * scaleX
	const toSvgY = (val: number) => height - margin.bottom - (val - yAxis.min) * scaleY

	const zeroX = toSvgX(0)
	const zeroY = toSvgY(0)

	const chartArea = {
		left: margin.left,
		top: margin.top,
		width: chartWidth,
		height: chartHeight
	}

	// Add a clipping path definition that other elements can reference.
	canvas.addDef(
		`<clipPath id="${canvas.clipId}"><rect x="${chartArea.left}" y="${chartArea.top}" width="${chartArea.width}" height="${chartArea.height}"/></clipPath>`
	)

	// Grid lines
	if (xAxis.showGridLines) {
		const { values, ints } = buildTicks(xAxis.min, xAxis.max, xAxis.tickInterval)
		values.forEach((t, i) => {
			if (ints[i] === 0) return
			const x = toSvgX(t)
			canvas.drawLine(x, margin.top, x, height - margin.bottom, {
				stroke: theme.colors.gridMajor,
				strokeWidth: 1
			})
		})
	}
	if (yAxis.showGridLines) {
		const { values, ints } = buildTicks(yAxis.min, yAxis.max, yAxis.tickInterval)
		values.forEach((t, i) => {
			if (ints[i] === 0) return
			const y = toSvgY(t)
			canvas.drawLine(margin.left, y, width - margin.right, y, {
				stroke: theme.colors.gridMajor,
				strokeWidth: 1
			})
		})
	}

	// Axes lines
	canvas.drawLine(margin.left, zeroY, width - margin.right, zeroY, { stroke: theme.colors.axis, strokeWidth: 1.5 })
	canvas.drawLine(zeroX, margin.top, zeroX, height - margin.bottom, { stroke: theme.colors.axis, strokeWidth: 1.5 })

	// X-axis ticks and labels
	const { values: xValues, ints: xInts, scale: xScale } = buildTicks(xAxis.min, xAxis.max, xAxis.tickInterval)
	const selectedXTicks = calculateIntersectionAwareTicks(xValues, true)
	xValues.forEach((t, i) => {
		const vI = xInts[i]
		if (vI === undefined || vI === 0) return // Skip origin
		const x = toSvgX(t)
		canvas.drawLine(x, zeroY - 4, x, zeroY + 4, { stroke: theme.colors.axis, strokeWidth: 1 })
		if (selectedXTicks.has(i)) {
			const label = formatTickInt(vI, xScale)
			canvas.drawText({
				x: x,
				y: zeroY + 15,
				text: label,
				fill: theme.colors.axisLabel,
				anchor: "middle",
				fontPx: TICK_LABEL_FONT_PX
			})
		}
	})

	// Y-axis ticks and labels
	const { values: yValues, ints: yInts, scale: yScale } = buildTicks(yAxis.min, yAxis.max, yAxis.tickInterval)
	const selectedYTicks = calculateIntersectionAwareTicks(yValues, false)
	yValues.forEach((t, i) => {
		const vI = yInts[i]
		if (vI === undefined || vI === 0) return // Skip origin
		const y = toSvgY(t)
		canvas.drawLine(zeroX - 4, y, zeroX + 4, y, { stroke: theme.colors.axis, strokeWidth: 1 })
		if (selectedYTicks.has(i)) {
			const label = formatTickInt(vI, yScale)
			canvas.drawText({
				x: zeroX - 8,
				y: y + 4,
				text: label,
				fill: theme.colors.axisLabel,
				anchor: "end",
				fontPx: TICK_LABEL_FONT_PX
			})
		}
	})

	// Axis labels
	canvas.drawText({
		x: margin.left + chartWidth / 2,
		y: height - 5,
		text: abbreviateMonth(xAxis.label),
		anchor: "middle",
		fill: theme.colors.axisLabel,
		fontPx: 14
	})
	const yAxisLabelX = 15
	const yAxisLabelY = margin.top + chartHeight / 2
	canvas.drawText({
		x: yAxisLabelX,
		y: yAxisLabelY,
		text: abbreviateMonth(yAxis.label),
		anchor: "middle",
		fill: theme.colors.axisLabel,
		fontPx: 14,
		rotate: { angle: -90, cx: yAxisLabelX, cy: yAxisLabelY }
	})

	// Quadrant labels
	if (showQuadrantLabels) {
		const qLabelStyle = { fill: "#ccc", fontPx: 18, anchor: "middle" as const, dominantBaseline: "middle" as const }
		canvas.drawText({ x: zeroX + chartWidth / 4, y: zeroY - chartHeight / 4, text: "I", ...qLabelStyle })
		canvas.drawText({ x: zeroX - chartWidth / 4, y: zeroY - chartHeight / 4, text: "II", ...qLabelStyle })
		canvas.drawText({ x: zeroX - chartWidth / 4, y: zeroY + chartHeight / 4, text: "III", ...qLabelStyle })
		canvas.drawText({ x: zeroX + chartWidth / 4, y: zeroY + chartHeight / 4, text: "IV", ...qLabelStyle })
	}

	return { toSvgX, toSvgY, chartArea }
}
