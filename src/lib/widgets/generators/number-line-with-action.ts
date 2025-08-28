import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

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

	const ext = initExtents(width)
	let svgBody = `<defs><marker id="action-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#333333"/></marker></defs>`

	if (isHorizontal) {
		const yPos = height / 2
		const toSvgX = (val: number) => PADDING + (val - min) * scale

		// Axis and Ticks
		includePointX(ext, PADDING)
		includePointX(ext, width - PADDING)
		svgBody += `<line x1="${PADDING}" y1="${yPos}" x2="${width - PADDING}" y2="${yPos}" stroke="#333333" stroke-width="2"/>`
		for (let t = min; t <= max; t += tickInterval) {
			const x = toSvgX(t)
			includePointX(ext, x)
			svgBody += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="#333333"/>`
			// Draw default numeric labels if no custom label exists for this position
			const hasCustomLabel = customLabels.some((label) => label.value === t)
			if (!hasCustomLabel) {
				svgBody += `<text x="${x}" y="${yPos + 20}" fill="#333333" text-anchor="middle" font-size="10">${t}</text>`
				includeText(ext, x, String(t), "middle", 7)
			}
		}

		// Custom Labels
		for (const label of customLabels) {
			const x = toSvgX(label.value)
			svgBody += `<text x="${x}" y="${yPos + 20}" fill="#333333" text-anchor="middle" font-weight="bold">${label.text}</text>`
			includeText(ext, x, label.text, "middle", 7)
		}

		// Start value marker
		const startX = toSvgX(startValue)
		includePointX(ext, startX)
		svgBody += `<circle cx="${startX}" cy="${yPos}" r="3" fill="#007ACC" stroke="#005999" stroke-width="1"/>`

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
			svgBody += `<path d="M ${actionStartX} ${arrowY} Q ${midX} ${controlY} ${actionEndX} ${arrowY}" fill="none" stroke="#007ACC" stroke-width="1.5" marker-end="url(#action-arrow)"/>`

			// Arrow label
			svgBody += `<text x="${midX}" y="${controlY - 5}" fill="#007ACC" text-anchor="middle" font-size="10" font-weight="bold">${action.label}</text>`
			includeText(ext, midX, action.label, "middle", 7)
			includePointX(ext, actionStartX)
			includePointX(ext, actionEndX)
			// Track the arc control point (peak of the curve)
			includePointX(ext, midX)

			currentValue += action.delta
		}

		// Final value marker
		const finalX = toSvgX(currentValue)
		includePointX(ext, finalX)
		svgBody += `<circle cx="${finalX}" cy="${yPos}" r="3" fill="#FF6B35" stroke="#CC5429" stroke-width="1"/>`
	} else {
		// Vertical orientation
		const xPos = width / 2
		const toSvgY = (val: number) => height - PADDING - (val - min) * scale

		// Axis and Ticks
		includePointX(ext, xPos)
		svgBody += `<line x1="${xPos}" y1="${PADDING}" x2="${xPos}" y2="${height - PADDING}" stroke="#333333" stroke-width="2"/>`
		for (let t = min; t <= max; t += tickInterval) {
			const y = toSvgY(t)
			svgBody += `<line x1="${xPos - 5}" y1="${y}" x2="${xPos + 5}" y2="${y}" stroke="#333333"/>`
			// Draw default numeric labels if no custom label exists for this position
			const hasCustomLabel = customLabels.some((label) => label.value === t)
			if (!hasCustomLabel) {
				const labelX = xPos - 10
				svgBody += `<text x="${labelX}" y="${y + 4}" fill="#333333" text-anchor="end" font-size="10">${t}</text>`
				includeText(ext, labelX, String(t), "end", 7)
			}
		}

		// Custom Labels
		for (const label of customLabels) {
			const y = toSvgY(label.value)
			const labelX = xPos - 10
			svgBody += `<text x="${labelX}" y="${y + 4}" fill="#333333" text-anchor="end" font-weight="bold">${label.text}</text>`
			includeText(ext, labelX, label.text, "end", 7)
		}

		// Start value marker
		const startY = toSvgY(startValue)
		svgBody += `<circle cx="${xPos}" cy="${startY}" r="3" fill="#007ACC" stroke="#005999" stroke-width="1"/>`

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
			svgBody += `<path d="M ${arrowX} ${actionStartY} Q ${controlX} ${midY} ${arrowX} ${actionEndY}" fill="none" stroke="#007ACC" stroke-width="1.5" marker-end="url(#action-arrow)"/>`

			// Arrow label (rotated for vertical layout)
			const labelX = controlX + 5
			svgBody += `<text x="${labelX}" y="${midY}" fill="#007ACC" text-anchor="middle" font-size="10" font-weight="bold" transform="rotate(-90, ${labelX}, ${midY})">${action.label}</text>`
			includeText(ext, labelX, action.label, "middle", 7)
			includePointX(ext, arrowX)
			includePointX(ext, controlX)

			currentValue += action.delta
		}

		// Final value marker
		const finalY = toSvgY(currentValue)
		svgBody += `<circle cx="${xPos}" cy="${finalY}" r="3" fill="#FF6B35" stroke="#CC5429" stroke-width="1"/>`
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
