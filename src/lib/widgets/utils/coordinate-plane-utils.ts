import {
	type AxisSpec,
	type AxisSpecX,
	type AxisSpecY,
	computeAndRenderXAxis,
	computeAndRenderYAxis
} from "@/lib/widgets/utils/axes"
import {
	AXIS_VIEWBOX_PADDING,
	CHART_TITLE_BOTTOM_PADDING_PX,
	CHART_TITLE_FONT_PX,
	CHART_TITLE_TOP_PADDING_PX
} from "@/lib/widgets/utils/constants"
import type { Canvas } from "@/lib/widgets/utils/layout"
import { estimateWrappedTextDimensions } from "@/lib/widgets/utils/text"
import { theme } from "@/lib/widgets/utils/theme"

// Coordinate plane specific types
export type AxisOptionsFromWidgetX =
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

export type AxisOptionsFromWidgetY = {
	label: string
	min: number
	max: number
	tickInterval: number
	showGridLines: boolean
	showTickLabels: boolean
	showTicks?: boolean
	labelFormatter?: (value: number) => string
}

/**
 * Sets up a coordinate plane with axes, title, and gridlines using Canvas API.
 * This function receives a canvas and draws onto it, returning scaling functions.
 */
export function setupCoordinatePlaneBaseV2(
	data: {
		width: number
		height: number
		title: string | null
		xAxis: AxisOptionsFromWidgetX
		yAxis: AxisOptionsFromWidgetY
	},
	canvas: Canvas
): {
	toSvgX: (val: number) => number
	toSvgY: (val: number) => number
	chartArea: { top: number; left: number; width: number; height: number }
	bandWidth?: number
} {
	const hasTitle = !!data.title
	let titleHeight = 0
	if (hasTitle) {
		const dims = estimateWrappedTextDimensions(
			data.title as string,
			data.width - AXIS_VIEWBOX_PADDING * 2,
			CHART_TITLE_FONT_PX
		)
		titleHeight = CHART_TITLE_TOP_PADDING_PX + dims.height + CHART_TITLE_BOTTOM_PADDING_PX
	}

	// We need to estimate padding without actually rendering
	// For now, use conservative estimates based on constants
	const leftOutsidePx = 80 // Conservative estimate for Y-axis
	const outsideBottomPx = 60 // Conservative estimate for X-axis
	const outsideTopPx = (hasTitle ? titleHeight : 0) + 20 // Title + some buffer

	// Final chart area places the axis area inside the total SVG canvas
	const chartArea = {
		top: outsideTopPx,
		left: leftOutsidePx,
		width: data.width,
		height: data.height
	}

	const yAxisSpec: AxisSpecY = {
		...data.yAxis,
		placement: "left",
		domain: { min: data.yAxis.min, max: data.yAxis.max }
	}
	const xAxisSpec: AxisSpecX =
		data.xAxis.xScaleType === "numeric"
			? {
					...data.xAxis,
					placement: "bottom" as const,
					domain: { min: data.xAxis.min, max: data.xAxis.max }
				}
			: {
					...data.xAxis,
					placement: "bottom" as const
				}

	// Create legacy AxisSpec for Y-axis compatibility
	const yAxisLegacySpec: AxisSpec = { ...yAxisSpec, placement: "left" }
	const xAxisLegacySpec: AxisSpec =
		data.xAxis.xScaleType === "numeric"
			? {
					domain: { min: data.xAxis.min, max: data.xAxis.max },
					tickInterval: data.xAxis.tickInterval,
					label: data.xAxis.label,
					showGridLines: data.xAxis.showGridLines,
					showTickLabels: data.xAxis.showTickLabels,
					showTicks: data.xAxis.showTicks,
					placement: "bottom",
					labelFormatter: data.xAxis.labelFormatter
				}
			: {
					domain: { min: 0, max: data.xAxis.categories.length },
					tickInterval: 1,
					label: data.xAxis.label,
					showGridLines: data.xAxis.showGridLines,
					showTickLabels: data.xAxis.showTickLabels,
					showTicks: data.xAxis.showTicks,
					placement: "bottom",
					categories: data.xAxis.categories
				}

	// Render title (outside, above chart area)
	if (hasTitle) {
		const titleX = leftOutsidePx + data.width / 2
		const titleY = CHART_TITLE_TOP_PADDING_PX
		canvas.drawWrappedText({
			x: titleX,
			y: titleY,
			text: data.title as string,
			maxWidthPx: data.width,
			fontPx: CHART_TITLE_FONT_PX,
			anchor: "middle",
			fill: theme.colors.title
		})
	}

	// Render axes against the final chartArea
	const yRes = computeAndRenderYAxis(yAxisLegacySpec, chartArea, xAxisLegacySpec, canvas)
	const xRes = computeAndRenderXAxis(xAxisSpec, chartArea, canvas)

	// Clip path for geometry (only chart content, not axes/labels)
	canvas.addDef(
		`<clipPath id="${canvas.clipId}"><rect x="${chartArea.left}" y="${chartArea.top}" width="${chartArea.width}" height="${chartArea.height}"/></clipPath>`
	)

	// Scaling functions
	const yRange = data.yAxis.max - data.yAxis.min
	const toSvgX = xRes.toSvg
	function toSvgY(val: number): number {
		const frac = (val - data.yAxis.min) / yRange
		return chartArea.top + chartArea.height - frac * chartArea.height
	}

	const bandWidth = xRes.bandWidth !== undefined ? xRes.bandWidth : yRes.bandWidth

	return { toSvgX, toSvgY, chartArea, bandWidth }
}
