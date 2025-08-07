import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single tick mark with optional labels above and below the line.
const TickMarkSchema = z
	.object({
		value: z.number().describe("The numerical position of the tick mark on the axis."),
		topLabel: z.string().nullable().describe('An optional label to display above the tick mark (e.g., "3/8").'),
		bottomLabel: z.string().nullable().describe('An optional label to display below the tick mark (e.g., "0", "1").'),
		isMajor: z
			.boolean()
			.describe("If true, the tick mark is rendered taller to indicate significance (e.g., for whole numbers).")
	})
	.strict()

// Defines a colored segment to be drawn directly on the number line axis.
const NumberLineSegmentSchema = z
	.object({
		start: z.number().describe("The numerical starting value of the segment."),
		end: z.number().describe("The numerical ending value of the segment."),
		color: z.string().describe("A CSS color for the segment's fill (e.g., '#11accd', 'orange').")
	})
	.strict()

// Defines a colored group of cells within the fraction model bar.
const ModelCellGroupSchema = z
	.object({
		count: z.number().int().positive().describe("The number of cells in this group."),
		color: z.string().describe("The CSS fill color for this group of cells.")
	})
	.strict()

// Defines the fraction model bar that is displayed above the number line.
const FractionModelSchema = z
	.object({
		totalCells: z.number().int().positive().describe("The total number of cells to draw in the bar."),
		cellGroups: z
			.array(ModelCellGroupSchema)
			.describe("An array of colored cell groups that will be rendered sequentially to fill the bar."),
		bracketLabel: z
			.string()
			.nullable()
			.describe("An optional text label to display above a bracket spanning the model.")
	})
	.strict()

// The main Zod schema for the fractionNumberLine function
export const FractionNumberLinePropsSchema = z
	.object({
		type: z.literal("fractionNumberLine"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 500)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200)
			.describe("The total height of the output SVG container in pixels."),
		min: z.number().describe("The minimum value displayed on the number line."),
		max: z.number().describe("The maximum value displayed on the number line."),
		ticks: z.array(TickMarkSchema).describe("An array of all tick marks to be rendered on the axis."),
		segments: z
			.array(NumberLineSegmentSchema)
			.nullable()
			.describe("An optional array of colored segments to overlay directly on the number line axis."),
		model: FractionModelSchema.nullable().describe(
			"An optional visual model composed of colored cells, rendered above the number line."
		)
	})
	.strict()
	.describe(
		'Generates a highly illustrative number line designed to build conceptual understanding of fractions. It renders a number line with customizable fractional ticks and can overlay colored segments to show groups. Crucially, it can also display a separate "fraction model" bar above the number line, composed of colored cells that correspond to the segments, providing a clear, cell-based representation of the part-to-whole relationships.'
	)

export type FractionNumberLineProps = z.infer<typeof FractionNumberLinePropsSchema>

/**
 * Generates an SVG diagram of a number line with features specifically designed
 * for visualizing fraction concepts, including an optional cell-based model.
 */
export const generateFractionNumberLine: WidgetGenerator<typeof FractionNumberLinePropsSchema> = (props) => {
	const { width, height, min, max, ticks, segments, model } = props

	const padding = { top: 80, right: 20, bottom: 40, left: 20 }
	const chartWidth = width - padding.left - padding.right
	const yPosAxis = height - padding.bottom - 20

	if (min >= max || chartWidth <= 0) {
		return `<svg width="${width}" height="${height}" />`
	}

	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => padding.left + (val - min) * scale

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.label-top { font-size: 11px; } .label-bottom { font-weight: bold; } .model-label { font-size: 13px; font-weight: bold; }</style>"

	// 1. Draw Axis Line
	svg += `<line x1="${padding.left}" y1="${yPosAxis}" x2="${width - padding.right}" y2="${yPosAxis}" stroke="black" stroke-width="1.5"/>`

	// 2. Draw Ticks and Labels
	for (const tick of ticks) {
		const x = toSvgX(tick.value)
		const tickHeight = tick.isMajor ? 8 : 4
		svg += `<line x1="${x}" y1="${yPosAxis - tickHeight}" x2="${x}" y2="${yPosAxis + tickHeight}" stroke="black" stroke-width="1.5"/>`
		if (tick.topLabel) {
			svg += `<text x="${x}" y="${yPosAxis - 15}" class="label-top" text-anchor="middle">${tick.topLabel}</text>`
		}
		if (tick.bottomLabel) {
			svg += `<text x="${x}" y="${yPosAxis + 25}" class="label-bottom" text-anchor="middle">${tick.bottomLabel}</text>`
		}
	}

	// 3. Draw On-Axis Segments
	if (segments) {
		for (const segment of segments) {
			const startX = toSvgX(segment.start)
			const endX = toSvgX(segment.end)
			svg += `<line x1="${startX}" y1="${yPosAxis}" x2="${endX}" y2="${yPosAxis}" stroke="${segment.color}" stroke-width="5"/>`
		}
	}

	// 4. Draw Fraction Model Bar
	if (model) {
		const modelY = padding.top - 20
		const modelHeight = 36
		const cellWidth = chartWidth / model.totalCells
		let currentX = padding.left
		let cellCounter = 0

		// Render cell fills first based on groups
		for (const group of model.cellGroups) {
			for (let i = 0; i < group.count; i++) {
				const cellX = padding.left + cellCounter * cellWidth
				svg += `<rect x="${cellX}" y="${modelY}" width="${cellWidth}" height="${modelHeight}" fill="${group.color}" fill-opacity="0.3"/>`
				cellCounter++
			}
		}

		// Render cell borders on top for a clean look
		for (let i = 0; i < model.totalCells; i++) {
			svg += `<rect x="${currentX}" y="${modelY}" width="${cellWidth}" height="${modelHeight}" fill="none" stroke="black" stroke-width="2"/>`
			currentX += cellWidth
		}

		// Render Bracket and Label
		if (model.bracketLabel) {
			const bracketY = modelY - 15
			const bracketStartX = padding.left
			const bracketEndX = padding.left + chartWidth
			svg += `<line x1="${bracketStartX}" y1="${bracketY + 5}" x2="${bracketStartX}" y2="${bracketY - 5}" stroke="black"/>`
			svg += `<line x1="${bracketStartX}" y1="${bracketY}" x2="${bracketEndX}" y2="${bracketY}" stroke="black"/>`
			svg += `<line x1="${bracketEndX}" y1="${bracketY + 5}" x2="${bracketEndX}" y2="${bracketY - 5}" stroke="black"/>`
			svg += `<text x="${width / 2}" y="${bracketY - 8}" class="model-label" text-anchor="middle">${model.bracketLabel}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
