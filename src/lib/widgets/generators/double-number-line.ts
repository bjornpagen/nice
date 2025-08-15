import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrMismatchedTickCounts = errors.new("top and bottom lines must have the same number of ticks")

export const DoubleNumberLinePropsSchema = z.object({
  type: z.literal('doubleNumberLine').describe("Identifies this as a double number line widget for showing proportional relationships."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 600, 700, 500). Must accommodate both labels and all tick values."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 200, 250, 180). Includes space for both lines, labels, and vertical spacing."),
  topLine: z.object({ 
    label: z.string().nullable().transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)).describe("Label for this number line shown on the left side (e.g., 'Cups of Flour', 'Cost ($)', 'Miles', 'Time (minutes)', null). Keep concise to fit. Null shows no label."), 
    ticks: z.array(z.union([z.string(), z.number()])).describe("Tick mark values from left to right. Can be numbers (e.g., [0, 2, 4, 6]) or strings (e.g., ['0', '1/2', '1', '3/2']). Must have same count as other line for alignment.") 
  }).strict().describe("Configuration for the upper number line. Represents one quantity in the proportional relationship."),
  bottomLine: z.object({ 
    label: z.string().nullable().transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)).describe("Label for this number line shown on the left side (e.g., 'Cups of Flour', 'Cost ($)', 'Miles', 'Time (minutes)', null). Keep concise to fit. Null shows no label."), 
    ticks: z.array(z.union([z.string(), z.number()])).describe("Tick mark values from left to right. Can be numbers (e.g., [0, 2, 4, 6]) or strings (e.g., ['0', '1/2', '1', '3/2']). Must have same count as other line for alignment.") 
  }).strict().describe("Configuration for the lower number line. Represents the related quantity. Tick positions align vertically with top line."),
}).strict().describe("Creates parallel number lines showing proportional relationships between two quantities. Vertical lines connect corresponding values. Essential for ratio reasoning, unit rates, and proportional thinking. Both lines must have the same number of ticks for proper alignment.")

export type DoubleNumberLineProps = z.infer<typeof DoubleNumberLinePropsSchema>

/**
 * This template generates a double number line diagram as a clear and accurate SVG graphic.
 * This visualization tool is excellent for illustrating the relationship between two
 * different quantities that share a constant ratio.
 */
export const generateDoubleNumberLine: WidgetGenerator<typeof DoubleNumberLinePropsSchema> = (data) => {
	const { width, height, topLine, bottomLine } = data
	const padding = { horizontal: 20 }
	const lineLength = width - 2 * padding.horizontal

	// Define vertical spacing constants for clarity and maintainability.
	const TOP_LINE_LABEL_Y_OFFSET = -20 // Distance from top line UP to its label
	const TOP_LINE_TICK_LABEL_Y_OFFSET = 20 // Distance from top line DOWN to its tick labels
	const BOTTOM_LINE_LABEL_Y_OFFSET = 30 // Distance from bottom line DOWN to its label
	const BOTTOM_LINE_TICK_LABEL_Y_OFFSET = -15 // Distance from bottom line UP to its tick labels
	const TICK_MARK_HEIGHT = 5
	const LINE_SEPARATION = 100 // Increased to ensure sufficient vertical space between lines and labels

	// Calculate minimum height needed to prevent label clipping
	const requiredMinHeight = Math.abs(TOP_LINE_LABEL_Y_OFFSET) + LINE_SEPARATION + BOTTOM_LINE_LABEL_Y_OFFSET + 10 // +10 buffer
	const adjustedHeight = Math.max(height, requiredMinHeight)

	// Calculate the vertical center of the SVG and position the lines symmetrically around it.
	const verticalCenter = adjustedHeight / 2
	const topY = verticalCenter - LINE_SEPARATION / 2
	const bottomY = verticalCenter + LINE_SEPARATION / 2

	if (topLine.ticks.length !== bottomLine.ticks.length) {
		throw errors.wrap(
			ErrMismatchedTickCounts,
			`top line has ${topLine.ticks.length} ticks, bottom line has ${bottomLine.ticks.length} ticks`
		)
	}

	const numTicks = topLine.ticks.length
	if (numTicks < 2) {
		return `<svg width="${width}" height="${adjustedHeight}"></svg>` // Not enough ticks to draw a line
	}

	const tickSpacing = lineLength / (numTicks - 1)

	let svg = `<svg width="${width}" height="${adjustedHeight}" viewBox="0 0 ${width} ${adjustedHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += "<style>.line-label { font-size: 14px; font-weight: bold; text-anchor: middle; }</style>"

	// Top line
	svg += `<line x1="${padding.horizontal}" y1="${topY}" x2="${width - padding.horizontal}" y2="${topY}" stroke="#333333"/>`
	if (topLine.label !== null) {
		svg += `<text x="${width / 2}" y="${topY + TOP_LINE_LABEL_Y_OFFSET}" class="line-label">${topLine.label}</text>`
	}
	topLine.ticks.forEach((t, i) => {
		const x = padding.horizontal + i * tickSpacing
		svg += `<line x1="${x}" y1="${topY - TICK_MARK_HEIGHT}" x2="${x}" y2="${topY + TICK_MARK_HEIGHT}" stroke="#333333"/>`
		svg += `<text x="${x}" y="${topY + TOP_LINE_TICK_LABEL_Y_OFFSET}" fill="#333333" text-anchor="middle">${t}</text>`
	})

	// Bottom line
	svg += `<line x1="${padding.horizontal}" y1="${bottomY}" x2="${width - padding.horizontal}" y2="${bottomY}" stroke="#333333"/>`
	if (bottomLine.label !== null) {
		svg += `<text x="${width / 2}" y="${bottomY + BOTTOM_LINE_LABEL_Y_OFFSET}" class="line-label">${bottomLine.label}</text>`
	}
	bottomLine.ticks.forEach((t, i) => {
		const x = padding.horizontal + i * tickSpacing
		svg += `<line x1="${x}" y1="${bottomY - TICK_MARK_HEIGHT}" x2="${x}" y2="${bottomY + TICK_MARK_HEIGHT}" stroke="#333333"/>`
		svg += `<text x="${x}" y="${bottomY + BOTTOM_LINE_TICK_LABEL_Y_OFFSET}" fill="#333333" text-anchor="middle">${t}</text>`
	})

	// Alignment lines (optional, but good for clarity)
	for (let i = 0; i < numTicks; i++) {
		const x = padding.horizontal + i * tickSpacing
		svg += `<line x1="${x}" y1="${topY + TICK_MARK_HEIGHT}" x2="${x}" y2="${bottomY - TICK_MARK_HEIGHT}" stroke="#ccc" stroke-dasharray="2"/>`
	}

	svg += "</svg>"
	return svg
}
