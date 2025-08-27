import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

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
			.describe(
				"Custom label for this tick position (e.g., 'π', '√2', '2½', 'e'). Replaces the numeric label."
			)
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
	const padding = 40
	const lineLength = (isHorizontal ? width : height) - 2 * padding

	if (min >= max || lineLength <= 0) return `<svg width="${width}" height="${height}"></svg>`
	const scale = lineLength / (max - min)

	const ext = initExtents(width)
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	if (isHorizontal) {
		const yPos = height / 2
		const toSvgX = (val: number) => padding + (val - min) * scale
		
		// Track the main line endpoints
		includePointX(ext, padding)
		includePointX(ext, width - padding)
		
		svg += `<line x1="${padding}" y1="${yPos}" x2="${width - padding}" y2="${yPos}" stroke="black"/>`
		const minorTickSpacing = (majorTickInterval / (minorTicksPerInterval + 1)) * scale
		for (let t = min; t <= max; t += majorTickInterval) {
			const x = toSvgX(t)
			includePointX(ext, x)
			svg += `<line x1="${x}" y1="${yPos - 8}" x2="${x}" y2="${yPos + 8}" stroke="black"/>`
			if (!specialTickLabels.some((stl) => stl.value === t)) {
				svg += `<text x="${x}" y="${yPos + 25}" fill="black" text-anchor="middle">${t}</text>`
				includeText(ext, x, String(t), "middle", 7)
			}
			for (let m = 1; m <= minorTicksPerInterval; m++) {
				const mPos = x + m * minorTickSpacing
				if (mPos < width - padding)
					svg += `<line x1="${mPos}" y1="${yPos - 4}" x2="${mPos}" y2="${yPos + 4}" stroke="black"/>`
			}
		}
		// Special Labels
		for (const s of specialTickLabels) {
			if (s.label !== "") {
				const x = toSvgX(s.value)
				svg += `<text x="${x}" y="${yPos + 25}" fill="black" text-anchor="middle" font-weight="bold">${s.label}</text>`
				includeText(ext, x, s.label, "middle", 7)
			}
		}
		for (const p of points) {
			const cx = toSvgX(p.value)
			includePointX(ext, cx)
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
			svg += `<circle cx="${cx}" cy="${yPos}" r="5" fill="${p.color}" stroke="black" stroke-width="1"/>`
			if (p.label) {
				svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="${anchor}" dominant-baseline="middle">${p.label}</text>`
				includeText(ext, labelX, p.label, anchor, 7)
			}
		}
	} else {
		// Vertical
		const xPos = width / 2
		const toSvgY = (val: number) => height - padding - (val - min) * scale
		
		// Track the vertical line
		includePointX(ext, xPos)
		
		svg += `<line x1="${xPos}" y1="${padding}" x2="${xPos}" y2="${height - padding}" stroke="black"/>`
		const minorTickSpacing = (majorTickInterval / (minorTicksPerInterval + 1)) * scale
		for (let t = min; t <= max; t += majorTickInterval) {
			const y = toSvgY(t)
			svg += `<line x1="${xPos - 8}" y1="${y}" x2="${xPos + 8}" y2="${y}" stroke="black"/>`
			if (!specialTickLabels.some((stl) => stl.value === t)) {
				const labelX = xPos - 15
				svg += `<text x="${labelX}" y="${y + 4}" fill="black" text-anchor="end">${t}</text>`
				includeText(ext, labelX, String(t), "end", 7)
			}
			for (let m = 1; m <= minorTicksPerInterval; m++) {
				const mPos = y - m * minorTickSpacing
				if (mPos > padding) svg += `<line x1="${xPos - 4}" y1="${mPos}" x2="${xPos + 4}" y2="${mPos}" stroke="black"/>`
			}
		}
		// Special Labels
		for (const s of specialTickLabels) {
			if (s.label !== "") {
				const labelX = xPos - 15
				svg += `<text x="${labelX}" y="${toSvgY(s.value) + 4}" fill="black" text-anchor="end" font-weight="bold">${s.label}</text>`
				includeText(ext, labelX, s.label, "end", 7)
			}
		}
		for (const p of points) {
			const cy = toSvgY(p.value)
			includePointX(ext, xPos)
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
			svg += `<circle cx="${xPos}" cy="${cy}" r="5" fill="${p.color}" stroke="black" stroke-width="1"/>`
			if (p.label) {
				svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="${anchor}" dominant-baseline="middle">${p.label}</text>`
				includeText(ext, labelX, p.label, anchor, 7)
			}
		}
	}
	
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
