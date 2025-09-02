import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { theme } from "@/lib/widgets/utils/theme"

// strict schema with no nullables or fallbacks
export const NumberLineForOppositesPropsSchema = z
	.object({
		type: z
			.literal("numberLineForOpposites")
			.describe("identifies this as a number line for opposites widget showing positive/negative pairs."),
		width: z
			.number()
			.positive()
			.describe("total width of the number line in pixels (e.g., 600, 700, 500). must accommodate labels and arrows."),
		height: z
			.number()
			.positive()
			.describe(
				"total height of the widget in pixels (e.g., 120, 150, 100). includes space for arrows above the line."
			),
		maxAbsValue: z
			.number()
			.describe(
				"maximum absolute value shown on the number line (e.g., 10, 8, 5). line ranges from -maxAbsValue to +maxAbsValue, centered at 0."
			),
		tickInterval: z
			.number()
			.describe("spacing between tick marks (e.g., 1, 2, 0.5). should evenly divide maxAbsValue for symmetry."),
		value: z
			.number()
			.describe(
				"the number whose opposite is being illustrated (e.g., 5, -3, 7.5). both this value and its opposite (-value) are marked."
			),
		positiveLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"label for the positive value (e.g., '5', '+5', 'a', null). null hides the label. positioned near the positive point."
			),
		negativeLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"label for the negative value (e.g., '-5', 'opposite of 5', '-a', null). null hides the label. positioned near the negative point."
			),
		showArrows: z
			.boolean()
			.describe(
				"whether to show arrows from each value to zero, emphasizing equal distance. true highlights the 'same distance from zero' concept."
			)
	})
	.strict()
	.describe(
		"creates a centered number line showing a number and its opposite, demonstrating that opposites are equidistant from zero. essential for teaching additive inverses, absolute value concepts, and the symmetry of the number line around zero."
	)

export type NumberLineForOppositesProps = z.infer<typeof NumberLineForOppositesPropsSchema>

export const generateNumberLineForOpposites: WidgetGenerator<typeof NumberLineForOppositesPropsSchema> = (data) => {
	const { width, height, maxAbsValue, tickInterval, value, positiveLabel, negativeLabel, showArrows } = data
	const min = -maxAbsValue
	const max = maxAbsValue
	const chartWidth = width - 2 * PADDING
	const yPos = height / 2 + 10

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => PADDING + (val - min) * scale

	// always plot the negative and positive of the absolute magnitude
	const magnitude = Math.abs(value)
	const positiveValue = magnitude
	const negativeValue = -magnitude

	const posPos = toSvgX(positiveValue)
	const negPos = toSvgX(negativeValue)
	const zeroPos = toSvgX(0)

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	canvas.addDef(
		`<marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.black}"/></marker>`
	)

	// axis and ticks
	canvas.drawLine(PADDING, yPos, width - PADDING, yPos, {
		stroke: theme.colors.axis,
		strokeWidth: theme.stroke.width.base
	})

	for (let t = min; t <= max; t += tickInterval) {
		const x = toSvgX(t)
		canvas.drawLine(x, yPos - 5, x, yPos + 5, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.base
		})
		canvas.drawText({
			x: x,
			y: yPos + 20,
			text: String(t),
			fill: theme.colors.black,
			anchor: "middle"
		})
	}

	if (showArrows) {
		const arrowY = yPos - 10
		canvas.drawLine(zeroPos, arrowY, posPos, arrowY, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.base,
			markerEnd: "url(#arrowhead)"
		})
		canvas.drawLine(zeroPos, arrowY, negPos, arrowY, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.base,
			markerEnd: "url(#arrowhead)"
		})
	}

	canvas.drawCircle(posPos, yPos, 5, {
		fill: theme.colors.black
	})
	canvas.drawCircle(negPos, yPos, 5, {
		fill: theme.colors.black
	})

	const posLab = positiveLabel
	const negLab = negativeLabel
	if (posLab !== null) {
		canvas.drawText({
			x: posPos,
			y: yPos - 25,
			text: posLab,
			fill: theme.colors.black,
			anchor: "middle",
			fontWeight: theme.font.weight.bold
		})
	}
	if (negLab !== null) {
		canvas.drawText({
			x: negPos,
			y: yPos - 25,
			text: negLab,
			fill: theme.colors.black,
			anchor: "middle",
			fontWeight: theme.font.weight.bold
		})
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="12">${svgBody}</svg>`
}
