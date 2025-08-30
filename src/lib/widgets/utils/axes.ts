import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	AXIS_STROKE_WIDTH_PX,
	AXIS_TITLE_FONT_PX,
	AXIS_TITLE_PADDING_PX,
	X_AXIS_TITLE_PADDING_PX,
	GRID_STROKE_WIDTH_PX,
	LABEL_AVG_CHAR_WIDTH_PX,
	TICK_LABEL_FONT_PX,
	TICK_LABEL_PADDING_PX,
	TICK_LENGTH_PX
} from "@/lib/widgets/utils/constants"
import {
	includePointX,
	includeText,
	calculateTextAwareLabelSelection,
	calculateIntersectionAwareTicks,
	type Extents
} from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { renderWrappedText } from "@/lib/widgets/utils/text"

export const ErrInvalidAxisDomain = errors.new("axis domain min must be less than max")
export const ErrInvalidTickInterval = errors.new("axis tick interval must be positive")
export const ErrInvalidCategories = errors.new("axis categories must not be empty when provided")

type AxisDomain = { min: number; max: number }
const MAX_TICKS = 1000

// New: required X-scale type (no default)
export type XScaleType = "numeric" | "categoryBand" | "categoryPoint"

// Base properties shared by both axes
type AxisSpecBase = {
	label: string
	showGridLines: boolean
	showTickLabels: boolean
	showTicks?: boolean
}

// --- X-Axis Specification as a Discriminated Union ---
type NumericXAxisSpec = AxisSpecBase & {
	placement: "bottom"
	xScaleType: "numeric"
	domain: { min: number; max: number } // Required for numeric
	tickInterval: number // Required for numeric
	labelFormatter?: (value: number) => string
	categories?: never // Disallow categories
}

type CategoryXAxisSpec = AxisSpecBase & {
	placement: "bottom"
	xScaleType: "categoryBand" | "categoryPoint"
	categories: string[] // Required for category
	domain?: never // Disallow numeric properties
	tickInterval?: never // Disallow numeric properties
}

export type AxisSpecX = NumericXAxisSpec | CategoryXAxisSpec

// --- Y-Axis Specification: Unchanged ---
export type AxisSpecY = AxisSpecBase & {
	placement: "left" | "right"
	domain: { min: number; max: number }
	tickInterval: number
	labelFormatter?: (value: number) => string
}

// Legacy AxisSpec for backward compatibility with Y-axis functions
export type AxisSpec = {
	domain: AxisDomain
	tickInterval: number
	label: string
	showGridLines: boolean
	showTickLabels: boolean
	showTicks?: boolean
	placement: "left" | "right" | "bottom" | "internalZero"
	categories?: string[]
	labelFormatter?: (value: number) => string
}

export type AxisResult = {
	pads: { left: number; right: number; top: number; bottom: number }
	markup: string
	registerExtents(ext: Extents): void
	toSvg: (val: number) => number
	bandWidth?: number
}

function clampTickCount(range: number, interval: number): number {
	if (!(range > 0) || !(interval > 0)) return 0
	const possible = Math.floor(range / interval) + 1
	return Math.min(MAX_TICKS, possible)
}

export function computeAndRenderYAxis(
	spec: AxisSpec,
	chartArea: { top: number; left: number; width: number; height: number },
	xAxisSpec: AxisSpec
): AxisResult {
	const tickLength = spec.showTicks === false ? 0 : TICK_LENGTH_PX
	const isCategorical = !!(spec.categories && spec.categories.length > 0)
	if (!isCategorical) {
		if (spec.domain.min >= spec.domain.max) {
			logger.error("invalid y-axis domain", { domain: spec.domain })
			throw errors.wrap(ErrInvalidAxisDomain, `y-axis min ${spec.domain.min} must be less than max ${spec.domain.max}`)
		}
		if (spec.tickInterval <= 0) {
			logger.error("invalid y-axis tick interval", { tickInterval: spec.tickInterval })
			throw errors.wrap(ErrInvalidTickInterval, "y-axis tickInterval must be positive")
		}
	} else {
		if (!spec.categories || spec.categories.length === 0) {
			logger.error("invalid y-axis categories", { categories: spec.categories })
			throw errors.wrap(ErrInvalidCategories, "y-axis categories array cannot be empty")
		}
	}

	const pads = { left: tickLength + (spec.showTickLabels ? (TICK_LABEL_PADDING_PX + TICK_LABEL_FONT_PX) : 0) + AXIS_TITLE_PADDING_PX + AXIS_TITLE_FONT_PX, right: 0, top: 0, bottom: 0 }
	const axisX = chartArea.left

	const yRange = spec.domain.max - spec.domain.min
	function toSvgYNumeric(val: number): number {
		const frac = (val - spec.domain.min) / yRange
		return chartArea.top + chartArea.height - frac * chartArea.height
	}

	let bandWidth: number | undefined = undefined
	let toSvgYCategorical: ((idx: number) => number) | undefined = undefined
	if (isCategorical) {
		bandWidth = chartArea.height / (spec.categories as string[]).length
		toSvgYCategorical = (idx: number) => chartArea.top + (idx + 0.5) * (bandWidth as number)
	}

	let markup = ""
	markup += `<line x1="${axisX}" y1="${chartArea.top}" x2="${axisX}" y2="${chartArea.top + chartArea.height}" stroke="${theme.colors.axis}" stroke-width="${AXIS_STROKE_WIDTH_PX}"/>`

	const yTickPositions: number[] = []
	const yTickLabels: string[] = []
	if (isCategorical) {
		const cats = spec.categories as string[]
		for (let i = 0; i < cats.length; i++) {
			const y = toSvgYCategorical!(i)
			markup += `<line x1="${axisX - tickLength}" y1="${y}" x2="${axisX}" y2="${y}" stroke="${theme.colors.axis}" stroke-width="${AXIS_STROKE_WIDTH_PX}"/>`
			if (spec.showTickLabels) {
				const label = cats[i] as string
				markup += `<text class="tick-label" x="${axisX - TICK_LABEL_PADDING_PX}" y="${y + 4}" text-anchor="end" font-size="${TICK_LABEL_FONT_PX}px">${label}</text>`
				yTickPositions.push(y)
				yTickLabels.push(label)
			}
		}
	} else {
		const tickValues: number[] = []
		const count = clampTickCount(yRange, spec.tickInterval)
		for (let i = 0; i < count; i++) {
			tickValues.push(spec.domain.min + i * spec.tickInterval)
		}
		const selected = calculateIntersectionAwareTicks(tickValues, false)

		tickValues.forEach((t, i) => {
			const y = toSvgYNumeric(t)
			// Draw the tick mark (length may be 0 if disabled)
			markup += `<line x1="${axisX - tickLength}" y1="${y}" x2="${axisX}" y2="${y}" stroke="${theme.colors.axis}" stroke-width="${AXIS_STROKE_WIDTH_PX}"/>`
			
			if (spec.showTickLabels && selected.has(i)) {
				let label: string
				if (spec.labelFormatter) {
					label = spec.labelFormatter(t)
				} else {
					label = String(t)
				}
				markup += `<text class="tick-label" x="${axisX - TICK_LABEL_PADDING_PX}" y="${y + 4}" text-anchor="end" font-size="${TICK_LABEL_FONT_PX}px">${label}</text>`
				yTickPositions.push(y)
				yTickLabels.push(label)
			}

			// Always render horizontal gridlines for all ticks when enabled
			if (spec.showGridLines) {
				markup += `<line x1="${chartArea.left}" y1="${y}" x2="${chartArea.left + chartArea.width}" y2="${y}" stroke="${theme.colors.gridMajor}" stroke-width="${GRID_STROKE_WIDTH_PX}"/>`
			}
		})
	}

	// Compute required top padding from top-most tick label baseline to avoid clipping
	if (spec.showTickLabels && yTickPositions.length > 0) {
		const BASELINE_OFFSET_PX = 4
		const topMostBaselineY = Math.min(...yTickPositions) + BASELINE_OFFSET_PX
		const approximateAscentPx = Math.ceil(TICK_LABEL_FONT_PX * 0.8)
		const overflowAboveTop = Math.max(0, (chartArea.top + approximateAscentPx) - topMostBaselineY)
		if (overflowAboveTop > 0) {
			pads.top = Math.max(pads.top, overflowAboveTop)
		}
	}

	// Y-axis title (rotated)
	const yAxisLabelX = axisX - (tickLength + TICK_LABEL_PADDING_PX + TICK_LABEL_FONT_PX + AXIS_TITLE_PADDING_PX + AXIS_TITLE_FONT_PX / 2)
	const yAxisLabelY = chartArea.top + chartArea.height / 2
	const title = renderWrappedText(spec.label, yAxisLabelX, yAxisLabelY, "axis-label")
	const rotatedTitle = title.replace("<text ", `<text transform="rotate(-90, ${yAxisLabelX}, ${yAxisLabelY})" `)
	markup += rotatedTitle

	const registerExtents = (ext: Extents) => {
		includePointX(ext, axisX - TICK_LENGTH_PX)
		includePointX(ext, axisX)
		for (let i = 0; i < yTickPositions.length; i++) {
			includeText(ext, axisX - TICK_LABEL_PADDING_PX, yTickLabels[i] as string, "end", LABEL_AVG_CHAR_WIDTH_PX)
		}
		includeText(ext, yAxisLabelX, spec.label, "middle", LABEL_AVG_CHAR_WIDTH_PX)
	}

	return { pads, markup, registerExtents, toSvg: (val: number) => (isCategorical ? toSvgYCategorical!(val) : toSvgYNumeric(val)), bandWidth }
}

export function computeAndRenderXAxis(
	spec: AxisSpecX, // Use the new discriminated union type
	chartArea: { top: number; left: number; width: number; height: number }
): AxisResult {
	const tickLength = spec.showTicks === false ? 0 : TICK_LENGTH_PX
	// The `xScaleType` is guaranteed to exist by the type system.
	// Validation is now primarily handled by the discriminated union
	switch (spec.xScaleType) {
		case "numeric":
			// `spec.domain` and `spec.tickInterval` are now guaranteed to be present.
			if (spec.domain.min >= spec.domain.max) {
				logger.error("invalid x-axis domain for numeric scale", { domain: spec.domain })
				throw errors.wrap(ErrInvalidAxisDomain, `x-axis min ${spec.domain.min} must be less than max ${spec.domain.max}`)
			}
			if (spec.tickInterval <= 0) {
				logger.error("invalid x-axis tick interval for numeric scale", { tickInterval: spec.tickInterval })
				throw errors.wrap(ErrInvalidTickInterval, "x-axis tickInterval must be positive")
			}
			break
		case "categoryBand":
		case "categoryPoint":
			// `spec.categories` is now guaranteed to be present.
			if (spec.categories.length === 0) {
				logger.error("invalid x-axis categories", { categories: spec.categories, xScaleType: spec.xScaleType })
				throw errors.wrap(ErrInvalidCategories, `${spec.xScaleType} requires non-empty categories`)
			}
			break
	}

	let markup = ""
	const pads = { left: 0, right: 0, top: 0, bottom: TICK_LENGTH_PX + TICK_LABEL_PADDING_PX + TICK_LABEL_FONT_PX + X_AXIS_TITLE_PADDING_PX + AXIS_TITLE_FONT_PX }
	const axisY = chartArea.top + chartArea.height

	markup += `<line x1="${chartArea.left}" y1="${axisY}" x2="${chartArea.left + chartArea.width}" y2="${axisY}" stroke="${theme.colors.axis}" stroke-width="${AXIS_STROKE_WIDTH_PX}"/>`

	let toSvgX: (val: number) => number
	let bandWidth: number | undefined = undefined

	switch (spec.xScaleType) {
		case "numeric": {
			const xRange = spec.domain.max - spec.domain.min
			toSvgX = (val: number) => {
				const frac = (val - spec.domain.min) / xRange
				return chartArea.left + frac * chartArea.width
			}
			break
		}
		case "categoryBand": {
			const N = spec.categories.length
			bandWidth = chartArea.width / N
			toSvgX = (i: number) => chartArea.left + (i + 0.5) * bandWidth!
			break
		}
		case "categoryPoint": {
			const N = spec.categories.length
			const step = (N <= 1) ? 0 : chartArea.width / (N - 1)
			toSvgX = (i: number) => {
				if (N === 1) {
					// Single point is centered in the chart area
					return chartArea.left + chartArea.width / 2
				}
				return chartArea.left + i * step
			}
			break
		}
	}

	const tickPositions: number[] = []
	const tickLabels: string[] = []

	switch (spec.xScaleType) {
		case "categoryBand":
		case "categoryPoint": {
			for (let i = 0; i < spec.categories.length; i++) {
				const x = toSvgX(i)
				tickPositions.push(x)
				tickLabels.push(spec.categories[i] as string)
			}
			const selected = calculateTextAwareLabelSelection(tickLabels, tickPositions, chartArea.width, LABEL_AVG_CHAR_WIDTH_PX)
			for (let i = 0; i < tickPositions.length; i++) {
				const x = tickPositions[i] as number
				markup += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + tickLength}" stroke="${theme.colors.axis}" stroke-width="${AXIS_STROKE_WIDTH_PX}"/>`
				if (spec.showTickLabels && selected.has(i)) {
					const label = tickLabels[i] as string
					markup += `<text class="tick-label" x="${x}" y="${axisY + tickLength + TICK_LABEL_PADDING_PX}" text-anchor="middle" dominant-baseline="hanging" font-size="${TICK_LABEL_FONT_PX}px">${label}</text>`
				}
			}
			break
		}
		case "numeric": {
			const ticks: number[] = []
			for (let t = spec.domain.min; t <= spec.domain.max; t += spec.tickInterval) {
				ticks.push(t)
			}
			const selected = calculateIntersectionAwareTicks(ticks, true)
			for (let i = 0; i < ticks.length; i++) {
				const t = ticks[i] as number
				const x = toSvgX(t)
				// Draw the tick mark (length may be 0 if disabled)
				markup += `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + tickLength}" stroke="${theme.colors.axis}" stroke-width="${AXIS_STROKE_WIDTH_PX}"/>`
				
				if (spec.showTickLabels && selected.has(i)) {
					let label = String(t)
					if (spec.labelFormatter) {
						label = spec.labelFormatter(t)
					}
					markup += `<text class="tick-label" x="${x}" y="${axisY + tickLength + TICK_LABEL_PADDING_PX}" text-anchor="middle" dominant-baseline="hanging" font-size="${TICK_LABEL_FONT_PX}px">${label}</text>`
					// Track positions and labels for extent registration
					tickPositions.push(x)
					tickLabels.push(label)
				}

				// Suppress gridline at 0 only if it would overdraw the main axis, but never the tick/label
				const isZeroOverlappingAxis = (t === 0)
				if (spec.showGridLines && !isZeroOverlappingAxis) {
					markup += `<line x1="${x}" y1="${chartArea.top}" x2="${x}" y2="${chartArea.top + chartArea.height}" stroke="${theme.colors.gridMajor}" stroke-width="${GRID_STROKE_WIDTH_PX}"/>`
				}
			}
			break
		}
	}

	const xAxisLabelY = axisY + TICK_LENGTH_PX + TICK_LABEL_PADDING_PX + TICK_LABEL_FONT_PX + X_AXIS_TITLE_PADDING_PX
	markup += renderWrappedText(spec.label, chartArea.left + chartArea.width / 2, xAxisLabelY, "axis-label")

	const registerExtents = (ext: Extents) => {
		for (let i = 0; i < tickPositions.length; i++) {
			if (spec.showTickLabels) {
				includeText(ext, tickPositions[i] as number, tickLabels[i] as string, "middle", LABEL_AVG_CHAR_WIDTH_PX)
			}
		}
		includeText(ext, chartArea.left + chartArea.width / 2, spec.label, "middle", LABEL_AVG_CHAR_WIDTH_PX)
	}

	return { pads, markup, registerExtents, toSvg: toSvgX, bandWidth }
}


