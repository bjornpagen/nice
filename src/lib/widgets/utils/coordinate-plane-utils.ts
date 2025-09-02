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
	CHART_TITLE_TOP_PADDING_PX,
	TICK_LENGTH_PX,
	TICK_LABEL_PADDING_PX,
	AXIS_TITLE_PADDING_PX,
	AXIS_TITLE_FONT_PX,
	LABEL_AVG_CHAR_WIDTH_PX
} from "@/lib/widgets/utils/constants"
import { type Canvas } from "@/lib/widgets/utils/layout"
import { estimateWrappedTextDimensions } from "@/lib/widgets/utils/text"
import { theme } from "@/lib/widgets/utils/theme"
import { buildTicks } from "./ticks"

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

	const outsideBottomPx = 60 // Fixed estimate for X-axis (ticks + labels + title)
	const outsideTopPx = (hasTitle ? titleHeight : 0) + 20 // Title + some buffer

	// --- START: DEFINITIVE FIX FOR Y-AXIS LAYOUT ---
	// 1. Estimate the dimensions of all Y-axis components.
	const { labels: yTickLabels } = buildTicks(data.yAxis.min, data.yAxis.max, data.yAxis.tickInterval)
	const maxTickLabelWidth = Math.max(...yTickLabels.map(l => l.length * LABEL_AVG_CHAR_WIDTH_PX), 0)

	// Tentative chart height for accurate wrapping estimation
	const tentativeChartHeight = data.height - outsideTopPx - outsideBottomPx

	const { height: wrappedTitleHeight } = estimateWrappedTextDimensions(
		data.yAxis.label,
		tentativeChartHeight, // Use tentative height for consistent wrapping
		AXIS_TITLE_FONT_PX
	)

	// 2. Calculate the position for the Y-axis title. Its X is half its rotated width.
	// This leaves space for the entire label.
	const yAxisLabelX = wrappedTitleHeight / 2

	// 3. Calculate the total left margin needed to fit the title, padding, and axis hardware.
	const leftOutsidePx =
		wrappedTitleHeight +        // The full "width" of the rotated title
		AXIS_TITLE_PADDING_PX +
		TICK_LABEL_PADDING_PX +
		TICK_LENGTH_PX +
		maxTickLabelWidth

	// --- END: DEFINITIVE FIX ---

	// Final chart area places the axis area inside the total SVG canvas
	const chartArea = {
		top: outsideTopPx,
		left: leftOutsidePx,
		width: data.width - leftOutsidePx - 80, // Adjust width based on dynamic margin
		height: data.height - outsideTopPx - outsideBottomPx
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

	// Render axes against the final chartArea, passing the new yAxisLabelX
	const yRes = computeAndRenderYAxis(yAxisLegacySpec, chartArea, xAxisLegacySpec, canvas, yAxisLabelX)
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
