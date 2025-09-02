import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { theme } from "@/lib/widgets/utils/theme"

const Point = z
	.object({
		value: z
			.number()
			.describe("Position of this point on the number line (e.g., 3.5, -2, 0, 7). Must be within min/max range."),
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

const SpecialTick = z
	.object({
		value: z
			.number()
			.describe(
				"Position where this special tick appears (e.g., 3.14159, 1.414, 2.5). Overrides default tick label at this position."
			),
		label: z
			.string()
			.describe("Custom label for this tick position (e.g., 'π', '√2', '2½', 'e'). Replaces the numeric label.")
	})
	.strict()

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
		min: z
			.number()
			.describe(
				"Minimum value shown on the number line (e.g., -10, 0, -5, -100). Left end for horizontal, bottom for vertical."
			),
		max: z
			.number()
			.describe(
				"Maximum value shown on the number line (e.g., 10, 100, 20, 5). Right end for horizontal, top for vertical."
			),
		majorTickInterval: z
			.number()
			.positive()
			.describe(
				"Spacing between major (labeled) tick marks (e.g., 1, 5, 10, 0.5). Should evenly divide (max - min) for best appearance."
			),
		minorTicksPerInterval: z
			.number()
			.int()
			.min(0)
			.describe(
				"Number of minor ticks between each pair of major ticks (e.g., 4 for fifths, 9 for tenths, 1 for halves, 0 for none)."
			),
		points: z
			.array(Point)
			.describe(
				"Special points to highlight on the number line. Empty array means no highlighted points. Each can have custom color and optional label."
			),
		specialTickLabels: z
			.array(SpecialTick)
			.describe(
				"Override default numeric labels at specific positions. Empty array uses all default labels. Perfect for π, e, √2, or fractions."
			)
	})
	.strict()
	.describe(
		"Creates a versatile number line with customizable orientation, tick marks, special points, and labels. Supports both horizontal and vertical layouts, minor tick subdivisions, and custom labeling for special values. Essential building block for teaching number concepts, ordering, and measurement."
	)

export type NumberLineProps = z.infer<typeof NumberLinePropsSchema>

/**
 * This is a highly versatile template designed to generate a precise and customizable
 * number line as an SVG graphic. It can be rendered horizontally (for general number
 * comparisons) or vertically (often used for temperature, elevation, or financial contexts).
 */
export const generateNumberLine: WidgetGenerator<typeof NumberLinePropsSchema> = (data) => {
	const { width, height, orientation, min, max, majorTickInterval, minorTicksPerInterval, points, specialTickLabels } =
		data
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
		const minorTickSpacing = (majorTickInterval / (minorTicksPerInterval + 1)) * scale
		for (let t = min; t <= max; t += majorTickInterval) {
			const x = toSvgX(t)
			// Canvas automatically tracks extents
			canvas.drawLine(x, yPos - 8, x, yPos + 8, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})
			if (!specialTickLabels.some((stl) => stl.value === t)) {
				canvas.drawText({ x, y: yPos + 25, text: String(t), anchor: "middle", fill: theme.colors.axisLabel })
			}
			for (let m = 1; m <= minorTicksPerInterval; m++) {
				const mPos = x + m * minorTickSpacing
				if (mPos < width - PADDING)
					canvas.drawLine(mPos, yPos - 4, mPos, yPos + 4, {
						stroke: theme.colors.axis,
						strokeWidth: theme.stroke.width.thin
					})
			}
		}
		// Special Labels
		for (const s of specialTickLabels) {
			if (s.label !== "") {
				const x = toSvgX(s.value)
				canvas.drawText({
					x,
					y: yPos + 25,
					text: s.label,
					anchor: "middle",
					fill: theme.colors.axisLabel,
					fontWeight: theme.font.weight.bold
				})
			}
		}
		for (const p of points) {
			const cx = toSvgX(p.value)
			// Canvas automatically tracks extents
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
	} else {
		// Vertical
		const xPos = width / 2
		const toSvgY = (val: number) => height - PADDING - (val - min) * scale

		// Draw the main vertical line using Canvas API
		canvas.drawLine(xPos, PADDING, xPos, height - PADDING, {
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.base
		})
		const minorTickSpacing = (majorTickInterval / (minorTicksPerInterval + 1)) * scale
		for (let t = min; t <= max; t += majorTickInterval) {
			const y = toSvgY(t)
			canvas.drawLine(xPos - 8, y, xPos + 8, y, {
				stroke: theme.colors.axis,
				strokeWidth: theme.stroke.width.base
			})
			if (!specialTickLabels.some((stl) => stl.value === t)) {
				const labelX = xPos - 15
				canvas.drawText({ x: labelX, y: y + 4, text: String(t), anchor: "end", fill: theme.colors.axisLabel })
			}
			for (let m = 1; m <= minorTicksPerInterval; m++) {
				const mPos = y - m * minorTickSpacing
				if (mPos > PADDING)
					canvas.drawLine(xPos - 4, mPos, xPos + 4, mPos, {
						stroke: theme.colors.axis,
						strokeWidth: theme.stroke.width.thin
					})
			}
		}
		// Special Labels
		for (const s of specialTickLabels) {
			if (s.label !== "") {
				const labelX = xPos - 15
				canvas.drawText({
					x: labelX,
					y: toSvgY(s.value) + 4,
					text: s.label,
					anchor: "end",
					fill: theme.colors.axisLabel,
					fontWeight: theme.font.weight.bold
				})
			}
		}
		for (const p of points) {
			const cy = toSvgY(p.value)
			// Canvas automatically tracks extents
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

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="12">${svgBody}</svg>`
}
