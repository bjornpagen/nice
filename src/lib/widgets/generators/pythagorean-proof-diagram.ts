import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { computeDynamicWidth, includeText, includePointX, initExtents } from "@/lib/widgets/utils/layout"

function createSideSquareSchema() {
	return z
		.object({
			area: z
				.number()
				.describe(
					"The area of this square in square units (e.g., 9, 16, 25, 12.5). Will be displayed inside the square. For Pythagorean theorem: a² + b² = c²."
				),
			sideLabel: z
				.string()
				.nullable()
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
				.describe(
					"Label for the triangle side this square is attached to (e.g., 'a', 'b', 'c', '3', '4', null). Null means no side label. Typically lowercase letters."
				),
			color: z
				.string()
				.regex(
					CSS_COLOR_PATTERN,
					"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
				)
				.describe(
					"Hex-only color for this square (e.g., '#FFE082', '#1E90FF', '#FFC864CC' for ~80% alpha). Should contrast with text and background."
				)
		})
		.strict()
}

export const PythagoreanProofDiagramPropsSchema = z
	.object({
		type: z
			.literal("pythagoreanProofDiagram")
			.describe("Identifies this as a Pythagorean proof diagram showing the classic visual demonstration."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 600). Must accommodate all three squares and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 400, 500, 600). Should be similar to width for proper proportions."
			),
		squareA: createSideSquareSchema().describe(
			"The square on the first leg of the right triangle. Its area represents a² in the theorem."
		),
		squareB: createSideSquareSchema().describe(
			"The square on the second leg of the right triangle. Its area represents b² in the theorem."
		),
		squareC: createSideSquareSchema().describe(
			"The square on the hypotenuse of the right triangle. Its area represents c². Should equal squareA.area + squareB.area."
		)
	})
	.strict()
	.describe(
		"Creates the classic visual proof of the Pythagorean theorem showing a right triangle with squares constructed on each side. The areas of the squares demonstrate that a² + b² = c². Essential for geometry education and visual understanding of the theorem."
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

	const ext = initExtents(width)
	
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
	const hypVec = { x: v_b_end.x - v_a_end.x, y: v_b_end.y - v_a_end.y } // vector from a_end to b_end
	const perpVec = { x: hypVec.y, y: -hypVec.x } // outward perpendicular vector (flipped to other side)
	const v_c1 = { x: v_b_end.x + perpVec.x, y: v_b_end.y + perpVec.y }
	const v_c2 = { x: v_a_end.x + perpVec.x, y: v_a_end.y + perpVec.y }

	includePointX(ext, v_a_end.x)
	includePointX(ext, v_b_end.x)
	includePointX(ext, v_c1.x)
	includePointX(ext, v_c2.x)

	svg += `<polygon points="${v_a_end.x},${v_a_end.y} ${v_b_end.x},${v_b_end.y} ${v_c1.x},${v_c1.y} ${v_c2.x},${v_c2.y}" fill="${squareC.color}" stroke="#333333" stroke-width="1"/>`

	// Add grid lines for square C
	svg += generateRotatedGrid(v_a_end, v_b_end, v_c2, c)

	const centerC = { x: (v_a_end.x + v_c1.x) / 2, y: (v_a_end.y + v_c1.y) / 2 }
	svg += `<text x="${centerC.x}" y="${centerC.y}" class="area-label">${squareC.area}</text>`
	includeText(ext, centerC.x, String(squareC.area), "middle", 7)
	if (squareC.sideLabel) {
		const midHyp = { x: (v_a_end.x + v_b_end.x) / 2, y: (v_a_end.y + v_b_end.y) / 2 }
		// Place "c" label on the hypotenuse side of the triangle
		svg += `<text x="${midHyp.x}" y="${midHyp.y - 10}" class="side-label">${squareC.sideLabel}</text>`
		includeText(ext, midHyp.x, squareC.sideLabel, "middle", 7)
	}

	// --- Square B (on leg 'b') ---
	const rectB_x = v_right.x
	const rectB_y = v_b_end.y
	includePointX(ext, rectB_x)
	includePointX(ext, rectB_x + sb)

	svg += `<rect x="${rectB_x}" y="${rectB_y}" width="${sb}" height="${sb}" fill="${squareB.color}" stroke="#333333" stroke-width="1"/>`

	// Add grid lines for square B
	svg += generateRectangularGrid(v_right.x, v_b_end.y, sb, sb, b)

	const centerB = { x: v_right.x + sb / 2, y: v_b_end.y + sb / 2 }
	svg += `<text x="${centerB.x}" y="${centerB.y}" class="area-label">${squareB.area}</text>`
	includeText(ext, centerB.x, String(squareB.area), "middle", 7)
	if (squareB.sideLabel) {
		const midB = { x: (v_right.x + v_b_end.x) / 2, y: (v_right.y + v_b_end.y) / 2 }
		svg += `<text x="${midB.x + 10}" y="${midB.y}" class="side-label">${squareB.sideLabel}</text>`
		includeText(ext, midB.x + 10, squareB.sideLabel, "middle", 7)
	}

	// --- Square A (on leg 'a') ---
	const rectA_x = v_a_end.x
	const rectA_y = v_a_end.y
	includePointX(ext, rectA_x)
	includePointX(ext, rectA_x + sa)

	svg += `<rect x="${rectA_x}" y="${rectA_y}" width="${sa}" height="${sa}" fill="${squareA.color}" stroke="#333333" stroke-width="1"/>`

	// Add grid lines for square A
	svg += generateRectangularGrid(v_a_end.x, v_a_end.y, sa, sa, a)

	const centerA = { x: v_a_end.x + sa / 2, y: v_a_end.y + sa / 2 }
	svg += `<text x="${centerA.x}" y="${centerA.y}" class="area-label">${squareA.area}</text>`
	includeText(ext, centerA.x, String(squareA.area), "middle", 7)
	if (squareA.sideLabel) {
		const midA = { x: (v_right.x + v_a_end.x) / 2, y: (v_right.y + v_a_end.y) / 2 }
		svg += `<text x="${midA.x}" y="${midA.y + 10}" class="side-label">${squareA.sideLabel}</text>`
		includeText(ext, midA.x, squareA.sideLabel, "middle", 7)
	}

	// --- Central Triangle (drawn on top) ---
	includePointX(ext, v_a_end.x)
	includePointX(ext, v_right.x)
	includePointX(ext, v_b_end.x)

	svg += `<polygon points="${v_a_end.x},${v_a_end.y} ${v_right.x},${v_right.y} ${v_b_end.x},${v_b_end.y}" fill="#FAFAFA" stroke="#333333" stroke-width="2"/>`

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
