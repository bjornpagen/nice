import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { theme } from "@/lib/widgets/utils/theme"

const Tick = z
	.object({
		value: z
			.number()
			.describe("Position of this tick mark on the number line (e.g., 0, 0.5, 1, 1.5). Must be between min and max."),
		label: z
			.string()
			.describe("Text label for this tick (e.g., '0', '1/2', '1', '1 1/2'). To show no label, use an empty string."),
		isMajor: z
			.boolean()
			.describe(
				"Whether this is a major tick (longer line) or minor tick (shorter line). Major ticks typically mark whole numbers."
			)
	})
	.strict()

const Segment = z
	.object({
		start: z
			.number()
			.describe("Starting position of this grouped segment (e.g., 0, 0.5, 1). Must be >= min and < end."),
		end: z
			.number()
			.describe("Ending position of this grouped segment (e.g., 0.5, 1, 1.5). Must be <= max and > start."),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS fill color for this segment's bar (e.g., '#FFE5B4' for peach, 'lightblue', 'rgba(255,0,0,0.3)'). Different colors distinguish groups."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for this segment (e.g., '1/2', 'Group A', '0.5', null). Positioned above the segment. Null shows no label. Can indicate the fraction size or group name."
			)
	})
	.strict()

export const NumberLineWithFractionGroupsPropsSchema = z
	.object({
		type: z
			.literal("numberLineWithFractionGroups")
			.describe("Identifies this as a number line with fraction groups showing repeated segments."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the number line in pixels (e.g., 700, 800, 600). Must accommodate all segments and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the widget in pixels (e.g., 150, 200, 180). Includes number line and stacked segment bars."
			),
		min: z
			.number()
			.describe("Minimum value shown on the number line (e.g., 0, -1, -0.5). Typically 0 for fraction work."),
		max: z
			.number()
			.describe("Maximum value shown on the number line (e.g., 3, 5, 2). Should accommodate all segments."),
		ticks: z
			.array(Tick)
			.describe(
				"All tick marks with their labels. Can show fractions, decimals, or mixed numbers. Order doesn't matter. Empty array shows no ticks."
			),
		segments: z
			.array(Segment)
			.describe(
				"Colored bars above the number line showing grouped segments. Useful for division by fractions (e.g., how many 1/2s in 2?). Segments can overlap with staggered display."
			)
	})
	.strict()
	.describe(
		"Creates a number line with colored segment groups above it, perfect for visualizing division by fractions and repeated addition of fractional amounts. Shows how many groups of a given size fit within a range. Essential for fraction division concepts like 'how many 1/3s are in 2?' or skip counting by fractions."
	)

export type NumberLineWithFractionGroupsProps = z.infer<typeof NumberLineWithFractionGroupsPropsSchema>

/**
 * This template generates a highly illustrative number line as an SVG graphic,
 * specifically designed to build conceptual understanding of fraction division.
 * It visually answers the question, "How many groups of a certain fraction fit into a whole number?"
 */
export const generateNumberLineWithFractionGroups: WidgetGenerator<typeof NumberLineWithFractionGroupsPropsSchema> = (
	data
) => {
	const { width, height, min, max, ticks, segments } = data
	const padding = { horizontal: PADDING, vertical: 40 }
	const chartWidth = width - 2 * padding.horizontal
	const yPos = height / 2

	if (min >= max) return `<svg width="${width}" height="${height}"></svg>`
	const scale = chartWidth / (max - min)
	const toSvgX = (val: number) => padding.horizontal + (val - min) * scale

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	canvas.drawLine(padding.horizontal, yPos, width - padding.horizontal, yPos, {
		stroke: theme.colors.axis,
		strokeWidth: theme.stroke.width.base
	})

	for (const t of ticks) {
		const x = toSvgX(t.value)
		const tickHeight = t.isMajor ? 8 : 4
		canvas.drawLine(x, yPos - tickHeight, x, yPos + tickHeight, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.base
		})
		if (t.label !== "") {
			canvas.drawText({
				x: x,
				y: yPos + 25,
				text: t.label,
				fill: theme.colors.axisLabel,
				anchor: "middle"
			})
		}
	}

	// Segments
	segments.forEach((s, i) => {
		const startPos = toSvgX(s.start)
		const endPos = toSvgX(s.end)
		const segmentWidth = endPos - startPos
		const segmentHeight = 20
		// Stagger segments vertically to avoid overlap if needed
		const segmentY = yPos - segmentHeight / 2 - (i % 2) * (segmentHeight + 2)

		canvas.drawRect(startPos, segmentY, segmentWidth, segmentHeight, {
			fill: s.color,
			fillOpacity: theme.opacity.overlay,
			stroke: theme.colors.axis,
			strokeWidth: 0.5
		})

		if (s.label !== null) {
			const textColor = theme.colors.white // Assuming dark segment colors
			const textX = startPos + segmentWidth / 2
			canvas.drawText({
				x: textX,
				y: segmentY + segmentHeight / 2,
				text: s.label,
				fill: textColor,
				anchor: "middle",
				dominantBaseline: "middle",
				fontWeight: theme.font.weight.bold
			})
		}
	})

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
