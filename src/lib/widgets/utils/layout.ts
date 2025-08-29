import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { estimateWrappedTextDimensions } from "@/lib/widgets/utils/text"

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

export interface AxisPlacementOptions {
	axisPlacement: "leftEdge" | "internalZero";
	titlePadding?: number;
	tickLength?: number;
	labelPadding?: number;
	axisTitleFontPx?: number;
}

export function calculateYAxisLayoutAxisAware(
  yAxis: { max: number; min: number; tickInterval: number; label: string },
  xAxis: { min: number; max: number },
  svgWidth: number,
  chartHeightPx: number,
  pads: { top: number; right: number; bottom: number },
  opts: AxisPlacementOptions
): { leftMargin: number; yAxisLabelX: number; anchorX: number } {
	const T = opts.tickLength ?? 5;
	const LP = opts.labelPadding ?? 8;
	const TP = opts.titlePadding ?? 12;
	const TITLE_PX = opts.axisTitleFontPx ?? 16;

	const { height: wrappedTitleHeight } = estimateWrappedTextDimensions(yAxis.label, chartHeightPx, TITLE_PX, 1.1, 8);

	let maxTickLabelWidth = 0;
	if (yAxis.tickInterval > 0) {
		for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
			const s = String(t);
			maxTickLabelWidth = Math.max(maxTickLabelWidth, s.length * 7); // Heuristic
		}
	}

	const spaceLeftOfAnchor = T + LP + maxTickLabelWidth + TP + wrappedTitleHeight / 2;

	const xRange = xAxis.max - xAxis.min;
	const f =
		opts.axisPlacement === "internalZero" && xRange > 0
			? (0 - xAxis.min) / xRange
			: 0;

	let leftMargin: number;
	if (f >= 1) {
		leftMargin = Math.ceil(spaceLeftOfAnchor);
	} else {
		const denom = 1 - f;
		leftMargin = Math.ceil((spaceLeftOfAnchor - f * (svgWidth - pads.right)) / denom);
	}

	if (!isFinite(leftMargin) || leftMargin < 0) {
		leftMargin = Math.ceil(spaceLeftOfAnchor);
	}

	const chartWidth = svgWidth - leftMargin - pads.right;
	const anchorX = leftMargin + f * chartWidth;
	const yAxisLabelX = anchorX - (T + LP + maxTickLabelWidth + TP + wrappedTitleHeight / 2);

	return { leftMargin, yAxisLabelX, anchorX };
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
 * NEW: Calculates the required left margin for a horizontal bar chart's categorical Y-axis.
 * It measures the actual category labels to ensure the margin is always sufficient.
 *
 * @param yAxisLabels - An array of the string labels for the Y-axis categories.
 * @param labelPadding - Optional spacing between the axis line and the labels (default: 10px).
 * @returns An object containing the calculated `leftMargin`.
 */
export function calculateHorizontalBarChartYAxisLayout(
	yAxisLabels: string[],
	labelPadding = 10
): { leftMargin: number } {
	const AVG_CHAR_WIDTH_PX = 8; // Consistent average character width for estimation.
	
	// 1. Find the maximum width required for any of the category labels.
	const maxTickLabelWidth = yAxisLabels.reduce((maxWidth, label) => {
		const estimatedWidth = label.length * AVG_CHAR_WIDTH_PX;
		return Math.max(maxWidth, estimatedWidth);
	}, 0);

	// 2. The left margin is the sum of the space for the longest label and its padding.
	const leftMargin = maxTickLabelWidth + labelPadding;

	return { leftMargin };
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
export function createChartClipPath(clipId: string, x: number, y: number, width: number, height: number): string {
	return `<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs>`
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

/**
 * Estimates how many lines a title will wrap to based on available width.
 * Accounts for the wrapping logic in renderWrappedText.
 */
function estimateTitleLines(title: string, maxWidthPx: number, avgCharWidthPx = 8): number {
	// Handle parenthetical splitting (from renderWrappedText logic)
	const titlePattern = /^(.*)\s+(\(.+\))$/
	const match = title.match(titlePattern)
	if (match?.[1] && match[2] && title.length > 36) {
		return 2 // Will be split into main title + parenthetical
	}

	// Estimate width and determine if wrapping is needed
	const estimatedWidth = title.length * avgCharWidthPx
	if (maxWidthPx && estimatedWidth > maxWidthPx) {
		const words = title.split(/\s+/).filter(Boolean)
		if (words.length > 1) {
			// renderWrappedText splits into 2 balanced lines
			return 2
		}
		// Single very long word - may overflow but renderWrappedText keeps as 1 line
		return 1
	}

	return 1 // Single line
}

/**
 * Calculates dynamic title positioning with proper spacing that adapts to title length.
 * Provides bulletproof title placement that prevents clipping regardless of title length.
 * @param title - The title text to measure
 * @param maxTitleWidth - Available width for the title (typically width - 60px)
 * @param customTopMargin - Override for special cases (optional)
 * @returns Object with titleY position, topMargin, and estimated title height
 */
export function calculateTitleLayout(
	title?: string,
	maxTitleWidth?: number,
	customTopMargin?: number
): {
	titleY: number
	topMargin: number
	estimatedTitleHeight: number
} {
	// If no title provided, use conservative defaults
	if (!title) {
		const topMargin = customTopMargin || 65
		return { titleY: 15, topMargin, estimatedTitleHeight: 16 }
	}

	const fontSize = 16 // Title font size in pixels
	const lineHeight = 1.1 // Line height multiplier from renderWrappedText
	const titleBufferTop = 15 // Space above title for proper rendering
	const titleBufferBottom = 15 // Minimum space between title and chart

	// Estimate how many lines the title will actually wrap to
	const estimatedLines = maxTitleWidth ? estimateTitleLines(title, maxTitleWidth) : 1

	// Calculate actual title height including line spacing
	const estimatedTitleHeight = fontSize * estimatedLines * lineHeight

	// Calculate required top margin: buffer + title height + buffer
	const calculatedTopMargin = titleBufferTop + estimatedTitleHeight + titleBufferBottom

	// Use custom margin if provided, otherwise ensure minimum spacing
	const topMargin = customTopMargin || Math.max(65, Math.ceil(calculatedTopMargin))

	return {
		titleY: titleBufferTop,
		topMargin,
		estimatedTitleHeight
	}
}

/**
 * Calculates layout for a dedicated line legend area positioned outside the chart.
 * Prevents label conflicts with curves, points, and axis elements.
 * @param lineCount - Number of line labels to accommodate
 * @param chartRight - Right edge of chart area (pad.left + chartWidth)
 * @param chartTop - Top edge of chart area (pad.top)
 * @param legendSpacing - Vertical spacing between legend items (default: 18px)
 * @returns Object with legend positioning and required right margin
 */
export function calculateLineLegendLayout(
	_lineCount: number,
	chartRight: number,
	chartTop: number,
	legendSpacing = 18
): {
	legendAreaX: number
	legendStartY: number
	legendSpacing: number
	requiredRightMargin: number
} {
	const legendPadding = 15 // Space between chart and legend
	const maxLabelWidth = 80 // Estimated max width for line labels
	const legendAreaX = chartRight + legendPadding
	const legendStartY = chartTop + 10 // Small offset from chart top
	const requiredRightMargin = legendPadding + maxLabelWidth + 10 // Extra buffer

	return {
		legendAreaX,
		legendStartY,
		legendSpacing,
		requiredRightMargin
	}
}

/**
 * Intelligent label selection based on actual text width rather than hardcoded spacing.
 * Provides uniform visual spacing and prevents cramped or overlapping labels.
 * @param labels - Array of label strings to potentially display
 * @param positions - Array of x-positions (in pixels) where labels would be placed
 * @param chartWidthPx - Available chart width for label placement
 * @param avgCharWidthPx - Average character width for text estimation (default: 8px)
 * @param paddingPx - Minimum padding between labels (default: 10px)
 * @returns Set of indices indicating which labels to display
 */
export function calculateTextAwareLabelSelection(
	labels: string[],
	positions: number[],
	chartWidthPx: number,
	avgCharWidthPx = 8,
	paddingPx = 10
): Set<number> {
	if (labels.length === 0 || positions.length === 0) {
		return new Set<number>()
	}

	if (labels.length !== positions.length) {
		logger.error("label and position arrays must have same length", {
			labelsLength: labels.length,
			positionsLength: positions.length
		})
		throw errors.new("label and position arrays must have same length")
	}

	// Calculate estimated width for each label
	const labelWidths = labels.map((label) => label.length * avgCharWidthPx)

	// Find indices that have actual content (non-empty labels)
	const nonEmptyIndices = labels
		.map((label, i) => ({ index: i, hasContent: label.trim() !== "" }))
		.filter((item) => item.hasContent)
		.map((item) => item.index)

	if (nonEmptyIndices.length === 0) {
		return new Set<number>()
	}

	// Check if all labels can fit without overlap
	let allLabelsCanFit = true
	for (let i = 1; i < nonEmptyIndices.length; i++) {
		const currentIdx = nonEmptyIndices[i]
		const prevIdx = nonEmptyIndices[i - 1]

		if (currentIdx === undefined || prevIdx === undefined) continue

		const currentPos = positions[currentIdx]
		const prevPos = positions[prevIdx]
		const currentWidth = labelWidths[currentIdx]
		const prevWidth = labelWidths[prevIdx]

		if (currentPos === undefined || prevPos === undefined || currentWidth === undefined || prevWidth === undefined)
			continue

		// Calculate minimum spacing needed between these two labels
		const prevRightEdge = prevPos + prevWidth / 2
		const currentLeftEdge = currentPos - currentWidth / 2
		const actualSpacing = currentLeftEdge - prevRightEdge

		if (actualSpacing < paddingPx) {
			allLabelsCanFit = false
			break
		}
	}

	if (allLabelsCanFit) {
		// All labels fit with adequate spacing
		return new Set(nonEmptyIndices)
	}

	// Labels would clash - use uniform intermittent pattern
	// Calculate how many labels can reasonably fit
	const maxLabelWidth = Math.max(...labelWidths)
	const approximateLabelsPerChart = Math.floor(chartWidthPx / (maxLabelWidth + paddingPx))
	const targetCount = Math.max(1, Math.min(approximateLabelsPerChart, nonEmptyIndices.length))

	// Select uniform spacing from available labels
	const step = Math.max(1, Math.ceil(nonEmptyIndices.length / targetCount))
	const uniformIndices = nonEmptyIndices.filter((_, i) => i % step === 0)

	return new Set(uniformIndices)
}

/**
 * Determines which tick values should have labels to avoid intersection collisions.
 * Systematically skips the first negative value on both axes to create a label-free
 * zone around the coordinate plane intersection.
 * @param tickValues - Array of tick values for this axis
 * @param isXAxis - Whether this is the x-axis (affects collision logic)
 * @returns Set of indices indicating which ticks should have labels
 */
export function includeRotatedYAxisLabel(
	_ext: Extents,
	_pivotX: number,
	_text: string,
	_chartHeightPx: number,
	_fontPx = 16,
	_lineHeight = 1.1
): void {
	// This is a deliberate no-op for horizontal extents.
	// The horizontal space required for the rotated Y-axis title (including its padding,
	// tick labels, etc.) is already calculated and reserved by `calculateYAxisLayoutAxisAware`.
	// Calling `includeText` would incorrectly expand the viewBox further to the left.
}

export function calculateIntersectionAwareTicks(tickValues: number[], _isXAxis: boolean): Set<number> {
	const labeledIndices = new Set<number>()

	// Find the first negative value (closest to intersection)
	let hasSkippedFirstNegative = false
	for (let i = 0; i < tickValues.length; i++) {
		const value = tickValues[i]
		if (value === undefined) continue

		// ALWAYS include 0 tick - never skip the origin
		if (value === 0) {
			labeledIndices.add(i)
			continue
		}

		// Skip first negative to avoid intersection collision
		if (value < 0 && !hasSkippedFirstNegative) {
			hasSkippedFirstNegative = true
			continue // Skip this one
		}

		// Label all other values
		labeledIndices.add(i)
	}

	return labeledIndices
}
