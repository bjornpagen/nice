import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidRange = errors.new("min must be less than max")

export const AbsoluteValueNumberLinePropsSchema = z
	.object({
		width: z.number().optional().default(480).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(80).describe("The total height of the output SVG container in pixels."),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		tickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		value: z.number().describe("The number whose absolute value is being illustrated."),
		highlightColor: z
			.string()
			.optional()
			.default("rgba(217, 95, 79, 0.8)")
			.describe("The CSS color for the highlighted distance segment and the point."),
		showDistanceLabel: z
			.boolean()
			.optional()
			.default(true)
			.describe("If true, shows a text label indicating the distance from zero.")
	})
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

	// Point
	svg += `<circle cx="${valuePos}" cy="${yPos}" r="5" fill="${highlightColor}" stroke="black" stroke-width="1"/>`

	svg += "</svg>"
	return svg
}
