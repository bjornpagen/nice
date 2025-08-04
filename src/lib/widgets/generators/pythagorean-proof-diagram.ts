import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines properties for one of the squares attached to the central triangle
const SideSquareSchema = z
	.object({
		area: z.number().describe("The area of the square, used for labeling."),
		sideLabel: z
			.string()
			.nullable()
			.describe('An optional label for the corresponding triangle side (e.g., "a", "b", "c").')
	})
	.strict()

// The main Zod schema for the pythagoreanProofDiagram function
export const PythagoreanProofDiagramPropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total height of the output SVG container in pixels."),
		squareA: SideSquareSchema.describe("Properties of the square on the first leg."),
		squareB: SideSquareSchema.describe("Properties of the square on the second leg."),
		squareC: SideSquareSchema.describe("Properties of the square on the hypotenuse.")
	})
	.strict()
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

	// Calculate the exact bounds needed for the entire diagram
	// The width needs: triangle width (a) + square B width (b) = a + b
	// The height needs: triangle height (b) + square A height (a) = a + b
	// Plus the hypotenuse square extends diagonally, adding c to both dimensions
	const requiredWidth = a + b + c
	const requiredHeight = a + b + c
	const maxDim = Math.max(requiredWidth, requiredHeight)
	const scale = (Math.min(width, height) * 0.9) / maxDim // 0.9 for padding

	const sa = a * scale
	const sb = b * scale
	const sc = c * scale

	// Center the entire diagram
	const totalWidth = (a + b + c) * scale
	const totalHeight = (a + b + c) * scale
	const offsetX = (width - totalWidth) / 2 + sc
	const offsetY = (height - totalHeight) / 2 + sc

	// To make the diagram match the visual test case, we swap 'a' and 'b' sides
	// The triangle is now oriented with side 'a' horizontal and 'b' vertical.
	const v_right = { x: offsetX + sa, y: offsetY + sb } // Right-angle vertex
	const v_a_end = { x: offsetX, y: offsetY + sb } // End of horizontal leg 'a'
	const v_b_end = { x: offsetX + sa, y: offsetY } // End of vertical leg 'b'

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg +=
		"<style>.area-label { font-size: 16px; font-weight: bold; text-anchor: middle; dominant-baseline: middle; } .side-label { font-size: 14px; text-anchor: middle; dominant-baseline: middle; } .grid-line { stroke: #888888; stroke-width: 0.5; opacity: 0.5; }</style>"

	// Helper function to generate grid lines for a rectangular square
	const generateRectangularGrid = (x: number, y: number, width: number, height: number, sideLength: number): string => {
		let gridSvg = ""
		const unitSize = width / sideLength

		// Vertical grid lines
		for (let i = 1; i < sideLength; i++) {
			const lineX = x + i * unitSize
			gridSvg += `<line x1="${lineX}" y1="${y}" x2="${lineX}" y2="${y + height}" class="grid-line"/>`
		}

		// Horizontal grid lines
		for (let i = 1; i < sideLength; i++) {
			const lineY = y + i * unitSize
			gridSvg += `<line x1="${x}" y1="${lineY}" x2="${x + width}" y2="${lineY}" class="grid-line"/>`
		}

		return gridSvg
	}

	// Helper function to generate grid lines for a rotated square (hypotenuse)
	const generateRotatedGrid = (
		v1: { x: number; y: number },
		v2: { x: number; y: number },
		v4: { x: number; y: number },
		sideLength: number
	): string => {
		let gridSvg = ""

		// Calculate the basis vectors for the rotated coordinate system
		// v1 -> v2 is one edge, v1 -> v4 is the adjacent perpendicular edge
		const u = { x: (v2.x - v1.x) / sideLength, y: (v2.y - v1.y) / sideLength }
		const v = { x: (v4.x - v1.x) / sideLength, y: (v4.y - v1.y) / sideLength }

		// Generate grid lines parallel to each edge
		for (let i = 1; i < sideLength; i++) {
			// Lines parallel to edge v1-v2
			const start1 = { x: v1.x + i * v.x, y: v1.y + i * v.y }
			const end1 = { x: v2.x + i * v.x, y: v2.y + i * v.y }
			gridSvg += `<line x1="${start1.x}" y1="${start1.y}" x2="${end1.x}" y2="${end1.y}" class="grid-line"/>`

			// Lines parallel to edge v1-v4
			const start2 = { x: v1.x + i * u.x, y: v1.y + i * u.y }
			const end2 = { x: v4.x + i * u.x, y: v4.y + i * u.y }
			gridSvg += `<line x1="${start2.x}" y1="${start2.y}" x2="${end2.x}" y2="${end2.y}" class="grid-line"/>`
		}

		return gridSvg
	}

	// --- Square C (Hypotenuse) ---
	const colorC = "#FFE082" // amber light
	const hypVec = { x: v_b_end.x - v_a_end.x, y: v_b_end.y - v_a_end.y } // vector from a_end to b_end
	const perpVec = { x: hypVec.y, y: -hypVec.x } // outward perpendicular vector (flipped to other side)
	const v_c1 = { x: v_b_end.x + perpVec.x, y: v_b_end.y + perpVec.y }
	const v_c2 = { x: v_a_end.x + perpVec.x, y: v_a_end.y + perpVec.y }
	svg += `<polygon points="${v_a_end.x},${v_a_end.y} ${v_b_end.x},${v_b_end.y} ${v_c1.x},${v_c1.y} ${v_c2.x},${v_c2.y}" fill="${colorC}" stroke="#333333" stroke-width="1"/>`

	// Add grid lines for square C
	svg += generateRotatedGrid(v_a_end, v_b_end, v_c2, c)

	const centerC = { x: (v_a_end.x + v_c1.x) / 2, y: (v_a_end.y + v_c1.y) / 2 }
	svg += `<text x="${centerC.x}" y="${centerC.y}" class="area-label">${squareC.area}</text>`
	if (squareC.sideLabel) {
		const midHyp = { x: (v_a_end.x + v_b_end.x) / 2, y: (v_a_end.y + v_b_end.y) / 2 }
		// Place "c" label on the hypotenuse side of the triangle
		svg += `<text x="${midHyp.x}" y="${midHyp.y - 10}" class="side-label">${squareC.sideLabel}</text>`
	}

	// --- Square B (on leg 'b') ---
	const colorB = "#90CAF9" // blue light
	svg += `<rect x="${v_right.x}" y="${v_b_end.y}" width="${sb}" height="${sb}" fill="${colorB}" stroke="#333333" stroke-width="1"/>`

	// Add grid lines for square B
	svg += generateRectangularGrid(v_right.x, v_b_end.y, sb, sb, b)

	const centerB = { x: v_right.x + sb / 2, y: v_b_end.y + sb / 2 }
	svg += `<text x="${centerB.x}" y="${centerB.y}" class="area-label">${squareB.area}</text>`
	if (squareB.sideLabel) {
		const midB = { x: (v_right.x + v_b_end.x) / 2, y: (v_right.y + v_b_end.y) / 2 }
		svg += `<text x="${midB.x + 10}" y="${midB.y}" class="side-label">${squareB.sideLabel}</text>`
	}

	// --- Square A (on leg 'a') ---
	const colorA = "#F48FB1" // pink light
	svg += `<rect x="${v_a_end.x}" y="${v_a_end.y}" width="${sa}" height="${sa}" fill="${colorA}" stroke="#333333" stroke-width="1"/>`

	// Add grid lines for square A
	svg += generateRectangularGrid(v_a_end.x, v_a_end.y, sa, sa, a)

	const centerA = { x: v_a_end.x + sa / 2, y: v_a_end.y + sa / 2 }
	svg += `<text x="${centerA.x}" y="${centerA.y}" class="area-label">${squareA.area}</text>`
	if (squareA.sideLabel) {
		const midA = { x: (v_right.x + v_a_end.x) / 2, y: (v_right.y + v_a_end.y) / 2 }
		svg += `<text x="${midA.x}" y="${midA.y + 10}" class="side-label">${squareA.sideLabel}</text>`
	}

	// --- Central Triangle (drawn on top) ---
	svg += `<polygon points="${v_a_end.x},${v_a_end.y} ${v_right.x},${v_right.y} ${v_b_end.x},${v_b_end.y}" fill="#FAFAFA" stroke="#333333" stroke-width="2"/>`

	svg += "</svg>"
	return svg
}
