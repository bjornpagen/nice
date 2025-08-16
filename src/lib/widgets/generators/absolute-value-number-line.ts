import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"

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
	const padding = { top: 30, right: 20, bottom: 30, left: 20 }
	const chartWidth = width - padding.left - padding.right

	if (min >= max) {
		logger.error("invalid range for absolute value number line", { min, max })
		throw errors.wrap(ErrInvalidRange, `min (${min}) must be less than max (${max})`)
	}

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => padding.left + (val - min) * scale
	const yPos = height - padding.bottom

	const zeroPos = toSvgX(0)
	const valuePos = toSvgX(value)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += `<line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" stroke="black" stroke-width="1.5"/>`

	// Ticks and labels
	for (let t = min; t <= max; t += tickInterval) {
		const x = toSvgX(t)
		svg += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="black" stroke-width="1"/>`
		svg += `<text x="${x}" y="${yPos + 20}" fill="black" text-anchor="middle">${t}</text>`
	}

	// Distance highlight
	svg += `<line x1="${zeroPos}" y1="${yPos}" x2="${valuePos}" y2="${yPos}" stroke="${highlightColor}" stroke-width="4" stroke-linecap="round"/>`

	// Distance label
	if (showDistanceLabel) {
		const labelX = (zeroPos + valuePos) / 2
		svg += `<text x="${labelX}" y="${yPos - 15}" fill="black" text-anchor="middle" font-weight="bold">|${value}| = ${absValue}</text>`
	}

	svg += `<circle cx="${valuePos}" cy="${yPos}" r="5" fill="${highlightColor}" stroke="black" stroke-width="1"/>`

	svg += "</svg>"
	return svg
}
