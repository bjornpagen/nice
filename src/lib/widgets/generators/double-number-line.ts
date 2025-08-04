import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrMismatchedTickCounts = errors.new("top and bottom lines must have the same number of ticks")

// Defines one of the two number lines in the diagram
const LineSchema = z.object({
	label: z.string().describe('The text label for this quantity (e.g., "Time (seconds)").'),
	ticks: z
		.array(z.union([z.string(), z.number()]))
		.describe("An array of values to label the tick marks in order from left to right.")
})

// The main Zod schema for the doubleNumberLine function
export const DoubleNumberLinePropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 150)
			.describe("The total height of the output SVG container in pixels."),
		topLine: LineSchema.describe("Configuration for the upper number line."),
		bottomLine: LineSchema.describe(
			"Configuration for the lower number line. Must have the same number of ticks as the top line."
		)
	})
	.describe(
		'This template generates a double number line diagram as a clear and accurate SVG graphic. This visualization tool is excellent for illustrating the relationship between two different quantities that share a constant ratio. The generator will render two parallel horizontal lines, one above the other. Each line represents a different quantity and will have a text label (e.g., "Time (minutes)", "Items"). Both lines are marked with a configurable number of equally spaced tick marks. The core of the template is the array of corresponding values for the tick marks on each line. For example, the top line might have values [0, 1, 2, 3, 4] while the bottom line has [0, 50, 100, 150, 200]. The generator will place these labels at the correct tick marks, visually aligning the proportional pairs. Some labels can be omitted to create "fill-in-the-blank" style questions where the student must deduce the missing value. The resulting SVG is a powerful visual aid for solving ratio problems.'
	)

export type DoubleNumberLineProps = z.infer<typeof DoubleNumberLinePropsSchema>

/**
 * This template generates a double number line diagram as a clear and accurate SVG graphic.
 * This visualization tool is excellent for illustrating the relationship between two
 * different quantities that share a constant ratio.
 */
export const generateDoubleNumberLine: WidgetGenerator<typeof DoubleNumberLinePropsSchema> = (data) => {
	const { width, height, topLine, bottomLine } = data
	const padding = { horizontal: 20, vertical: 40 }
	const lineLength = width - 2 * padding.horizontal
	const topY = padding.vertical
	const bottomY = height - padding.vertical

	if (topLine.ticks.length !== bottomLine.ticks.length) {
		throw errors.wrap(
			ErrMismatchedTickCounts,
			`top line has ${topLine.ticks.length} ticks, bottom line has ${bottomLine.ticks.length} ticks`
		)
	}

	const numTicks = topLine.ticks.length
	if (numTicks < 2) {
		return `<svg width="${width}" height="${height}"></svg>` // Not enough ticks to draw a line
	}

	const tickSpacing = lineLength / (numTicks - 1)

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg += "<style>.line-label { font-size: 14px; font-weight: bold; text-anchor: middle; }</style>"

	// Top line
	svg += `<line x1="${padding.horizontal}" y1="${topY}" x2="${width - padding.horizontal}" y2="${topY}" stroke="#333333"/>`
	svg += `<text x="${width / 2}" y="${topY - 20}" class="line-label">${topLine.label}</text>`
	topLine.ticks.forEach((t, i) => {
		const x = padding.horizontal + i * tickSpacing
		svg += `<line x1="${x}" y1="${topY - 5}" x2="${x}" y2="${topY + 5}" stroke="#333333"/>`
		svg += `<text x="${x}" y="${topY + 20}" fill="#333333" text-anchor="middle">${t}</text>`
	})

	// Bottom line
	svg += `<line x1="${padding.horizontal}" y1="${bottomY}" x2="${width - padding.horizontal}" y2="${bottomY}" stroke="#333333"/>`
	svg += `<text x="${width / 2}" y="${bottomY + 30}" class="line-label">${bottomLine.label}</text>`
	bottomLine.ticks.forEach((t, i) => {
		const x = padding.horizontal + i * tickSpacing
		svg += `<line x1="${x}" y1="${bottomY - 5}" x2="${x}" y2="${bottomY + 5}" stroke="#333333"/>`
		svg += `<text x="${x}" y="${bottomY - 15}" fill="#333333" text-anchor="middle">${t}</text>`
	})

	// Alignment lines (optional, but good for clarity)
	for (let i = 0; i < numTicks; i++) {
		const x = padding.horizontal + i * tickSpacing
		svg += `<line x1="${x}" y1="${topY + 5}" x2="${x}" y2="${bottomY - 5}" stroke="#ccc" stroke-dasharray="2"/>`
	}

	svg += "</svg>"
	return svg
}
