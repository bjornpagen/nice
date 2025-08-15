import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a group of identical sectors on the spinner
const ProbabilitySpinnerSectorGroupSchema = z
	.object({
		count: z
			.number()
			.int()
			.positive()
			.describe(
				"Number of equal sectors in this group (e.g., 3, 5, 1). All sectors in a group share the same color and emoji. Must be positive integer."
			),
		emoji: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe(
				"Emoji to display in each sector of this group (e.g., '⭐', '🎯', '❌', null). Null means no emoji, just colored sector. Single emoji recommended."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"Hex-only color for all sectors in this group (e.g., '#FF6B6B', '#1E90FF', '#000000', '#00000080' for 50% alpha). Each group should have distinct color."
			)
	})
	.strict()

// The main Zod schema for the probabilitySpinner function
export const ProbabilitySpinnerPropsSchema = z
	.object({
		type: z
			.literal("probabilitySpinner")
			.describe("Identifies this as a probability spinner widget for demonstrating random events and likelihood."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the spinner diagram in pixels (e.g., 400, 500, 350). Must accommodate the circle and pointer with padding."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the spinner diagram in pixels (e.g., 400, 500, 350). Should include space for title if present. Often equal to width."
			),
		groups: z
			.array(ProbabilitySpinnerSectorGroupSchema)
			.describe(
				"Array of sector groups defining the spinner. Total sectors = sum of all counts. Order affects color assignment. Empty array creates blank spinner."
			),
		pointerAngle: z
			.number()
			.describe(
				"Angle in degrees where the arrow points (0 = right, 90 = up, 180 = left, 270 = down). Can be any value; wraps around 360. Determines 'current' sector."
			),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Title displayed above the spinner (e.g., 'Spin the Wheel!', 'Color Spinner', null). Null means no title. Keep concise for space. Plaintext only; no markdown or HTML."
			)
	})
	.strict()
	.describe(
		"Creates a circular spinner divided into colored sectors for probability experiments. Each sector group can have multiple equal sectors with the same appearance. Perfect for teaching probability, likelihood, and random events. The pointer indicates the 'selected' outcome."
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
	const padding = title !== null ? 35 : 15
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

	if (title !== null) {
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
			if (group.emoji !== null) {
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
