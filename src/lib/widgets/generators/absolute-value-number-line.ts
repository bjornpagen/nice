import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { calculateTextAwareLabelSelection } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { buildTicks, formatTickInt } from "@/lib/widgets/utils/ticks"

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
	const { width, min, max, tickInterval, value, highlightColor, showDistanceLabel } = data
	const absValue = Math.abs(value)
	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height: 0 },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	const chartWidth = width - PADDING * 2

	if (min >= max) {
		logger.error("invalid range for absolute value number line", { min, max })
		throw errors.wrap(ErrInvalidRange, `min (${min}) must be less than max (${max})`)
	}

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => PADDING + (val - min) * scale
	const yPos = 50 // A fixed vertical position within the dynamic canvas

	// MODIFIED: Replace svgBody string concatenation with canvas calls
	canvas.drawLine(PADDING, yPos, width - PADDING, yPos, {
		stroke: theme.colors.black,
		strokeWidth: theme.stroke.width.base
	})

	// Ticks and labels with text-aware selection
	const { values, ints, scale: tickScale } = buildTicks(min, max, tickInterval)
	const tickPositions = values.map(toSvgX)
	const tickLabels = ints.map((vI) => formatTickInt(vI, tickScale))
	const selectedLabels = calculateTextAwareLabelSelection(tickLabels, tickPositions, chartWidth, 8, 5)

	values.forEach((t, i) => {
		const x = toSvgX(t)
		canvas.drawLine(x, yPos - 5, x, yPos + 5, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thin
		})
		if (selectedLabels.has(i)) {
			const label = tickLabels[i]
			if (label !== undefined) {
				canvas.drawText({ x, y: yPos + 20, text: label, fill: theme.colors.text, anchor: "middle" })
			}
		}
	})

	// Distance highlight
	canvas.drawLine(toSvgX(0), yPos, toSvgX(value), yPos, {
		stroke: highlightColor,
		strokeWidth: 4,
		strokeLinecap: "round"
	})

	// Distance label
	if (showDistanceLabel) {
		const labelX = (toSvgX(0) + toSvgX(value)) / 2
		const labelText = `|${value}| = ${absValue}`
		canvas.drawText({
			x: labelX,
			y: yPos - 15,
			text: labelText,
			fill: theme.colors.text,
			anchor: "middle",
			fontWeight: theme.font.weight.bold
		})
	}

	canvas.drawCircle(toSvgX(value), yPos, theme.geometry.pointRadius.large, {
		fill: highlightColor,
		stroke: theme.colors.black,
		strokeWidth: theme.stroke.width.thin
	})

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
