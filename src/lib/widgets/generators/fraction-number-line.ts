import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

const Tick = z
	.object({
		value: z
			.number()
			.describe(
				"The numerical position of this tick mark on the number line (e.g., 0, 0.5, 1.5, 2.25, -0.75). Must be between min and max."
			),
		topLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Label displayed above the tick mark (e.g., '0', '1/2', '1 1/2', '2.25', null). Null shows no top label. Often shows fractions."
			),
		bottomLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Label displayed below the tick mark (e.g., '0', '2/4', '6/4', null). Null shows no bottom label. Often shows equivalent fractions."
			),
		isMajor: z
			.boolean()
			.describe(
				"Whether this is a major tick (taller line) or minor tick (shorter line). Major ticks typically mark whole numbers or key fractions."
			)
	})
	.strict()

const Segment = z
	.object({
		start: z
			.number()
			.describe(
				"Starting position of the colored segment on the number line (e.g., 0, 0.5, 1). Must be >= min and <= end."
			),
		end: z
			.number()
			.describe(
				"Ending position of the colored segment on the number line (e.g., 1, 1.5, 2.75). Must be <= max and >= start."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS fill color for this segment (e.g., '#FFE5B4' for peach, 'rgba(0,255,0,0.5)' for translucent green, 'lightblue'). Creates visual groupings."
			)
	})
	.strict()

const ModelCellGroup = z
	.object({
		count: z
			.number()
			.int()
			.positive()
			.describe(
				"Number of consecutive cells in this group (e.g., 3, 5, 1). Must be positive. Sum of all counts equals totalCells."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS fill color for cells in this group (e.g., '#FF6B6B' for red, 'lightgreen', 'rgba(0,0,255,0.7)'). Differentiates cell groups visually."
			)
	})
	.strict()

const Model = z
	.object({
		totalCells: z
			.number()
			.int()
			.positive()
			.describe(
				"Total number of cells in the visual bar model (e.g., 8 for eighths, 10 for tenths, 12 for twelfths). Determines cell width."
			),
		cellGroups: z
			.array(ModelCellGroup)
			.describe(
				"Groups of colored cells shown in order left to right. Sum of all group counts must equal totalCells. Can show part-whole relationships."
			),
		bracketLabel: z
			.string()
			.describe(
				"Label for the bracket spanning the entire model (e.g., '1 whole', '2 units', '24 hours'). Indicates what the full bar represents."
			)
	})
	.strict()

export const FractionNumberLinePropsSchema = z
	.object({
		type: z
			.literal("fractionNumberLine")
			.describe("Identifies this as a fraction number line widget with optional visual models."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the number line in pixels (e.g., 600, 700, 800). Must accommodate all labels and optional model bar."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the widget in pixels (e.g., 150, 200, 250). Includes number line, labels, segments, and optional model."
			),
		min: z
			.number()
			.describe(
				"Minimum value shown on the number line (e.g., 0, -1, -2.5). Must be less than max. Left endpoint of the line."
			),
		max: z
			.number()
			.describe(
				"Maximum value shown on the number line (e.g., 3, 5, 10.5). Must be greater than min. Right endpoint of the line."
			),
		ticks: z
			.array(Tick)
			.describe(
				"All tick marks to display with their labels. Order doesn't matter. Can show fractions, decimals, or mixed numbers. Empty array shows no ticks."
			),
		segments: z
			.array(Segment)
			.describe(
				"Colored horizontal bars above the number line highlighting ranges. Empty array shows no segments. Useful for showing intervals or equivalent lengths."
			),
		model: Model.nullable()
			.transform((val) => val ?? null)
			.describe(
				"Optional visual bar divided into cells below the number line. Shows part-whole relationships and fraction concepts. Cells align with the number line scale. Null means no model."
			)
	})
	.strict()
	.describe(
		"Creates a number line optimized for fraction instruction with customizable tick marks, colored segments, and an optional cell-based visual model. Supports showing equivalent fractions, mixed numbers, and part-whole relationships. The model bar helps visualize fractions as parts of a whole."
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
		if (tick.topLabel !== null) {
			svg += `<text x="${x}" y="${yPosAxis - 15}" class="label-top" text-anchor="middle">${tick.topLabel}</text>`
		}
		if (tick.bottomLabel !== null) {
			svg += `<text x="${x}" y="${yPosAxis + 25}" class="label-bottom" text-anchor="middle">${tick.bottomLabel}</text>`
		}
	}

	// 3. Draw On-Axis Segments
	if (segments.length > 0) {
		for (const segment of segments) {
			const startX = toSvgX(segment.start)
			const endX = toSvgX(segment.end)
			svg += `<line x1="${startX}" y1="${yPosAxis}" x2="${endX}" y2="${yPosAxis}" stroke="${segment.color}" stroke-width="5"/>`
		}
	}

	// 4. Draw Fraction Model Bar
	if (model !== null) {
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
		if (model.bracketLabel !== "") {
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
