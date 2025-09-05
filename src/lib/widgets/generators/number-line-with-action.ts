import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"
import { buildTicks } from "@/lib/widgets/utils/ticks"
import { selectAxisLabels } from "@/lib/widgets/utils/layout"

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
// Helper function to draw a dotted line with clipping around label areas
function drawClippedDottedLine(
	canvas: CanvasImpl,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	labelBounds: Array<{x: number, y: number, width: number, height: number}>,
	theme: any
) {
	// Check if the line intersects with any label bounds
	const lineIntersections: Array<{start: number, end: number}> = []
	
	// For vertical lines (x1 === x2)
	if (Math.abs(x1 - x2) < 0.1) {
		const lineX = x1
		const minY = Math.min(y1, y2)
		const maxY = Math.max(y1, y2)
		
		for (const bound of labelBounds) {
			// Check if vertical line intersects with label rectangle
			if (lineX >= bound.x && lineX <= bound.x + bound.width) {
				const intersectionStart = Math.max(minY, bound.y)
				const intersectionEnd = Math.min(maxY, bound.y + bound.height)
				
				if (intersectionStart < intersectionEnd) {
					lineIntersections.push({start: intersectionStart, end: intersectionEnd})
				}
			}
		}
	}
	// For horizontal lines (y1 === y2)
	else if (Math.abs(y1 - y2) < 0.1) {
		const lineY = y1
		const minX = Math.min(x1, x2)
		const maxX = Math.max(x1, x2)
		
		for (const bound of labelBounds) {
			// Check if horizontal line intersects with label rectangle
			if (lineY >= bound.y && lineY <= bound.y + bound.height) {
				const intersectionStart = Math.max(minX, bound.x)
				const intersectionEnd = Math.min(maxX, bound.x + bound.width)
				
				if (intersectionStart < intersectionEnd) {
					lineIntersections.push({start: intersectionStart, end: intersectionEnd})
				}
			}
		}
	}
	
	// If no intersections, draw the full line
	if (lineIntersections.length === 0) {
		canvas.drawLine(x1, y1, x2, y2, {
			stroke: theme.colors.actionPrimary,
			strokeWidth: theme.stroke.width.thin,
			dash: "2,2",
			opacity: 0.6
		})
		return
	}
	
	// Sort intersections and draw line segments between them
	lineIntersections.sort((a, b) => a.start - b.start)
	
	// For vertical lines
	if (Math.abs(x1 - x2) < 0.1) {
		const lineX = x1
		const minY = Math.min(y1, y2)
		const maxY = Math.max(y1, y2)
		let currentY = minY
		
		for (const intersection of lineIntersections) {
			// Draw segment before intersection
			if (currentY < intersection.start) {
				canvas.drawLine(lineX, currentY, lineX, intersection.start, {
					stroke: theme.colors.actionPrimary,
					strokeWidth: theme.stroke.width.thin,
					dash: "2,2",
					opacity: 0.6
				})
			}
			currentY = Math.max(currentY, intersection.end)
		}
		
		// Draw final segment after last intersection
		if (currentY < maxY) {
			canvas.drawLine(lineX, currentY, lineX, maxY, {
				stroke: theme.colors.actionPrimary,
				strokeWidth: theme.stroke.width.thin,
				dash: "2,2",
				opacity: 0.6
			})
		}
	}
	// For horizontal lines
	else {
		const lineY = y1
		const minX = Math.min(x1, x2)
		const maxX = Math.max(x1, x2)
		let currentX = minX
		
		for (const intersection of lineIntersections) {
			// Draw segment before intersection
			if (currentX < intersection.start) {
				canvas.drawLine(currentX, lineY, intersection.start, lineY, {
					stroke: theme.colors.actionPrimary,
					strokeWidth: theme.stroke.width.thin,
					dash: "2,2",
					opacity: 0.6
				})
			}
			currentX = Math.max(currentX, intersection.end)
		}
		
		// Draw final segment after last intersection
		if (currentX < maxX) {
			canvas.drawLine(currentX, lineY, maxX, lineY, {
				stroke: theme.colors.actionPrimary,
				strokeWidth: theme.stroke.width.thin,
				dash: "2,2",
				opacity: 0.6
			})
		}
	}
}

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

		const { values, labels: tickLabels } = buildTicks(min, max, tickInterval)
		const customLabelsMap = new Map(customLabels.map(l => [l.value, l.text]))
		const tickPositions = values.map(toSvgX)
		
		// Smart label selection to prevent overlaps
		const selectedLabels = selectAxisLabels({
			labels: tickLabels,
			positions: tickPositions,
			axisLengthPx: lineLength,
			orientation: "horizontal",
			fontPx: theme.font.size.small,
			minGapPx: 8
		})

		values.forEach((t, i) => {
			const x = toSvgX(t)
			canvas.drawLine(x, yPos - 5, x, yPos + 5, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})

			const customLabel = customLabelsMap.get(t)
			if (customLabel) {
				canvas.drawText({ x: x, y: yPos + 20, text: customLabel, fill: theme.colors.axis, anchor: "middle", fontWeight: theme.font.weight.bold })
			} else if (selectedLabels.has(i)) {
				canvas.drawText({ x: x, y: yPos + 20, text: tickLabels[i]!, fill: theme.colors.axis, anchor: "middle", fontPx: theme.font.size.small })
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
		const labelBounds: Array<{x: number, y: number, width: number, height: number}> = []
		
		// First pass: collect label bounds
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			if (!action || !action.label) continue

			const actionStartX = toSvgX(currentValue)
			const actionEndX = toSvgX(currentValue + action.delta)
			const midX = (actionStartX + actionEndX) / 2
			const baseOffset = 30
			const arrowSpacing = 25
			const arrowY = yPos - baseOffset - (i * arrowSpacing)
			
			// Estimate label dimensions with tight bounds (server-safe approximation)
			const labelWidth = action.label.length * theme.font.size.small * 0.6
			const labelHeight = theme.font.size.small
			const padding = 2  // Minimal padding for tighter clipping
			
			labelBounds.push({
				x: midX - labelWidth / 2 - padding,
				y: arrowY - 8 - labelHeight / 2 - padding,
				width: labelWidth + 2 * padding,
				height: labelHeight + 2 * padding
			})

			currentValue += action.delta
		}
		
		// Second pass: draw arrows and clipped dotted lines
		currentValue = startValue
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			if (!action) continue

			const actionStartX = toSvgX(currentValue)
			const actionEndX = toSvgX(currentValue + action.delta)
			const midX = (actionStartX + actionEndX) / 2

			// Stack arrows vertically with better spacing
			const baseOffset = 30
			const arrowSpacing = 25
			const arrowY = yPos - baseOffset - (i * arrowSpacing)

			// Draw completely horizontal arrow
			canvas.drawLine(actionStartX, arrowY, actionEndX, arrowY, {
				stroke: theme.colors.actionPrimary,
				strokeWidth: theme.stroke.width.base,
				markerEnd: "url(#action-arrow)"
			})

			// Draw dotted lines with clipping around labels
			drawClippedDottedLine(canvas, actionStartX, arrowY, actionStartX, yPos, labelBounds, theme)
			drawClippedDottedLine(canvas, actionEndX, arrowY, actionEndX, yPos, labelBounds, theme)

			// Arrow label with better spacing
			if (action.label) {
				canvas.drawText({
					x: midX,
					y: arrowY - 8,
					text: action.label,
					fill: theme.colors.actionPrimary,
					anchor: "middle",
					fontPx: theme.font.size.small,
					fontWeight: theme.font.weight.bold
				})
			}

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

		const { values, labels: tickLabels } = buildTicks(min, max, tickInterval)
		const customLabelsMap = new Map(customLabels.map(l => [l.value, l.text]))
		const tickPositions = values.map(toSvgY)
		
		// Smart label selection to prevent overlaps
		const selectedLabels = selectAxisLabels({
			labels: tickLabels,
			positions: tickPositions,
			axisLengthPx: lineLength,
			orientation: "vertical",
			fontPx: theme.font.size.small,
			minGapPx: 12
		})

		values.forEach((t, i) => {
			const y = toSvgY(t)
			canvas.drawLine(xPos - 5, y, xPos + 5, y, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})

			const customLabel = customLabelsMap.get(t)
			const labelX = xPos - 10
			if (customLabel) {
				canvas.drawText({ x: labelX, y: y + 4, text: customLabel, fill: theme.colors.axis, anchor: "end", fontWeight: theme.font.weight.bold })
			} else if (selectedLabels.has(i)) {
				canvas.drawText({ x: labelX, y: y + 4, text: tickLabels[i]!, fill: theme.colors.axis, anchor: "end", fontPx: theme.font.size.small })
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
		const labelBounds: Array<{x: number, y: number, width: number, height: number}> = []
		
		// First pass: collect label bounds for vertical layout
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			if (!action || !action.label) continue

			const actionStartY = toSvgY(currentValue)
			const actionEndY = toSvgY(currentValue + action.delta)
			const midY = (actionStartY + actionEndY) / 2
			const baseOffset = 30
			const arrowSpacing = 32  // Reduced from 40 to 32 for tighter spacing
			const arrowX = xPos + baseOffset + (i * arrowSpacing)
			const labelX = arrowX + 18  // Reduced from 25 to 18 for better balance
			
			// For rotated text (-90 degrees), calculate accurate bounding box
			const textWidth = action.label.length * theme.font.size.small * 0.6  // original text width
			const textHeight = theme.font.size.small  // original text height
			const padding = 3  // Adequate padding for proper clipping
			
			// For -90 degree rotation around (labelX, midY), use heavily asymmetric clipping
			// Text visually extends more to the left, so we need much more padding on the left
			const leftPadding = padding + 4   // Much more padding on the left where text appears
			const rightPadding = 0             // No padding on the right - preserve maximum dotted line
			const topPadding = padding
			const bottomPadding = padding
			
			labelBounds.push({
				x: labelX - textHeight / 2 - leftPadding,    // more space on left
				y: midY - textWidth / 2 - topPadding,        // top edge
				width: textHeight + leftPadding + rightPadding, // asymmetric width
				height: textWidth + topPadding + bottomPadding   // symmetric height
			})

			currentValue += action.delta
		}
		
		// Second pass: draw arrows and clipped dotted lines
		currentValue = startValue
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]
			if (!action) continue

			const actionStartY = toSvgY(currentValue)
			const actionEndY = toSvgY(currentValue + action.delta)
			const midY = (actionStartY + actionEndY) / 2

			// Stack arrows horizontally with better spacing
			const baseOffset = 30
			const arrowSpacing = 32  // Reduced from 40 to 32 for tighter spacing
			const arrowX = xPos + baseOffset + (i * arrowSpacing)

			// Draw completely vertical arrow
			canvas.drawLine(arrowX, actionStartY, arrowX, actionEndY, {
				stroke: theme.colors.actionPrimary,
				strokeWidth: theme.stroke.width.base,
				markerEnd: "url(#action-arrow)"
			})

			// Draw dotted lines with clipping around labels
			drawClippedDottedLine(canvas, arrowX, actionStartY, xPos, actionStartY, labelBounds, theme)
			drawClippedDottedLine(canvas, arrowX, actionEndY, xPos, actionEndY, labelBounds, theme)

			// Arrow label (rotated for vertical layout) with better spacing
			if (action.label) {
				const labelX = arrowX + 18  // Reduced from 25 to 18 for better balance
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
			}

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
