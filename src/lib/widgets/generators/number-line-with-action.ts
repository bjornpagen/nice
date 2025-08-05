import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a custom label for a specific position on the number line
const NumberLineCustomLabelSchema = z
	.object({
		value: z.number().describe("The numeric position of the label."),
		text: z.string().describe('The text to display for the label (e.g., "-11°C", "?°C").')
	})
	.strict()

// Defines the action arrow to be drawn over the number line
const ActionArrowSchema = z
	.object({
		startValue: z.number().describe("The numeric value where the action arrow begins."),
		change: z
			.number()
			.describe("The amount of change. A positive value moves right/up, a negative value moves left/down."),
		label: z.string().describe('The text label to display alongside the arrow (e.g., "+5°C", "-24").')
	})
	.strict()

// The main Zod schema for the numberLineWithAction function
export const NumberLineWithActionPropsSchema = z
	.object({
		type: z.literal("numberLineWithAction"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 260)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 325)
			.describe("The total height of the output SVG container in pixels."),
		orientation: z
			.enum(["horizontal", "vertical"])
			.nullable()
			.transform((val) => val ?? "vertical")
			.describe("The orientation of the number line."),
		min: z.number().describe("The minimum value displayed on the number line."),
		max: z.number().describe("The maximum value displayed on the number line."),
		tickInterval: z.number().describe("The numeric interval between tick marks."),
		customLabels: z
			.array(NumberLineCustomLabelSchema)
			.describe("An array providing text labels for key points, such as the start value and the unknown end value."),
		action: ActionArrowSchema.describe("Configuration for the action arrow representing the change.")
	})
	.strict()
	.describe(
		'This template extends the basic number line to visually represent a dynamic process or operation, such as addition or subtraction. It is perfect for illustrating word problems that involve a change from a starting value. The generator will render a number line, mark a starting point, and draw a curved arrow to visually represent an "action" or change (e.g., "+5°C"). The destination of the arrow can be labeled with a question mark ("?"), making it ideal for problems where the student must calculate the result.'
	)

export type NumberLineWithActionProps = z.infer<typeof NumberLineWithActionPropsSchema>

/**
 * This template extends the basic number line to visually represent a dynamic process or operation,
 * such as addition or subtraction.
 */
export const generateNumberLineWithAction: WidgetGenerator<typeof NumberLineWithActionPropsSchema> = (data) => {
	const { width, height, orientation, min, max, tickInterval, customLabels, action } = data
	const isHorizontal = orientation === "horizontal"
	const padding = 30
	const lineLength = (isHorizontal ? width : height) - 2 * padding

	if (min >= max) return `<svg width="${width}" height="${height}"></svg>`
	const scale = lineLength / (max - min)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += `<defs><marker id="action-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#333333"/></marker></defs>`

	if (isHorizontal) {
		const yPos = height / 2
		const toSvgX = (val: number) => padding + (val - min) * scale
		// Axis and Ticks
		svg += `<line x1="${padding}" y1="${yPos}" x2="${width - padding}" y2="${yPos}" stroke="#333333"/>`
		for (let t = min; t <= max; t += tickInterval) {
			const x = toSvgX(t)
			svg += `<line x1="${x}" y1="${yPos - 5}" x2="${x}" y2="${yPos + 5}" stroke="#333333"/>`
		}
		// Custom Labels
		for (const l of customLabels) {
			const x = toSvgX(l.value)
			svg += `<text x="${x}" y="${yPos + 20}" fill="#333333" text-anchor="middle" font-weight="bold">${l.text}</text>`
		}
		// Action arrow
		const startX = toSvgX(action.startValue)
		const endX = toSvgX(action.startValue + action.change)
		const midX = (startX + endX) / 2
		const arrowY = yPos - 15
		const controlY = arrowY - 30 * Math.sign(action.change)
		svg += `<path d="M ${startX} ${arrowY} Q ${midX} ${controlY} ${endX} ${arrowY}" fill="none" stroke="#333333" stroke-width="1.5" marker-end="url(#action-arrow)"/>`
		svg += `<text x="${midX}" y="${controlY}" fill="#333333" text-anchor="middle" dominant-baseline="middle">${action.label}</text>`
	} else {
		// Vertical
		const xPos = width / 2
		const toSvgY = (val: number) => height - padding - (val - min) * scale
		// Axis and Ticks
		svg += `<line x1="${xPos}" y1="${padding}" x2="${xPos}" y2="${height - padding}" stroke="#333333"/>`
		for (let t = min; t <= max; t += tickInterval) {
			const y = toSvgY(t)
			svg += `<line x1="${xPos - 5}" y1="${y}" x2="${xPos + 5}" y2="${y}" stroke="#333333"/>`
		}
		// Custom Labels
		for (const l of customLabels) {
			const y = toSvgY(l.value)
			svg += `<text x="${xPos - 10}" y="${y + 4}" fill="#333333" text-anchor="end" font-weight="bold">${l.text}</text>`
		}
		// Action arrow
		const startY = toSvgY(action.startValue)
		const endY = toSvgY(action.startValue + action.change)
		const midY = (startY + endY) / 2
		const arrowX = xPos + 15
		const controlX = arrowX + 30
		svg += `<path d="M ${arrowX} ${startY} Q ${controlX} ${midY} ${arrowX} ${endY}" fill="none" stroke="#333333" stroke-width="1.5" marker-end="url(#action-arrow)"/>`
		svg += `<text x="${controlX}" y="${midY}" fill="#333333" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90, ${controlX}, ${midY})">${action.label}</text>`
	}

	svg += "</svg>"
	return svg
}
