import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

function createWeightSchema() {
	return z
		.object({
			label: z
				.union([z.string(), z.number()])
				.nullable()
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
				.describe(
					"The value or variable displayed on this weight (e.g., 5, 'x', 12, 'y', '2x', 3.5, null). Can be numeric values or algebraic expressions. Null shows no label."
				),
			shape: z
				.enum(["square", "circle", "pentagon", "hexagon", "triangle"])
				.describe(
					"Geometric shape for this weight. Different shapes can represent different variables or value types in equations."
				),
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"Hex-only fill color for this weight (e.g., '#4472C4', '#1E90FF', '#FF000080' for 50% alpha). Use distinct colors for different variable types."
				)
		})
		.strict()
}

export const HangerDiagramPropsSchema = z
	.object({
		type: z
			.literal("hangerDiagram")
			.describe("Identifies this as a hanger diagram (balance scale) for visualizing algebraic equations."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 500, 600, 400). Must accommodate both sides of the balance and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 300, 400, 250). Includes the hanger, beam, and hanging weights."
			),
		leftSide: z
			.array(createWeightSchema())
			.describe(
				"Weights hanging on the left side of the balance. Can be empty array for 0 = right side. Order determines left-to-right positioning."
			),
		rightSide: z
			.array(createWeightSchema())
			.describe(
				"Weights hanging on the right side of the balance. Can be empty array for left side = 0. Order determines left-to-right positioning."
			)
	})
	.strict()
	.describe(
		"Creates a balance scale visualization for algebraic equations where each side represents one side of the equation. Weights can show constants or variables with different shapes and colors. Perfect for teaching equation solving, algebraic thinking, and the balance method. The horizontal beam shows the equation is balanced (equal)."
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

	// Dynamic vertical layout to avoid clipping for small heights
	const maxStack = Math.max(leftSide.length, rightSide.length, 1)
	const bottomMargin = 8
	// Place beam relative to height but keep within a sensible range
	const beamY = Math.max(30, Math.min(50, Math.floor(height * 0.2)))
	const availableBelowBeam = Math.max(0, height - beamY - bottomMargin)

	const maxWeightSize = 42
	const minWeightSize = 16
	const baseGap = 6
	// Compute weight size so that all rows fit within available space
	let size = Math.min(
		maxWeightSize,
		Math.max(minWeightSize, Math.floor((availableBelowBeam - 10) / maxStack) - baseGap)
	)
	// In edge cases (very small height), ensure size is not NaN or negative
	if (!Number.isFinite(size) || size < minWeightSize) {
		size = minWeightSize
	}
	const weightGap = baseGap
	const weightHeight = size + weightGap
	const stringOffset = Math.max(8, Math.min(15, Math.floor(size / 2)))
	const weightYStart = beamY + stringOffset + 8

	const beamWidth = width * 0.8
	const beamStartX = centerX - beamWidth / 2
	const beamEndX = centerX + beamWidth / 2

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Hook and beam
	svg += `<line x1="${centerX}" y1="10" x2="${centerX}" y2="${beamY}" stroke="#333333" stroke-width="0.6667"/>`
	svg += `<path d="M ${centerX - 5} 10 L ${centerX} 5 L ${centerX + 5} 10 Z" fill="#333333" />` // Triangle at top of hook
	svg += `<line x1="${beamStartX}" y1="${beamY}" x2="${beamEndX}" y2="${beamY}" stroke="#333333" stroke-width="3"/>`

	const drawWeight = (x: number, y: number, weight: (typeof leftSide)[0]) => {
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
		const textSvg =
			weight.label !== null
				? `<text x="${x}" y="${y + size / 2 + 4}" fill="#333333" text-anchor="middle" font-weight="bold">${weight.label}</text>`
				: ""
		return shapeSvg + textSvg
	}

	// First, draw all the lines
	const renderLines = (weights: typeof leftSide, isLeft: boolean) => {
		const sideCenterX = isLeft ? beamStartX + beamWidth / 4 : beamEndX - beamWidth / 4
		weights.forEach((_w, i) => {
			const weightY = weightYStart + i * weightHeight
			svg += `<line x1="${sideCenterX}" y1="${i === 0 ? beamY : weightY - weightHeight + weightGap}" x2="${sideCenterX}" y2="${weightY}" stroke="#333333"/>`
		})
	}

	// Then, draw all the shapes on top
	const renderShapes = (weights: typeof leftSide, isLeft: boolean) => {
		const sideCenterX = isLeft ? beamStartX + beamWidth / 4 : beamEndX - beamWidth / 4
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
