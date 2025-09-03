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

// New side-centric square and side schemas
const SquarePropsSchema = z
	.object({
		area: z
			.union([z.number(), z.string()])
			.describe(
				"Area text rendered inside the square (e.g., 144, 25, 'x', 'c²'). Must be a number or string."
			),
		color: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe(
				"Fill color for this square (e.g., '#A5D6A7', '#90CAF9', '#FFE082'). Should contrast with text and background."
			)
	})
	.strict()

const TriangleSidePropsSchema = z
	.object({
		label: z
			.string()
			.nullable()
			.optional()
			.describe(
				"Optional text label for this triangle side (e.g., 'a', 'b', 'c', '5', '13'). Null or omit to hide."
			),
		square: SquarePropsSchema
			.nullable()
			.optional()
			.describe("Optional square attached to this side. Null or omit to hide the square.")
	})
	.strict()

// Back-compat schema (old square-centric shape)
const OldPythagoreanPropsSchema = z
	.object({
		type: z.literal("pythagoreanProofDiagram"),
		width: z.number().positive(),
		height: z.number().positive(),
		squareA: createSideSquareSchema(),
		squareB: createSideSquareSchema(),
		squareC: createSideSquareSchema()
	})
	.strict()

// New side-centric schema
const NewPythagoreanPropsSchema = z
	.object({
		type: z
			.literal("pythagoreanProofDiagram")
			.describe(
				"Identifies this as a Pythagorean proof diagram widget demonstrating a² + b² = c²."
			),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 600). Must accommodate squares and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 400, 500, 600). Should balance with width for proportions."
			),
		sideA: TriangleSidePropsSchema.describe(
			"First leg (a) of the right triangle, with optional label and optional attached square."
		),
		sideB: TriangleSidePropsSchema.describe(
			"Second leg (b) of the right triangle, with optional label and optional attached square."
		),
		sideC: TriangleSidePropsSchema.describe(
			"Hypotenuse (c) of the right triangle, with optional label and optional attached square."
		)
	})
	.strict()
	.describe(
		"Side-centric Pythagorean diagram schema: each side may have a label and/or a square. Renders 1–3 squares and labels; supports numeric or string area labels; computes a single missing numeric area via a² + b² = c² when possible."
	)

export const PythagoreanProofDiagramPropsSchema = NewPythagoreanPropsSchema

export type PythagoreanProofDiagramProps = z.infer<typeof PythagoreanProofDiagramPropsSchema>

/**
 * Generates a visual diagram to illustrate the Pythagorean theorem by rendering a
 * right triangle with a square constructed on each side, labeled with its area.
 */
export const generatePythagoreanProofDiagram: WidgetGenerator<typeof PythagoreanProofDiagramPropsSchema> = (data) => {
	const { width, height, sideA, sideB, sideC } = data

	const aArea = sideA?.square?.area
	const bArea = sideB?.square?.area
	const cArea = sideC?.square?.area

	const aAreaNum = typeof aArea === "number" && aArea > 0 ? (aArea as number) : undefined
	const bAreaNum = typeof bArea === "number" && bArea > 0 ? (bArea as number) : undefined
	const cAreaNum = typeof cArea === "number" && cArea > 0 ? (cArea as number) : undefined

	let aLen: number | undefined = aAreaNum !== undefined ? Math.sqrt(aAreaNum) : undefined
	let bLen: number | undefined = bAreaNum !== undefined ? Math.sqrt(bAreaNum) : undefined
	let cLen: number | undefined = cAreaNum !== undefined ? Math.sqrt(cAreaNum) : undefined

	if (aLen === undefined && bAreaNum !== undefined && cAreaNum !== undefined && cAreaNum > bAreaNum) {
		aLen = Math.sqrt(cAreaNum - bAreaNum)
	}
	if (bLen === undefined && aAreaNum !== undefined && cAreaNum !== undefined && cAreaNum > aAreaNum) {
		bLen = Math.sqrt(cAreaNum - aAreaNum)
	}
	if (cLen === undefined && aAreaNum !== undefined && bAreaNum !== undefined) {
		cLen = Math.sqrt(aAreaNum + bAreaNum)
	}

	// Provide visual defaults if we cannot derive both legs
	const defaultLen = Math.min(width, height) * 0.25
	const resolvedA = aLen ?? defaultLen
	const resolvedB = bLen ?? defaultLen
	const resolvedC = cLen ?? Math.sqrt(resolvedA * resolvedA + resolvedB * resolvedB)
	const a = resolvedA
	const b = resolvedB
	const c = resolvedC

	// Calculate the exact bounds needed for the entire diagram
	// The width needs: triangle width (a) + square B width (b) = a + b
	// The height needs: triangle height (b) + square A height (a) = a + b
	// Plus the hypotenuse square extends diagonally, adding c to both dimensions
	const includeHypSquare = Boolean(sideC?.square)
	const requiredWidth = a + b + (includeHypSquare ? c : 0)
	const requiredHeight = a + b + (includeHypSquare ? c : 0)
	const maxDim = Math.max(requiredWidth, requiredHeight)
	const scale = (Math.min(width, height) * 0.9) / maxDim // 0.9 for padding

	const sa = a * scale
	const sb = b * scale
	const sc = c * scale

	// Center the entire diagram
	const totalWidth = (a + b + (includeHypSquare ? c : 0)) * scale
	const totalHeight = (a + b + (includeHypSquare ? c : 0)) * scale
	const offsetX = (width - totalWidth) / 2 + (includeHypSquare ? sc : 0)
	const offsetY = (height - totalHeight) / 2 + (includeHypSquare ? sc : 0)

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

	const formatArea = (value: string | number): string => {
		return typeof value === "number" ? String(Math.round(value)) : String(value)
	}

	// Convert simple caret exponents to unicode superscripts (e.g., b^2 => b², x^{10} => x¹⁰)
	const toSuperscript = (input: string): string => {
		const supMap: Record<string, string> = {
			"0": "⁰",
			"1": "¹",
			"2": "²",
			"3": "³",
			"4": "⁴",
			"5": "⁵",
			"6": "⁶",
			"7": "⁷",
			"8": "⁸",
			"9": "⁹",
			"+": "⁺",
			"-": "⁻",
			"=": "⁼",
			"(": "⁽",
			")": "⁾"
		}
		const replaceSeq = (seq: string): string => seq.split("").map((ch) => supMap[ch] ?? ch).join("")
		// ^{...}
		let out = input.replace(/\^\{([^}]+)\}/g, (_, grp: string) => replaceSeq(grp))
		// ^x (single token of digits/sign)
		out = out.replace(/\^(\d[\d+\-]*)/g, (_, grp: string) => replaceSeq(grp))
		return out
	}

	const computeSquareFontPx = (sidePx: number, text: string): number => {
		// Heuristic: try to keep text within 70% of side width
		const len = Math.max(1, text.length)
		const base = Math.floor((sidePx * 0.7) / len)
		return Math.max(10, Math.min(16, base))
	}

	// (Grids removed)

	// --- Square C (Hypotenuse) ---
	if (sideC?.square) {
		const hypVec = { x: v_b_end.x - v_a_end.x, y: v_b_end.y - v_a_end.y }
		const perpVec = { x: hypVec.y, y: -hypVec.x }
		const v_c1 = { x: v_b_end.x + perpVec.x, y: v_b_end.y + perpVec.y }
		const v_c2 = { x: v_a_end.x + perpVec.x, y: v_a_end.y + perpVec.y }

		const squareCPoints = [
			{ x: v_a_end.x, y: v_a_end.y },
			{ x: v_b_end.x, y: v_b_end.y },
			{ x: v_c1.x, y: v_c1.y },
			{ x: v_c2.x, y: v_c2.y }
		]
		canvas.drawPolygon(squareCPoints, {
			fill: sideC.square.color,
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thin
		})

		// (No grid lines)

		const centerC = { x: (v_a_end.x + v_c1.x) / 2, y: (v_a_end.y + v_c1.y) / 2 }
		const displayCArea: string | number =
			typeof sideC.square.area === "string"
				? sideC.square.area
				: typeof sideC.square.area === "number" && sideC.square.area > 0
					? sideC.square.area
					: c * c
		const cText = toSuperscript(formatArea(displayCArea))
		canvas.drawText({
			x: centerC.x,
			y: centerC.y,
			text: cText,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: computeSquareFontPx(sc, cText),
			fontWeight: "700"
		})
	}

	// --- Square B (on leg 'b') ---
	if (sideB?.square) {
		const rectB_x = v_right.x
		const rectB_y = v_b_end.y

		canvas.drawRect(rectB_x, rectB_y, sb, sb, {
			fill: sideB.square.color,
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thin
		})

		// (No grid lines)

		const centerB = { x: v_right.x + sb / 2, y: v_b_end.y + sb / 2 }
		const displayBArea: string | number =
			typeof sideB.square.area === "string"
				? sideB.square.area
				: typeof sideB.square.area === "number" && sideB.square.area > 0
					? sideB.square.area
					: b * b
		const bText = toSuperscript(formatArea(displayBArea))
		canvas.drawText({
			x: centerB.x,
			y: centerB.y,
			text: bText,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: computeSquareFontPx(sb, bText),
			fontWeight: "700"
		})
	}

	// --- Square A (on leg 'a') ---
	if (sideA?.square) {
		const rectA_x = v_a_end.x
		const rectA_y = v_a_end.y

		canvas.drawRect(rectA_x, rectA_y, sa, sa, {
			fill: sideA.square.color,
			stroke: theme.colors.axis,
			strokeWidth: theme.stroke.width.thin
		})

		// (No grid lines)

		const centerA = { x: v_a_end.x + sa / 2, y: v_a_end.y + sa / 2 }
		const displayAArea: string | number =
			typeof sideA.square.area === "string"
				? sideA.square.area
				: typeof sideA.square.area === "number" && sideA.square.area > 0
					? sideA.square.area
					: a * a
		const aText = toSuperscript(formatArea(displayAArea))
		canvas.drawText({
			x: centerA.x,
			y: centerA.y,
			text: aText,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: computeSquareFontPx(sa, aText),
			fontWeight: "700"
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
		strokeWidth: theme.stroke.width.thick
	})

	// Right-angle marker at v_right (small square inside the triangle)
	const markerSize = Math.max(6, Math.round(Math.min(sa, sb) * 0.1))
	const raPoints = [
		{ x: v_right.x - markerSize, y: v_right.y },
		{ x: v_right.x - markerSize, y: v_right.y - markerSize },
		{ x: v_right.x, y: v_right.y - markerSize },
		{ x: v_right.x, y: v_right.y }
	]
	canvas.drawPolygon(raPoints, {
		fill: theme.colors.background,
		stroke: theme.colors.axis,
		strokeWidth: theme.stroke.width.thick
	})

	// Side labels independent of squares
	if (sideC?.label) {
		const midHyp = { x: (v_a_end.x + v_b_end.x) / 2, y: (v_a_end.y + v_b_end.y) / 2 }
		const hypVec = { x: v_b_end.x - v_a_end.x, y: v_b_end.y - v_a_end.y }
		const perp = { x: hypVec.y, y: -hypVec.x }
		const perpLen = Math.hypot(perp.x, perp.y) || 1
		const labelOffset = 14
		const labelPos = { x: midHyp.x + (perp.x / perpLen) * labelOffset, y: midHyp.y + (perp.y / perpLen) * labelOffset }
		canvas.drawText({
			x: labelPos.x,
			y: labelPos.y,
			text: sideC.label,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: 14
		})
	}
	if (sideB?.label) {
		const midB = { x: (v_right.x + v_b_end.x) / 2, y: (v_right.y + v_b_end.y) / 2 }
		canvas.drawText({
			x: midB.x + 10,
			y: midB.y,
			text: sideB.label,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: 14
		})
	}
	if (sideA?.label) {
		const midA = { x: (v_right.x + v_a_end.x) / 2, y: (v_right.y + v_a_end.y) / 2 }
		canvas.drawText({
			x: midA.x,
			y: midA.y + 10,
			text: sideA.label,
			anchor: "middle",
			dominantBaseline: "middle",
			fontPx: 14
		})
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}
