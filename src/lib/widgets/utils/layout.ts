export type Extents = { minX: number; maxX: number }

export function initExtents(initialWidth: number): Extents {
	return { minX: 0, maxX: initialWidth }
}

export function approxTextWidth(text: string, avgCharWidthPx = 7): number {
	return Math.max(0, text.length * avgCharWidthPx)
}

export function includeText(
	ext: Extents,
	absoluteX: number,
	text: string,
	anchor: "start" | "middle" | "end",
	avgCharWidthPx = 7
): void {
	const w = approxTextWidth(text, avgCharWidthPx)
	if (anchor === "start") {
		ext.maxX = Math.max(ext.maxX, absoluteX + w)
		ext.minX = Math.min(ext.minX, absoluteX)
	} else if (anchor === "end") {
		ext.maxX = Math.max(ext.maxX, absoluteX)
		ext.minX = Math.min(ext.minX, absoluteX - w)
	} else {
		// middle
		ext.maxX = Math.max(ext.maxX, absoluteX + w / 2)
		ext.minX = Math.min(ext.minX, absoluteX - w / 2)
	}
}

export function includePointX(ext: Extents, absoluteX: number): void {
	ext.maxX = Math.max(ext.maxX, absoluteX)
	ext.minX = Math.min(ext.minX, absoluteX)
}

export function computeDynamicWidth(
	ext: Extents,
	_height: number,
	pad = 10
): { vbMinX: number; vbMaxX: number; dynamicWidth: number } {
	const vbMinX = Math.min(0, Math.floor(ext.minX - pad))
	const vbMaxX = Math.max(0, Math.ceil(ext.maxX + pad))
	const dynamicWidth = Math.max(1, vbMaxX - vbMinX)
	return { vbMinX, vbMaxX, dynamicWidth }
}

/**
 * Calculates the required left margin and Y-axis title position for a chart.
 * @param yAxis - The Y-axis configuration object.
 * @param yAxis.max - The maximum value on the axis.
 * @param yAxis.min - The minimum value on the axis.
 * @param yAxis.tickInterval - The interval between ticks.
 * @param yAxis.label - The text label for the axis.
 * @param titlePadding - Optional spacing between tick labels and title (default: 20px)
 * @returns An object containing the calculated `leftMargin` and `yAxisLabelX` position.
 */
export function calculateYAxisLayout(
	yAxis: {
		max: number
		min: number
		tickInterval: number
		label: string
	},
	titlePadding = 20
): { leftMargin: number; yAxisLabelX: number } {
	const AVG_CHAR_WIDTH_PX = 8 // Estimated width for an average character
	const TICK_LENGTH = 5
	const LABEL_PADDING = 10 // Space between ticks and labels
	const AXIS_TITLE_HEIGHT = 16 // Font size of the title

	let maxLabelWidth = 0

	// Determine the longest tick label string
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const label = String(t)
		const estimatedWidth = label.length * AVG_CHAR_WIDTH_PX
		if (estimatedWidth > maxLabelWidth) {
			maxLabelWidth = estimatedWidth
		}
	}

	const leftMargin = TICK_LENGTH + LABEL_PADDING + maxLabelWidth + titlePadding + AXIS_TITLE_HEIGHT
	const yAxisLabelX = AXIS_TITLE_HEIGHT / 2 // Position title at the far left of the margin

	return { leftMargin, yAxisLabelX }
}

/**
 * Calculates the required bottom margin and X-axis title position for a chart.
 * @param hasTickLabels - Whether the chart has tick labels on the X-axis
 * @param titlePadding - Optional spacing between tick labels and title (default: 25px)
 * @returns An object containing the calculated `bottomMargin` and `xAxisTitleY` position.
 */
export function calculateXAxisLayout(
	hasTickLabels = true,
	titlePadding = 25
): { bottomMargin: number; xAxisTitleY: number } {
	const TICK_LENGTH = 5
	const TICK_LABEL_HEIGHT = 16 // Height of tick label text
	const TITLE_HEIGHT = 16 // Height of axis title text

	if (hasTickLabels) {
		const bottomMargin = TICK_LENGTH + TICK_LABEL_HEIGHT + titlePadding + TITLE_HEIGHT
		const xAxisTitleY = TICK_LENGTH + TICK_LABEL_HEIGHT + titlePadding
		return { bottomMargin, xAxisTitleY }
	}

	// No tick labels case
	const bottomMargin = TICK_LENGTH + titlePadding + TITLE_HEIGHT
	const xAxisTitleY = TICK_LENGTH + titlePadding / 2
	return { bottomMargin, xAxisTitleY }
}

/**
 * Calculates the required right margin and right Y-axis title position for a chart.
 * @param yAxisRight - The right Y-axis configuration object (null if no right axis).
 * @param titlePadding - Optional spacing between tick labels and title (default: 20px)
 * @returns An object containing the calculated `rightMargin` and `rightYAxisLabelX` position.
 */
export function calculateRightYAxisLayout(
	yAxisRight: {
		max: number
		min: number
		tickInterval: number
		label: string
	} | null,
	titlePadding = 20
): { rightMargin: number; rightYAxisLabelX: number } {
	if (!yAxisRight) {
		return { rightMargin: 20, rightYAxisLabelX: 0 } // Default right margin when no right axis
	}

	const AVG_CHAR_WIDTH_PX = 8 // Estimated width for an average character
	const TICK_LENGTH = 5
	const LABEL_PADDING = 10 // Space between ticks and labels
	const AXIS_TITLE_HEIGHT = 16 // Font size of the title

	let maxLabelWidth = 0

	// Determine the longest tick label string
	for (let t = yAxisRight.min; t <= yAxisRight.max; t += yAxisRight.tickInterval) {
		const label = String(t)
		const estimatedWidth = label.length * AVG_CHAR_WIDTH_PX
		if (estimatedWidth > maxLabelWidth) {
			maxLabelWidth = estimatedWidth
		}
	}

	const rightMargin = TICK_LENGTH + LABEL_PADDING + maxLabelWidth + titlePadding + AXIS_TITLE_HEIGHT
	const rightYAxisLabelX = TICK_LENGTH + LABEL_PADDING + maxLabelWidth + titlePadding + AXIS_TITLE_HEIGHT / 2

	return { rightMargin, rightYAxisLabelX }
}

/**
 * Generates SVG clipPath definition for constraining chart elements to the plot area.
 * This prevents lines, curves, and other chart elements from extending beyond the chart boundaries.
 * @param clipId - Unique identifier for the clipPath element
 * @param x - Left edge of the clipping rectangle (typically pad.left)
 * @param y - Top edge of the clipping rectangle (typically pad.top) 
 * @param width - Width of the clipping rectangle (typically chartWidth)
 * @param height - Height of the clipping rectangle (typically chartHeight)
 * @returns SVG clipPath definition string
 */
export function createChartClipPath(
	clipId: string,
	x: number,
	y: number,
	width: number,
	height: number
): string {
	return `<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs>`
}

/**
 * Wraps chart elements (lines, curves, paths) in an SVG group with clipping applied.
 * This ensures mathematical curves are cleanly cut off at chart boundaries rather than 
 * artificially clamped, preserving the true shape of the function.
 * @param clipId - The clipPath ID to reference
 * @param content - SVG content to be clipped
 * @returns SVG group with clip-path applied
 */
export function wrapInClippedGroup(clipId: string, content: string): string {
	return `<g clip-path="url(#${clipId})">${content}</g>`
}
