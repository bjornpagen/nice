import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines properties for one of the squares attached to the central triangle
const SideSquareSchema = z.object({
	area: z.number().describe("The area of the square, used for labeling."),
	sideLabel: z
		.string()
		.optional()
		.describe('An optional label for the corresponding triangle side (e.g., "a", "b", "c").')
})

// The main Zod schema for the pythagoreanProofDiagram function
export const PythagoreanProofDiagramPropsSchema = z
	.object({
		width: z.number().default(300).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(300).describe("The total height of the output SVG container in pixels."),
		squareA: SideSquareSchema.describe("Properties of the square on the first leg."),
		squareB: SideSquareSchema.describe("Properties of the square on the second leg."),
		squareC: SideSquareSchema.describe("Properties of the square on the hypotenuse.")
	})
	.describe(
		"Generates a classic visual proof of the Pythagorean theorem. This SVG diagram renders a central right-angled triangle. A square is constructed on each of the triangle's three sides (the two legs 'a' and 'b', and the hypotenuse 'c'). Each square is labeled with its area, allowing students to visually confirm the relationship a² + b² = c². This provides a powerful, intuitive illustration of the theorem beyond the formula itself."
	)

export type PythagoreanProofDiagramProps = z.infer<typeof PythagoreanProofDiagramPropsSchema>

/**
 * Generates a visual diagram to illustrate the Pythagorean theorem by rendering a
 * right triangle with a square constructed on each side, labeled with its area.
 */
export const generatePythagoreanProofDiagram: WidgetGenerator<typeof PythagoreanProofDiagramPropsSchema> = (data) => {
	const { width, height, squareA, squareB, squareC } = data

	const a = Math.sqrt(squareA.area)
	const b = Math.sqrt(squareB.area)
	const c = Math.sqrt(squareC.area)

	// Scale to fit inside the SVG
	const maxDim = Math.max(a + c, b + c) * 1.2
	const scale = Math.min(width, height) / maxDim

	const sa = a * scale
	const sb = b * scale

	const centerX = width / 2
	const centerY = height / 2

	// Vertices of the central triangle
	const p1 = { x: centerX - sb / 2, y: centerY + sa / 2 } // Corner between a and c
	const p2 = { x: centerX - sb / 2, y: centerY - sa / 2 } // Right angle corner
	const p3 = { x: centerX + sb / 2, y: centerY - sa / 2 } // Corner between b and c

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	svg +=
		"<style>.area-label { font-size: 14px; font-weight: bold; text-anchor: middle; dominant-baseline: middle; }</style>"

	// Square on side A
	const colorA = "rgba(217, 95, 79, 0.5)"
	svg += `<rect x="${p1.x - sa}" y="${p1.y - sa / 2}" width="${sa}" height="${sa}" fill="${colorA}" stroke="black" transform="rotate(-90 ${p1.x} ${p1.y})"/>`
	svg += `<text x="${p1.x - sa / 2}" y="${p2.y}" class="area-label" fill="black">${squareA.area}</text>`
	if (squareA.sideLabel)
		svg += `<text x="${p1.x - 5}" y="${centerY}" text-anchor="middle" dominant-baseline="middle">${squareA.sideLabel}</text>`

	// Square on side B
	const colorB = "rgba(66, 133, 244, 0.5)"
	svg += `<rect x="${p3.x - sb / 2}" y="${p3.y - sb}" width="${sb}" height="${sb}" fill="${colorB}" stroke="black" transform="rotate(0 ${p3.x} ${p3.y})"/>`
	svg += `<text x="${centerX}" y="${p3.y - sb / 2}" class="area-label" fill="black">${squareB.area}</text>`
	if (squareB.sideLabel)
		svg += `<text x="${centerX}" y="${p3.y + 5}" text-anchor="middle" dominant-baseline="middle">${squareB.sideLabel}</text>`

	// Square on side C (hypotenuse)
	const colorC = "rgba(244, 180, 0, 0.5)"
	const angleC = Math.atan2(p1.y - p3.y, p1.x - p3.x) * (180 / Math.PI)
	svg += `<rect x="${p3.x}" y="${p3.y}" width="${sb * (c / b)}" height="${sb * (c / b)}" fill="${colorC}" stroke="black" transform="rotate(${angleC} ${p3.x} ${p3.y})"/>`
	const midC = { x: (p1.x + p3.x) / 2, y: (p1.y + p3.y) / 2 }
	const normal = { x: p1.y - p3.y, y: p3.x - p1.x }
	const mag = Math.sqrt(normal.x ** 2 + normal.y ** 2)
	svg += `<text x="${midC.x + (normal.x / mag) * (sa * 0.6)}" y="${midC.y + (normal.y / mag) * (sa * 0.6)}" class="area-label" fill="black">${squareC.area}</text>`
	if (squareC.sideLabel)
		svg += `<text x="${midC.x}" y="${midC.y}" text-anchor="middle" dominant-baseline="middle">${squareC.sideLabel}</text>`

	// Central triangle (drawn on top)
	svg += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="white" stroke="black" stroke-width="2"/>`

	svg += "</svg>"
	return svg
}
