import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a group of identical sectors on the spinner
const ProbabilitySpinnerSectorGroupSchema = z
	.object({
		count: z.number().int().positive().describe("The number of sectors in this group."),
		emoji: z
			.string()
			.nullable()
			.describe("The emoji to display in this group's sectors. Can be null for color-only sectors."),
		color: z
			.string()
			.describe("The CSS fill color for this group's sectors (e.g., '#90CAF9', 'rgba(255, 182, 193, 0.5)').")
	})
	.strict()

// The main Zod schema for the probabilitySpinner function
export const ProbabilitySpinnerPropsSchema = z
	.object({
		type: z.literal("probabilitySpinner"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total height of the output SVG container in pixels."),
		groups: z
			.array(ProbabilitySpinnerSectorGroupSchema)
			.min(1)
			.describe("An array of sector groups. The total number of sectors is the sum of all group counts."),
		pointerAngle: z
			.number()
			.nullable()
			.transform((val) => val ?? 45)
			.describe("The angle in degrees where the spinner arrow should point (0 is horizontal to the right)."),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional title to display above the spinner diagram.")
	})
	.strict()
	.describe(
		"Generates an SVG diagram of a probability spinner with customizable sectors. This widget is ideal for visualizing problems involving theoretical probability, where outcomes are represented by different sectors of a spinner. It supports creating spinners with any number of equal-sized sectors, which can be styled with unique colors and labeled with emojis."
	)

export type ProbabilitySpinnerProps = z.infer<typeof ProbabilitySpinnerPropsSchema>

/**
 * Generates an SVG diagram of a probability spinner.
 * Ideal for visualizing theoretical probability problems.
 */
export const generateProbabilitySpinner: WidgetGenerator<typeof ProbabilitySpinnerPropsSchema> = (props) => {
	const { width, height, groups, pointerAngle, title } = props

	const cx = width / 2
	const cy = height / 2
	const padding = title ? 35 : 15
	const radius = Math.min(width, height) / 2 - padding

	const totalSectors = groups.reduce((sum, group) => sum + group.count, 0)
	if (totalSectors === 0) {
		return `<svg width="${width}" height="${height}" />`
	}
	const anglePerSector = 360 / totalSectors

	const toRad = (deg: number) => (deg * Math.PI) / 180
	const pointOnCircle = (angleDeg: number, r: number) => ({
		x: cx + r * Math.cos(toRad(angleDeg)),
		y: cy + r * Math.sin(toRad(angleDeg))
	})

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg += "<style>.title { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title) {
		svg += `<text x="${cx}" y="${padding - 10}" class="title">${title}</text>`
	}

	// 1. Draw Sectors and Emojis
	let currentAngle = -90 // Start at the top

	for (const group of groups) {
		for (let i = 0; i < group.count; i++) {
			const startAngle = currentAngle
			const endAngle = currentAngle + anglePerSector

			const start = pointOnCircle(startAngle, radius)
			const end = pointOnCircle(endAngle, radius)

			// Create the path for the pie slice
			const largeArcFlag = anglePerSector > 180 ? 1 : 0
			const pathData = `M ${cx},${cy} L ${start.x},${start.y} A ${radius},${radius} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`
			svg += `<path d="${pathData}" fill="${group.color}" stroke="black" stroke-width="1.5"/>`

			// Add emoji if it exists
			if (group.emoji) {
				const midAngle = startAngle + anglePerSector / 2
				const emojiPos = pointOnCircle(midAngle, radius * 0.65)
				const emojiSize = Math.min(radius / totalSectors, 30) * 1.5 // Scale emoji size
				svg += `<text x="${emojiPos.x}" y="${emojiPos.y}" font-size="${emojiSize}px" text-anchor="middle" dominant-baseline="central">${group.emoji}</text>`
			}

			currentAngle += anglePerSector
		}
	}

	// 2. Draw Spinner Pointer and Hub
	const pointerLength = radius * 1.2
	const pointerWidth = 12

	svg += `<g transform="rotate(${pointerAngle}, ${cx}, ${cy})">`
	// A polygon for a nice arrow shape
	const p1 = { x: cx, y: cy - pointerWidth / 2 }
	const p2 = { x: cx + pointerLength - pointerWidth, y: cy - pointerWidth / 2 }
	const p3 = { x: cx + pointerLength - pointerWidth, y: cy - pointerWidth }
	const p4 = { x: cx + pointerLength, y: cy }
	const p5 = { x: cx + pointerLength - pointerWidth, y: cy + pointerWidth }
	const p6 = { x: cx + pointerLength - pointerWidth, y: cy + pointerWidth / 2 }
	const p7 = { x: cx, y: cy + pointerWidth / 2 }
	const pointsStr = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y} ${p6.x},${p6.y} ${p7.x},${p7.y}`
	svg += `<polygon points="${pointsStr}" fill="#4A4A4A" stroke="black" stroke-width="1"/>`
	svg += "</g>"

	// Central hub
	svg += `<circle cx="${cx}" cy="${cy}" r="${pointerWidth}" fill="#F5F5F5" stroke="black" stroke-width="2"/>`

	svg += "</svg>"
	return svg
}
