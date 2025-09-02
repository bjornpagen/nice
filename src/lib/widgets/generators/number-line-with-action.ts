import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"
import { buildTicks, formatTickInt } from "@/lib/widgets/utils/ticks"

const Label = z
	.object({
		value: z
			.number()
			.describe(
				"The position on the number line where this custom label appears (e.g., 5, -2, 3.5). Must be within min/max range."
			),
		text: z
			.string()
			.describe(
				"The text to display at this position instead of the default number (e.g., 'Start', 'A', 'Goal'). Replaces numeric label."
			)
	})
	.strict()

const Action = z
	.object({
		delta: z
			.number()
			.describe(
				"The change amount for this action. Positive for addition/forward, negative for subtraction/backward (e.g., 3, -5, 2.5, -1)."
			),
		label: z
			.string()
			.describe(
				"Text label for this action arrow (e.g., '+3', '-5', 'add 2', 'back 1'). Displayed above/beside the curved arrow."
			)
	})
	.strict()

export const NumberLineWithActionPropsSchema = z
	.object({
		type: z
			.literal("numberLineWithAction")
			.describe("Identifies this as a number line with action arrows showing addition/subtraction operations."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width in pixels for horizontal orientation (e.g., 600, 700, 500). For vertical, this is the narrower dimension."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height in pixels for horizontal orientation (e.g., 150, 200, 180). For vertical, this is the longer dimension."
			),
		orientation: z
			.enum(["horizontal", "vertical"])
			.describe(
				"Direction of the number line. 'horizontal' is left-to-right, 'vertical' is bottom-to-top. Affects layout and arrow directions."
			),
		min: z
			.number()
			.describe(
				"Minimum value shown on the number line (e.g., -10, 0, -5). Should be less than startValue - sum of negative deltas."
			),
		max: z
			.number()
			.describe(
				"Maximum value shown on the number line (e.g., 20, 10, 15). Should be greater than startValue + sum of positive deltas."
			),
		tickInterval: z
			.number()
			.describe(
				"Spacing between tick marks (e.g., 1, 2, 5, 0.5). Should evenly divide the range for clean appearance."
			),
		startValue: z
			.number()
			.describe(
				"The initial position before any actions (e.g., 5, 0, -2). Marked with a distinct point. Actions begin from here."
			),
		customLabels: z
			.array(Label)
			.describe(
				"Replace numeric labels at specific positions with custom text. Empty array uses default numeric labels. Useful for word problems."
			),
		actions: z
			.array(Action)
			.describe(
				"Sequence of operations shown as curved arrows. Applied in order from startValue. Multiple actions create multi-step problems (e.g., 5 + 3 - 2)."
			)
	})
	.strict()
	.describe(
		"Creates an interactive number line showing arithmetic operations as curved 'jump' arrows. Perfect for teaching addition/subtraction concepts, multi-step problems, and integer operations. Supports multiple sequential actions to show complex calculations step-by-step."
	)

export type NumberLineWithActionProps = z.infer<typeof NumberLineWithActionPropsSchema>

/**
 * Creates an interactive number line showing arithmetic operations as curved 'jump' arrows.
 * Perfect for teaching addition/subtraction concepts, multi-step problems, and integer operations.
 * Supports multiple sequential actions to show complex calculations step-by-step.
 */
export const generateNumberLineWithAction: WidgetGenerator<typeof NumberLineWithActionPropsSchema> = (data) => {
	const { width, height, orientation, min, max, tickInterval, startValue, customLabels, actions } = data
	const isHorizontal = orientation === "horizontal"
	const lineLength = (isHorizontal ? width : height) - 2 * PADDING

	if (min >= max) return `<svg width="${width}" height="${height}"></svg>`
	const scale = lineLength / (max - min)

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	canvas.addDef(
		`<marker id="action-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.axis}"/></marker>`
	)

	if (isHorizontal) {
		const yPos = height / 2
		const toSvgX = (val: number) => PADDING + (val - min) * scale

		// Axis and Ticks
		canvas.drawLine(PADDING, yPos, width - PADDING, yPos, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thick
		})

		const { values, ints, scale } = buildTicks(min, max, tickInterval)
		const customLabelsMap = new Map(customLabels.map(l => [l.value, l.text]))

		values.forEach((t, i) => {
			const vI = ints[i]
			if (vI === undefined) return

			const x = toSvgX(t)
			canvas.drawLine(x, yPos - 5, x, yPos + 5, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})

			const customLabel = customLabelsMap.get(t)
			if (customLabel) {
				canvas.drawText({ x: x, y: yPos + 20, text: customLabel, fill: theme.colors.axis, anchor: "middle", fontWeight: theme.font.weight.bold })
			} else {
				canvas.drawText({ x: x, y: yPos + 20, text: formatTickInt(vI, scale), fill: theme.colors.axis, anchor: "middle", fontPx: theme.font.size.small })
			}
		})

		// Custom Labels
		for (const label of customLabels) {
			const x = toSvgX(label.value)
			canvas.drawText({
				x: x,
				y: yPos + 20,
				text: label.text,
				fill: theme.colors.axis,
				anchor: "middle",
				fontWeight: theme.font.weight.bold
			})
		}

		// Start value marker
		const startX = toSvgX(startValue)
		canvas.drawCircle(startX, yPos, theme.geometry.pointRadius.small, {
			fill: theme.colors.actionPrimary,
			stroke: theme.colors.actionPrimary,
			strokeWidth: theme.stroke.width.thin
		})

		// Action arrows - sequential with stacked labels
		let currentValue = startValue
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			if (!action) continue

			const actionStartX = toSvgX(currentValue)
			const actionEndX = toSvgX(currentValue + action.delta)
			const midX = (actionStartX + actionEndX) / 2

			// Stack arrows vertically to avoid overlap
			const arrowOffset = 20 + i * 15
			const arrowY = yPos - arrowOffset
			const controlOffset = 25 + i * 10
			const controlY = arrowY - controlOffset * Math.sign(action.delta || 1)

			// Draw curved arrow
			const arrowPath = new Path2D().moveTo(actionStartX, arrowY).quadraticCurveTo(midX, controlY, actionEndX, arrowY)
			canvas.drawPath(arrowPath, {
				fill: "none",
				stroke: theme.colors.actionPrimary,
				strokeWidth: theme.stroke.width.base,
				markerEnd: "url(#action-arrow)"
			})

			// Arrow label
			canvas.drawText({
				x: midX,
				y: controlY - 5,
				text: action.label,
				fill: theme.colors.actionPrimary,
				anchor: "middle",
				fontPx: theme.font.size.small,
				fontWeight: theme.font.weight.bold
			})

			currentValue += action.delta
		}

		// Final value marker
		const finalX = toSvgX(currentValue)
		canvas.drawCircle(finalX, yPos, theme.geometry.pointRadius.small, {
			fill: theme.colors.actionSecondary,
			stroke: theme.colors.actionSecondary,
			strokeWidth: theme.stroke.width.thin
		})
	} else {
		// Vertical orientation
		const xPos = width / 2
		const toSvgY = (val: number) => height - PADDING - (val - min) * scale

		// Axis and Ticks
		canvas.drawLine(xPos, PADDING, xPos, height - PADDING, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thick
		})

		const { values, ints, scale } = buildTicks(min, max, tickInterval)
		const customLabelsMap = new Map(customLabels.map(l => [l.value, l.text]))

		values.forEach((t, i) => {
			const vI = ints[i]
			if (vI === undefined) return

			const y = toSvgY(t)
			canvas.drawLine(xPos - 5, y, xPos + 5, y, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})

			const customLabel = customLabelsMap.get(t)
			const labelX = xPos - 10
			if (customLabel) {
				canvas.drawText({ x: labelX, y: y + 4, text: customLabel, fill: theme.colors.axis, anchor: "end", fontWeight: theme.font.weight.bold })
			} else {
				canvas.drawText({ x: labelX, y: y + 4, text: formatTickInt(vI, scale), fill: theme.colors.axis, anchor: "end", fontPx: theme.font.size.small })
			}
		})

		// Custom Labels
		for (const label of customLabels) {
			const y = toSvgY(label.value)
			const labelX = xPos - 10
			canvas.drawText({
				x: labelX,
				y: y + 4,
				text: label.text,
				fill: theme.colors.axis,
				anchor: "end",
				fontWeight: theme.font.weight.bold
			})
		}

		// Start value marker
		const startY = toSvgY(startValue)
		canvas.drawCircle(xPos, startY, theme.geometry.pointRadius.small, {
			fill: theme.colors.actionPrimary,
			stroke: theme.colors.actionPrimary,
			strokeWidth: theme.stroke.width.thin
		})

		// Action arrows - sequential with stacked labels
		let currentValue = startValue
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			if (!action) continue

			const actionStartY = toSvgY(currentValue)
			const actionEndY = toSvgY(currentValue + action.delta)
			const midY = (actionStartY + actionEndY) / 2

			// Stack arrows horizontally to avoid overlap
			const arrowOffset = 20 + i * 15
			const arrowX = xPos + arrowOffset
			const controlOffset = 25 + i * 10
			const controlX = arrowX + controlOffset

			// Draw curved arrow
			const arrowPath = new Path2D().moveTo(arrowX, actionStartY).quadraticCurveTo(controlX, midY, arrowX, actionEndY)
			canvas.drawPath(arrowPath, {
				fill: "none",
				stroke: theme.colors.actionPrimary,
				strokeWidth: theme.stroke.width.base,
				markerEnd: "url(#action-arrow)"
			})

			// Arrow label (rotated for vertical layout)
			const labelX = controlX + 5
			canvas.drawText({
				x: labelX,
				y: midY,
				text: action.label,
				fill: theme.colors.actionPrimary,
				anchor: "middle",
				fontPx: theme.font.size.small,
				fontWeight: theme.font.weight.bold,
				rotate: { angle: -90, cx: labelX, cy: midY }
			})

			currentValue += action.delta
		}

		// Final value marker
		const finalY = toSvgY(currentValue)
		canvas.drawCircle(xPos, finalY, theme.geometry.pointRadius.small, {
			fill: theme.colors.actionSecondary,
			stroke: theme.colors.actionSecondary,
			strokeWidth: theme.stroke.width.thin
		})
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
