import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single point to be plotted on the number line
const NumberLinePointSchema = z
	.object({
		value: z.number().describe("The numerical value where the point is located on the line."),
		label: z
			.string()
			.nullable()
			.describe('An optional text label to display next to the point (e.g., "A", "Minnesota").'),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "#4285F4")
			.describe("The CSS color of the point."),
		labelPosition: z
			.enum(["above", "below", "left", "right"])
			.nullable()
			.describe("Specifies the position of the label relative to the point.")
	})
	.strict()

// Defines a custom label for a specific tick mark (e.g., "sea level" at 0)
const SpecialTickLabelSchema = z
	.object({
		value: z.number().describe("The value on the number line to label."),
		label: z.string().describe("The custom text for the label.")
	})
	.strict()

// The main Zod schema for the numberLine function
export const NumberLinePropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 460)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 100)
			.describe("The total height of the output SVG container in pixels."),
		orientation: z
			.enum(["horizontal", "vertical"])
			.nullable()
			.transform((val) => val ?? "horizontal")
			.describe("The orientation of the number line."),
		min: z.number().describe("The minimum value displayed on the line."),
		max: z.number().describe("The maximum value displayed on the line."),
		majorTickInterval: z.number().describe("The numeric interval between labeled tick marks."),
		minorTicksPerInterval: z
			.number()
			.nullable()
			.transform((val) => val ?? 0)
			.describe("The number of unlabeled minor ticks to draw between each major tick."),
		points: z
			.array(NumberLinePointSchema)
			.nullable()
			.describe("An optional array of point objects to be plotted on the line."),
		specialTickLabels: z
			.array(SpecialTickLabelSchema)
			.nullable()
			.describe('Optional custom labels for specific values on the line (e.g., labeling 0 as "sea level").')
	})
	.strict()
	.describe(
		'This is a highly versatile template designed to generate a precise and customizable number line as an SVG graphic. It can be rendered horizontally (for general number comparisons) or vertically (often used for temperature, elevation, or financial contexts). The generator will construct a line representing a specified numerical range (minimum and maximum values). The line will be marked with labeled major tick marks at a configurable interval. It also supports rendering smaller, unlabeled minor tick marks between the major ones to show finer gradations (e.g., quarters, tenths). This is crucial for questions involving fractions and decimals. A key feature is the ability to plot multiple points on the line. Each point is defined by its numerical value and can be styled with a specific color. An accompanying text label (e.g., a letter like "A", a name like "Minnesota", or a value like "−78 °C") can be positioned above, below, or next to each point. Special labels, such as "sea level" or "Zero balance," can be associated with specific values like 0. The final output is a clean, accurately scaled, and accessible SVG graphic ready for embedding in a QTI item, suitable for a wide range of questions from identifying points to comparing rational numbers.'
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

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	const _pointMap = new Map<number, { count: number; current: number }>()

	if (isHorizontal) {
		const yPos = height / 2
		const toSvgX = (val: number) => padding + (val - min) * scale
		svg += `<line x1="${padding}" y1="${yPos}" x2="${width - padding}" y2="${yPos}" stroke="black"/>`
		const minorTickSpacing = (majorTickInterval / (minorTicksPerInterval + 1)) * scale
		for (let t = min; t <= max; t += majorTickInterval) {
			const x = toSvgX(t)
			svg += `<line x1="${x}" y1="${yPos - 8}" x2="${x}" y2="${yPos + 8}" stroke="black"/>`
			if (!specialTickLabels?.some((stl) => stl.value === t)) {
				svg += `<text x="${x}" y="${yPos + 25}" fill="black" text-anchor="middle">${t}</text>`
			}
			for (let m = 1; m <= minorTicksPerInterval; m++) {
				const mPos = x + m * minorTickSpacing
				if (mPos < width - padding)
					svg += `<line x1="${mPos}" y1="${yPos - 4}" x2="${mPos}" y2="${yPos + 4}" stroke="black"/>`
			}
		}
		// Special Labels
		if (specialTickLabels) {
			for (const s of specialTickLabels) {
				svg += `<text x="${toSvgX(s.value)}" y="${yPos + 25}" fill="black" text-anchor="middle" font-weight="bold">${s.label}</text>`
			}
		}
		if (points) {
			for (const p of points) {
				const cx = toSvgX(p.value)
				let labelX = cx
				let labelY = yPos
				let anchor = "middle"
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
				if (p.label)
					svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="${anchor}" dominant-baseline="middle">${p.label}</text>`
			}
		}
	} else {
		// Vertical
		const xPos = width / 2
		const toSvgY = (val: number) => height - padding - (val - min) * scale
		svg += `<line x1="${xPos}" y1="${padding}" x2="${xPos}" y2="${height - padding}" stroke="black"/>`
		const minorTickSpacing = (majorTickInterval / (minorTicksPerInterval + 1)) * scale
		for (let t = min; t <= max; t += majorTickInterval) {
			const y = toSvgY(t)
			svg += `<line x1="${xPos - 8}" y1="${y}" x2="${xPos + 8}" y2="${y}" stroke="black"/>`
			if (!specialTickLabels?.some((stl) => stl.value === t)) {
				svg += `<text x="${xPos - 15}" y="${y + 4}" fill="black" text-anchor="end">${t}</text>`
			}
			for (let m = 1; m <= minorTicksPerInterval; m++) {
				const mPos = y - m * minorTickSpacing
				if (mPos > padding) svg += `<line x1="${xPos - 4}" y1="${mPos}" x2="${xPos + 4}" y2="${mPos}" stroke="black"/>`
			}
		}
		// Special Labels
		if (specialTickLabels) {
			for (const s of specialTickLabels) {
				svg += `<text x="${xPos - 15}" y="${toSvgY(s.value) + 4}" fill="black" text-anchor="end" font-weight="bold">${s.label}</text>`
			}
		}
		if (points) {
			for (const p of points) {
				const cy = toSvgY(p.value)
				let labelX = xPos
				let labelY = cy
				let anchor = "middle"
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
				if (p.label)
					svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="${anchor}" dominant-baseline="middle">${p.label}</text>`
			}
		}
	}
	svg += "</svg>"
	return svg
}
