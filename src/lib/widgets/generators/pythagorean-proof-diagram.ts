import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { theme } from "@/lib/widgets/utils/theme"

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

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// Helper function to generate grid lines for a rectangular square
	const generateRectangularGrid = (x: number, y: number, width: number, height: number, sideLength: number): void => {
		const unitSize = width / sideLength

		// Vertical grid lines
		for (let i = 1; i < sideLength; i++) {
			const lineX = x + i * unitSize
			canvas.drawLine(lineX, y, lineX, y + height, { stroke: "#888888", strokeWidth: 0.5, opacity: 0.5 })
		}

		// Horizontal grid lines
		for (let i = 1; i < sideLength; i++) {
			const lineY = y + i * unitSize
			canvas.drawLine(x, lineY, x + width, lineY, { stroke: "#888888", strokeWidth: 0.5, opacity: 0.5 })
		}
	}

	// Helper function to generate grid lines for a rotated square (hypotenuse)
	const generateRotatedGrid = (
		v1: { x: number; y: number },
		v2: { x: number; y: number },
		v4: { x: number; y: number },
		sideLength: number
	): void => {
		// Calculate the basis vectors for the rotated coordinate system
		// v1 -> v2 is one edge, v1 -> v4 is the adjacent perpendicular edge
		const u = { x: (v2.x - v1.x) / sideLength, y: (v2.y - v1.y) / sideLength }
		const v = { x: (v4.x - v1.x) / sideLength, y: (v4.y - v1.y) / sideLength }

		// Generate grid lines parallel to each edge
		for (let i = 1; i < sideLength; i++) {
			// Lines parallel to edge v1-v2
			const start1 = { x: v1.x + i * v.x, y: v1.y + i * v.y }
			const end1 = { x: v2.x + i * v.x, y: v2.y + i * v.y }
			canvas.drawLine(start1.x, start1.y, end1.x, end1.y, { stroke: "#888888", strokeWidth: 0.5, opacity: 0.5 })

			// Lines parallel to edge v1-v4
			const start2 = { x: v1.x + i * u.x, y: v1.y + i * u.y }
			const end2 = { x: v4.x + i * u.x, y: v4.y + i * u.y }
			canvas.drawLine(start2.x, start2.y, end2.x, end2.y, { stroke: "#888888", strokeWidth: 0.5, opacity: 0.5 })
		}
	}

	// --- Square C (Hypotenuse) ---
	const hypVec = { x: v_b_end.x - v_a_end.x, y: v_b_end.y - v_a_end.y } // vector from a_end to b_end
	const perpVec = { x: hypVec.y, y: -hypVec.x } // outward perpendicular vector (flipped to other side)
	const v_c1 = { x: v_b_end.x + perpVec.x, y: v_b_end.y + perpVec.y }
	const v_c2 = { x: v_a_end.x + perpVec.x, y: v_a_end.y + perpVec.y }

	// Canvas automatically tracks extents

	const squareCPoints = [
		{ x: v_a_end.x, y: v_a_end.y },
		{ x: v_b_end.x, y: v_b_end.y },
		{ x: v_c1.x, y: v_c1.y },
		{ x: v_c2.x, y: v_c2.y }
	]
	canvas.drawPolygon(squareCPoints, {
		fill: squareC.color,
		stroke: theme.colors.axis,
		strokeWidth: Number.parseFloat(theme.stroke.width.thin)
	})

	// Add grid lines for square C using helper function
	generateRotatedGrid(v_a_end, v_b_end, v_c2, c)

	const centerC = { x: (v_a_end.x + v_c1.x) / 2, y: (v_a_end.y + v_c1.y) / 2 }
	canvas.drawText({
		x: centerC.x,
		y: centerC.y,
		text: String(squareC.area),
		anchor: "middle",
		dominantBaseline: "middle",
		fontPx: 16,
		fontWeight: "700"
	})
	if (squareC.sideLabel) {
		const midHyp = { x: (v_a_end.x + v_b_end.x) / 2, y: (v_a_end.y + v_b_end.y) / 2 }
		// Place "c" label on the hypotenuse side of the triangle
		canvas.drawText({
			x: midHyp.x,
			y: midHyp.y - 10,
			text: squareC.sideLabel,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: 14
		})
	}

	// --- Square B (on leg 'b') ---
	const rectB_x = v_right.x
	const rectB_y = v_b_end.y
	// Canvas automatically tracks extents

	canvas.drawRect(rectB_x, rectB_y, sb, sb, {
		fill: squareB.color,
		stroke: theme.colors.axis,
		strokeWidth: Number.parseFloat(theme.stroke.width.thin)
	})

	// Add grid lines for square B using helper function
	generateRectangularGrid(v_right.x, v_b_end.y, sb, sb, b)

	const centerB = { x: v_right.x + sb / 2, y: v_b_end.y + sb / 2 }
	canvas.drawText({
		x: centerB.x,
		y: centerB.y,
		text: String(squareB.area),
		anchor: "middle",
		dominantBaseline: "middle",
		fontPx: 16,
		fontWeight: "700"
	})
	if (squareB.sideLabel) {
		const midB = { x: (v_right.x + v_b_end.x) / 2, y: (v_right.y + v_b_end.y) / 2 }
		canvas.drawText({
			x: midB.x + 10,
			y: midB.y,
			text: squareB.sideLabel,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: 14
		})
	}

	// --- Square A (on leg 'a') ---
	const rectA_x = v_a_end.x
	const rectA_y = v_a_end.y
	// Canvas automatically tracks extents

	canvas.drawRect(rectA_x, rectA_y, sa, sa, {
		fill: squareA.color,
		stroke: theme.colors.axis,
		strokeWidth: Number.parseFloat(theme.stroke.width.thin)
	})

	// Add grid lines for square A using helper function
	generateRectangularGrid(v_a_end.x, v_a_end.y, sa, sa, a)

	const centerA = { x: v_a_end.x + sa / 2, y: v_a_end.y + sa / 2 }
	canvas.drawText({
		x: centerA.x,
		y: centerA.y,
		text: String(squareA.area),
		anchor: "middle",
		dominantBaseline: "middle",
		fontPx: 16,
		fontWeight: "700"
	})
	if (squareA.sideLabel) {
		const midA = { x: (v_right.x + v_a_end.x) / 2, y: (v_right.y + v_a_end.y) / 2 }
		canvas.drawText({
			x: midA.x,
			y: midA.y + 10,
			text: squareA.sideLabel,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: 14
		})
	}

	// --- Central Triangle (drawn on top) ---
	// Canvas automatically tracks extents

	const trianglePoints = [
		{ x: v_a_end.x, y: v_a_end.y },
		{ x: v_right.x, y: v_right.y },
		{ x: v_b_end.x, y: v_b_end.y }
	]
	canvas.drawPolygon(trianglePoints, {
		fill: theme.colors.background,
		stroke: theme.colors.axis,
		strokeWidth: Number.parseFloat(theme.stroke.width.thick)
	})

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}
