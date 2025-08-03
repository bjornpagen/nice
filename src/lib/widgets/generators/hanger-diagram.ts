import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a single weight hanging from one side of the diagram
const HangerWeightSchema = z.object({
	label: z
		.union([z.string(), z.number()])
		.describe('The text label displayed inside the weight (e.g., "c", 12, "1/2").'),
	shape: z
		.enum(["square", "circle", "pentagon", "hexagon", "triangle"])
		.optional()
		.default("square")
		.describe("The geometric shape of the weight."),
	color: z.string().optional().default("#e0e0e0").describe("An optional CSS fill color for the shape.")
})

// The main Zod schema for the hangerDiagram function
export const HangerDiagramPropsSchema = z
	.object({
		width: z.number().optional().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(240).describe("The total height of the output SVG container in pixels."),
		leftSide: z
			.array(HangerWeightSchema)
			.describe("An array of weight objects to be rendered on the left side of the hanger."),
		rightSide: z
			.array(HangerWeightSchema)
			.describe("An array of weight objects to be rendered on the right side of the hanger.")
	})
	.describe(
		'This template generates a "hanger diagram," a powerful visual metaphor for a balanced algebraic equation, rendered as an SVG graphic within an HTML <div>. This diagram is ideal for introducing students to the concept of solving equations by maintaining balance. The generator will construct a central balanced beam suspended from a hook. Two sides, left and right, hang from the beam, each capable of holding multiple "weights." The core principle is that the total weight on the left side must equal the total weight on the right for the hanger to be balanced. Each weight is a distinct visual element, configurable by shape (e.g., square, circle, pentagon, hexagon) and an internal label (e.g., a number like "12" or a variable like "c"). The generator will intelligently and aesthetically arrange multiple weights on each side, stacking or grouping them as needed for clarity. This allows for the visual representation of equations like 12 = 4c (a single 12-unit weight on the left balances four c-unit weights on the right) or d + 6 = 21 (a d-unit weight and a 6-unit weight on the left balance a 21-unit weight on the right). The final output is a clean, self-contained SVG that intuitively communicates the principle of equality in an equation, making abstract algebraic concepts more concrete and accessible.'
	)

export type HangerDiagramProps = z.infer<typeof HangerDiagramPropsSchema>

/**
 * This template generates a "hanger diagram," a powerful visual metaphor for a balanced
 * algebraic equation, rendered as an SVG graphic. This diagram is ideal for introducing
 * students to the concept of solving equations by maintaining balance.
 */
export const generateHangerDiagram: WidgetGenerator<typeof HangerDiagramPropsSchema> = (data) => {
	const { width, height, leftSide, rightSide } = data
	const centerX = width / 2
	const beamY = 50
	const beamWidth = width * 0.8
	const beamStartX = centerX - beamWidth / 2
	const beamEndX = centerX + beamWidth / 2

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Hook and beam
	svg += `<line x1="${centerX}" y1="10" x2="${centerX}" y2="${beamY}" stroke="#333333" stroke-width="2"/>`
	svg += `<path d="M ${centerX - 5} 10 L ${centerX} 5 L ${centerX + 5} 10 Z" fill="#333333" />` // Triangle at top of hook
	svg += `<line x1="${beamStartX}" y1="${beamY}" x2="${beamEndX}" y2="${beamY}" stroke="#333333" stroke-width="3"/>`

	const drawWeight = (x: number, y: number, weight: (typeof leftSide)[0]) => {
		const size = 30
		let shapeSvg = ""
		switch (weight.shape) {
			case "circle":
				shapeSvg = `<circle cx="${x}" cy="${y + size / 2}" r="${size / 2}" fill="${weight.color}" stroke="#333333"/>`
				break
			case "triangle":
				shapeSvg = `<polygon points="${x - size / 2},${y + size} ${x + size / 2},${y + size} ${x},${y}" fill="${weight.color}" stroke="#333333"/>`
				break
			case "pentagon": {
				// Simplified pentagon
				const p_pts = [
					[x, y],
					[x + size / 2, y + size * 0.4],
					[x + size * 0.3, y + size],
					[x - size * 0.3, y + size],
					[x - size / 2, y + size * 0.4]
				]
					.map((pt) => pt.join(","))
					.join(" ")
				shapeSvg = `<polygon points="${p_pts}" fill="${weight.color}" stroke="#333333"/>`
				break
			}
			default:
				shapeSvg = `<rect x="${x - size / 2}" y="${y}" width="${size}" height="${size}" fill="${weight.color}" stroke="#333333"/>`
				break
		}
		const textSvg = `<text x="${x}" y="${y + size / 2 + 4}" fill="#333333" text-anchor="middle" font-weight="bold">${weight.label}</text>`
		return shapeSvg + textSvg
	}

	// First, draw all the lines
	const renderLines = (weights: typeof leftSide, isLeft: boolean) => {
		const sideCenterX = isLeft ? beamStartX + beamWidth / 4 : beamEndX - beamWidth / 4
		const stringY = beamY + 15
		const weightYStart = stringY + 10
		const weightHeight = 35 // size + padding

		weights.forEach((_w, i) => {
			const weightY = weightYStart + i * weightHeight
			svg += `<line x1="${sideCenterX}" y1="${i === 0 ? beamY : weightY - weightHeight + 5}" x2="${sideCenterX}" y2="${weightY}" stroke="#333333"/>`
		})
	}

	// Then, draw all the shapes on top
	const renderShapes = (weights: typeof leftSide, isLeft: boolean) => {
		const sideCenterX = isLeft ? beamStartX + beamWidth / 4 : beamEndX - beamWidth / 4
		const stringY = beamY + 15
		const weightYStart = stringY + 10
		const weightHeight = 35 // size + padding

		weights.forEach((w, i) => {
			const weightY = weightYStart + i * weightHeight
			svg += drawWeight(sideCenterX, weightY, w)
		})
	}

	// Draw all lines first
	renderLines(leftSide, true)
	renderLines(rightSide, false)

	// Then draw all shapes on top
	renderShapes(leftSide, true)
	renderShapes(rightSide, false)

	svg += "</svg>"
	return svg
}
