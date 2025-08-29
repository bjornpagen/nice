import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import {
	calculateTextAwareLabelSelection,
	computeDynamicWidth,
	includePointX,
	includeText,
	initExtents,
} from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"

export const ErrInvalidRange = errors.new("min must be less than max")

export const AbsoluteValueNumberLinePropsSchema = z
	.object({
		type: z.literal("absoluteValueNumberLine"),
		width: z
			.number()
			.positive()
			.describe("the total width of the svg in pixels; required to avoid rendering fallbacks"),
		height: z
			.number()
			.positive()
			.describe("the total height of the svg in pixels; required to avoid rendering fallbacks"),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		value: z.number().describe("The number whose absolute value is being illustrated."),
		highlightColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("the css color for the distance highlight and point; explicit to ensure consistent styling"),
		showDistanceLabel: z.boolean().describe("If true, shows a text label indicating the distance from zero.")
	})
	.strict()
	.describe(
		"Generates an SVG number line to visually demonstrate the concept of absolute value as a distance from zero. The diagram renders a number line with a specified range, plots a point at a given value, and highlights the segment from zero to that point. This creates an unambiguous illustration that connects the abstract concept of |x| to the concrete idea of measuring a length from the origin, regardless of direction, making it ideal for introductory problems on the topic."
	)

export type AbsoluteValueNumberLineProps = z.infer<typeof AbsoluteValueNumberLinePropsSchema>

/**
 * Generates an SVG number line to visually demonstrate the concept of absolute value as
 * a distance from zero, perfect for introductory questions on the topic.
 */
export const generateAbsoluteValueNumberLine: WidgetGenerator<typeof AbsoluteValueNumberLinePropsSchema> = (data) => {
	const { width, height, min, max, tickInterval, value, highlightColor, showDistanceLabel } = data
	const absValue = Math.abs(value)
	
	const chartWidth = width - PADDING * 2

	if (min >= max) {
		logger.error("invalid range for absolute value number line", { min, max })
		throw errors.wrap(ErrInvalidRange, `min (${min}) must be less than max (${max})`)
	}

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => PADDING + (val - min) * scale
	const yPos = height - PADDING

	const zeroPos = toSvgX(0)
	const valuePos = toSvgX(value)

	const ext = initExtents(width) // Initialize extents tracking
	let svgBody = ""
	
	// Track the main line endpoints
	includePointX(ext, PADDING)
	includePointX(ext, width - PADDING)
	svgBody += `<line x1="${PADDING}" y1="${yPos}" x2="${width - PADDING}" y2="${yPos}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.base}"/>`

	// Ticks and labels with text-aware selection
	const tickValues: number[] = []
	const tickPositions: number[] = []
	for (let t = min; t <= max; t += tickInterval) {
		tickValues.push(t)
		tickPositions.push(toSvgX(t))
	}
	const tickLabels = tickValues.map(String)
	const selectedLabels = calculateTextAwareLabelSelection(tickLabels, tickPositions, chartWidth, 8, 5)
	
	tickValues.forEach((t, i) => {
		const x = toSvgX(t)
		includePointX(ext, x)
		svgBody += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.thin}"/>`
		if (selectedLabels.has(i)) {
			svgBody += `<text x="${x}" y="${yPos + 20}" fill="${theme.colors.text}" text-anchor="middle">${t}</text>`
			includeText(ext, x, String(t), "middle", 8)
		}
	})

	// Distance highlight
	includePointX(ext, zeroPos)
	includePointX(ext, valuePos)
	svgBody += `<line x1="${zeroPos}" y1="${yPos}" x2="${valuePos}" y2="${yPos}" stroke="${highlightColor}" stroke-width="4" stroke-linecap="round"/>`

	// Distance label
	if (showDistanceLabel) {
		const labelX = (zeroPos + valuePos) / 2
		const labelText = `|${value}| = ${absValue}`
		svgBody += `<text x="${labelX}" y="${yPos - 15}" fill="${theme.colors.text}" text-anchor="middle" font-weight="${theme.font.weight.bold}">${labelText}</text>`
		includeText(ext, labelX, labelText, "middle", 8)
	}

	includePointX(ext, valuePos)
	svgBody += `<circle cx="${valuePos}" cy="${yPos}" r="${theme.geometry.pointRadius.large}" fill="${highlightColor}" stroke="${theme.colors.black}" stroke-width="${theme.stroke.width.thin}"/>`

	// Apply dynamic width at the end
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
