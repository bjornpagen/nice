import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { theme } from "@/lib/widgets/utils/theme"
import { buildTicks } from "@/lib/widgets/utils/ticks"
import { selectAxisLabels } from "@/lib/widgets/utils/layout"

const SecondaryPoint = z
	.object({
		value: z
			.number()
			.describe("Position of this point on the number line (e.g., 3.5, -2, 0, 7). Must be within bounds."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for this point (e.g., 'A', 'Start', 'π', '√2', null). Null shows dot without label. Plaintext only; no markdown or HTML."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"Hex-only color for the point dot and its label (e.g., '#FF6B6B', '#1E90FF', '#00000080' for 50% alpha). Makes important points stand out."
			),
		labelPosition: z
			.enum(["above", "below", "left", "right"])
			.describe(
				"Where to place the label relative to the point. For horizontal: use 'above'/'below'. For vertical: use 'left'/'right'."
			)
	})
	.strict()

const PrimaryLabels = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("filtered").describe("Show labels only at specified tick positions"),
		values: z
			.array(z.number())
			.describe("Array of tick positions to label (e.g., [-2, 0, 2]). Values must be within bounds and on the tick grid.")
	}),
	z.object({
		type: z.literal("unfiltered").describe("Show default labels at all tick positions with smart overlap prevention")
	})
])

const SecondaryLabels = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("labeled").describe("Show custom point markers with labels"),
		points: z
			.array(SecondaryPoint)
			.describe("Array of special points to highlight. Each can have custom color and optional label.")
	}),
	z.object({
		type: z.literal("unlabeled").describe("No special point markers")
	})
])

export const NumberLinePropsSchema = z
	.object({
		type: z.literal("numberLine").describe("Identifies this as a general-purpose number line widget."),
		width: z
			.number()
			.positive()
			.describe(
				"For horizontal: total width in pixels (e.g., 600, 700, 500). For vertical: the narrower dimension (e.g., 100, 150)."
			),
		height: z
			.number()
			.positive()
			.describe(
				"For horizontal: total height in pixels (e.g., 100, 150, 120). For vertical: the longer dimension (e.g., 400, 500)."
			),
		orientation: z
			.enum(["horizontal", "vertical"])
			.describe("Direction of the number line. 'horizontal' goes left-to-right, 'vertical' goes bottom-to-top."),
		bounds: z
			.object({
				lower: z.number().describe("Minimum value shown on the number line (e.g., -10, 0, -5, -100). Left end for horizontal, bottom for vertical."),
				upper: z.number().describe("Maximum value shown on the number line (e.g., 10, 100, 20, 5). Right end for horizontal, top for vertical.")
			})
			.refine((bounds) => bounds.lower < bounds.upper, "Lower bound must be less than upper bound"),
		interval: z
			.number()
			.positive()
			.describe(
				"Spacing between tick marks (e.g., 1, 5, 10, 0.5, 0.1, 1/3≈0.333). Determines where all tick marks appear. Use decimals for fractions: 1/3≈0.333, 1/6≈0.167, π/2≈1.571."
			),
		primaryLabels: PrimaryLabels.describe(
			"Controls which tick positions show numeric labels. 'filtered' shows labels only at specified positions. 'unfiltered' shows automatic labels with smart spacing."
		),
		secondaryLabels: SecondaryLabels.describe(
			"Controls special point markers on the number line. 'labeled' adds custom colored dots with optional text. 'unlabeled' shows no special markers."
		)
	})
	.strict()
	.describe(
		"Creates a precise number line with flexible labeling control. The interval determines all tick positions, primaryLabels controls which ticks get numeric labels, and secondaryLabels adds special colored markers. Perfect for teaching number concepts, comparisons, and mathematical relationships."
	)

export type NumberLineProps = z.infer<typeof NumberLinePropsSchema>

/**
 * This is a highly versatile template designed to generate a precise and customizable
 * number line as an SVG graphic. It can be rendered horizontally (for general number
 * comparisons) or vertically (often used for temperature, elevation, or financial contexts).
 */
export const generateNumberLine: WidgetGenerator<typeof NumberLinePropsSchema> = (data) => {
	const { width, height, orientation, bounds, interval, primaryLabels, secondaryLabels } = data
	const { lower: min, upper: max } = bounds
	const isHorizontal = orientation === "horizontal"
	const lineLength = (isHorizontal ? width : height) - 2 * PADDING

	if (min >= max || lineLength <= 0) return `<svg width="${width}" height="${height}"></svg>`
	const scale = lineLength / (max - min)

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	if (isHorizontal) {
		const yPos = height / 2
		const toSvgX = (val: number) => PADDING + (val - min) * scale

		// Draw the main line using Canvas API
		canvas.drawLine(PADDING, yPos, width - PADDING, yPos, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thick
		})
		
		// Generate tick positions based on interval
		const { values, labels: tickLabels } = buildTicks(min, max, interval)
		const tickPositions = values.map(toSvgX)
		
		// Handle primary labels (tick labeling)
		let selectedLabels: Set<number>
		if (primaryLabels.type === "filtered") {
			// Only show labels at specified positions
			const filteredPositions = new Set(primaryLabels.values)
			selectedLabels = new Set()
			values.forEach((tickValue, index) => {
				if (filteredPositions.has(tickValue)) {
					selectedLabels.add(index)
				}
			})
		} else {
			// Show all labels with smart overlap prevention
			selectedLabels = selectAxisLabels({
				labels: tickLabels,
				positions: tickPositions,
				axisLengthPx: lineLength,
				orientation: "horizontal",
				fontPx: theme.font.size.small,
				minGapPx: 8
			})
		}

		// Draw ticks and labels
		values.forEach((t, i) => {
			const x = toSvgX(t)
			// Draw tick mark
			canvas.drawLine(x, yPos - 5, x, yPos + 5, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})

			// Draw label if selected
			if (selectedLabels.has(i)) {
				canvas.drawText({ 
					x, 
					y: yPos + 20, 
					text: tickLabels[i]!, 
					anchor: "middle", 
					fill: theme.colors.axis, 
					fontPx: theme.font.size.small 
				})
			}
		})
		// Draw secondary labels (special point markers)
		if (secondaryLabels.type === "labeled") {
			for (const p of secondaryLabels.points) {
				const cx = toSvgX(p.value)
				let labelX = cx
				let labelY = yPos
				let anchor: "start" | "middle" | "end" = "middle"
				switch (p.labelPosition) {
					case "above":
						labelY -= 15
						break
					case "below":
						labelY += 15
						break
					case "left":
						labelX -= 8
						anchor = "end"
						break
					case "right":
						labelX += 8
						anchor = "start"
						break
					default:
						labelY -= 15 // default to above
				}
				canvas.drawCircle(cx, yPos, theme.geometry.pointRadius.large, {
					fill: p.color,
					stroke: theme.colors.axis,
					strokeWidth: theme.stroke.width.thin
				})
				if (p.label) {
					canvas.drawText({
						x: labelX,
						y: labelY,
						text: p.label,
						anchor,
						dominantBaseline: "middle",
						fill: theme.colors.axisLabel
					})
				}
			}
		}
	} else {
		// Vertical
		const xPos = width / 2
		const toSvgY = (val: number) => height - PADDING - (val - min) * scale

		// Draw the main vertical line using Canvas API
		canvas.drawLine(xPos, PADDING, xPos, height - PADDING, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thick
		})
		
		// Generate tick positions based on interval
		const { values, labels: tickLabels } = buildTicks(min, max, interval)
		const tickPositions = values.map(toSvgY)
		
		// Handle primary labels (tick labeling)
		let selectedLabels: Set<number>
		if (primaryLabels.type === "filtered") {
			// Only show labels at specified positions
			const filteredPositions = new Set(primaryLabels.values)
			selectedLabels = new Set()
			values.forEach((tickValue, index) => {
				if (filteredPositions.has(tickValue)) {
					selectedLabels.add(index)
				}
			})
		} else {
			// Show all labels with smart overlap prevention
			selectedLabels = selectAxisLabels({
				labels: tickLabels,
				positions: tickPositions,
				axisLengthPx: lineLength,
				orientation: "vertical",
				fontPx: theme.font.size.small,
				minGapPx: 12
			})
		}

		// Draw ticks and labels
		values.forEach((t, i) => {
			const y = toSvgY(t)
			// Draw tick mark
			canvas.drawLine(xPos - 5, y, xPos + 5, y, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})

			// Draw label if selected
			const labelX = xPos - 10
			if (selectedLabels.has(i)) {
				canvas.drawText({ 
					x: labelX, 
					y: y + 4, 
					text: tickLabels[i]!, 
					anchor: "end", 
					fill: theme.colors.axis, 
					fontPx: theme.font.size.small 
				})
			}
		})
		// Draw secondary labels (special point markers)
		if (secondaryLabels.type === "labeled") {
			for (const p of secondaryLabels.points) {
				const cy = toSvgY(p.value)
				let labelX = xPos
				let labelY = cy
				let anchor: "start" | "middle" | "end" = "middle"
				switch (p.labelPosition) {
					case "left":
						labelX -= 15
						anchor = "end"
						break
					case "right":
						labelX += 15
						anchor = "start"
						break
					default:
						labelX += 15
						anchor = "start" // default to right
				}
				canvas.drawCircle(xPos, cy, theme.geometry.pointRadius.large, {
					fill: p.color,
					stroke: theme.colors.axis,
					strokeWidth: theme.stroke.width.thin
				})
				if (p.label) {
					canvas.drawText({
						x: labelX,
						y: labelY,
						text: p.label,
						anchor,
						dominantBaseline: "middle",
						fill: theme.colors.axisLabel
					})
				}
			}
		}
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="12">${svgBody}</svg>`
}
