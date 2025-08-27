import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import {
	computeDynamicWidth,
	includePointX,
	includeText,
	initExtents,
} from "@/lib/widgets/utils/layout"

const Parallelogram = z
	.object({
		type: z.literal("parallelogram").describe("Specifies a parallelogram shape."),
		base: z
			.number()
			.positive()
			.describe("Length of the base (bottom side) in arbitrary units (e.g., 8, 10, 6.5). Parallel to the top side."),
		height: z
			.number()
			.positive()
			.describe(
				"Perpendicular distance between parallel sides in arbitrary units (e.g., 5, 7, 4). Not the slanted side length."
			),
		sideLength: z
			.number()
			.positive()
			.describe(
				"Length of the slanted side in arbitrary units (e.g., 6, 8, 5.5). Both slanted sides have equal length."
			),
		labels: z
			.object({
				base: z
					.string()
					.nullable()
					.describe("Label for the base (e.g., '8 cm', 'b', '10'). Null hides label. Positioned below the base."),
				height: z
					.string()
					.nullable()
					.describe("Label for the height (e.g., '5 cm', 'h', '7'). Null hides label. Shows perpendicular distance."),
				sideLength: z
					.string()
					.nullable()
					.describe("Label for the slanted side (e.g., '6 cm', 's', '8'). Null hides label. Positioned along the side.")
			})
			.strict()
			.nullable()
			.describe("Labels for dimensions. Null object hides all labels.")
	})
	.strict()

const RightTrapezoid = z
	.object({
		type: z.literal("trapezoidRight").describe("Specifies a right trapezoid (one perpendicular side)."),
		topBase: z
			.number()
			.positive()
			.describe("Length of the top parallel side in arbitrary units (e.g., 6, 8, 4.5). Usually shorter than bottom."),
		bottomBase: z
			.number()
			.positive()
			.describe("Length of the bottom parallel side in arbitrary units (e.g., 10, 12, 8). Usually longer than top."),
		height: z
			.number()
			.positive()
			.describe(
				"Perpendicular distance between parallel sides in arbitrary units (e.g., 5, 6, 4). Also the length of the left perpendicular side."
			),
		labels: z
			.object({
				topBase: z.string().nullable().describe("Label for top base (e.g., '6 cm', 'a'). Null hides label."),
				bottomBase: z.string().nullable().describe("Label for bottom base (e.g., '10 cm', 'b'). Null hides label."),
				height: z.string().nullable().describe("Label for height/left side (e.g., '5 cm', 'h'). Null hides label."),
				leftSide: z
					.string()
					.nullable()
					.describe("Label for left perpendicular side (e.g., '5 cm', 'h'). Often same as height. Null hides label."),
				rightSide: z
					.string()
					.nullable()
					.describe("Label for right slanted side (e.g., '6.4 cm', 'c'). Null hides label.")
			})
			.strict()
			.nullable()
			.describe("Labels for dimensions. Null object hides all labels.")
	})
	.strict()

const GeneralTrapezoid = z
	.object({
		type: z.literal("trapezoid").describe("Specifies a general trapezoid (both sides slanted)."),
		topBase: z
			.number()
			.positive()
			.describe("Length of the top parallel side in arbitrary units (e.g., 5, 7, 4). Usually shorter than bottom."),
		bottomBase: z
			.number()
			.positive()
			.describe("Length of the bottom parallel side in arbitrary units (e.g., 9, 12, 8). Usually longer than top."),
		height: z
			.number()
			.positive()
			.describe(
				"Perpendicular distance between parallel sides in arbitrary units (e.g., 4, 6, 5). Measured vertically."
			),
		leftSideLength: z
			.number()
			.positive()
			.describe("Length of the left slanted side in arbitrary units (e.g., 5, 7, 4.5). Can differ from right side."),
		labels: z
			.object({
				topBase: z.string().nullable().describe("Label for top base (e.g., '5 cm', 'a'). Null hides label."),
				bottomBase: z.string().nullable().describe("Label for bottom base (e.g., '9 cm', 'b'). Null hides label."),
				height: z
					.string()
					.nullable()
					.describe("Label for perpendicular height (e.g., '4 cm', 'h'). Shows with dashed line. Null hides label."),
				leftSide: z.string().nullable().describe("Label for left slanted side (e.g., '5 cm', 'c'). Null hides label."),
				rightSide: z
					.string()
					.nullable()
					.describe("Label for right slanted side (e.g., '5.5 cm', 'd'). Null hides label.")
			})
			.strict()
			.nullable()
			.describe("Labels for dimensions. Null object hides all labels.")
	})
	.strict()

export const ParallelogramTrapezoidDiagramPropsSchema = z
	.object({
		type: z
			.literal("parallelogramTrapezoidDiagram")
			.describe("Identifies this as a parallelogram or trapezoid diagram widget."),
		width: z
			.number()
			.positive()
			.describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the shape and labels."),
		height: z
			.number()
			.positive()
			.describe("Total height of the diagram in pixels (e.g., 300, 400, 250). Must accommodate the shape and labels."),
		shape: z
			.discriminatedUnion("type", [Parallelogram, RightTrapezoid, GeneralTrapezoid])
			.describe("The specific quadrilateral to draw with its dimensions and labels.")
	})
	.strict()
	.describe(
		"Creates accurate diagrams of parallelograms and trapezoids with labeled dimensions. Supports three types: parallelograms (opposite sides parallel and equal), right trapezoids (one perpendicular side), and general trapezoids (both sides slanted). Essential for geometry education, area calculations, and quadrilateral properties."
	)

export type ParallelogramTrapezoidDiagramProps = z.infer<typeof ParallelogramTrapezoidDiagramPropsSchema>

/**
 * Generates an SVG diagram for a parallelogram or trapezoid directly with layout utilities.
 */
export const generateParallelogramTrapezoidDiagram: WidgetGenerator<typeof ParallelogramTrapezoidDiagramPropsSchema> = (
	props
) => {
	const { width, height, shape } = props
	const ext = initExtents(width)
	let svgContent = ""

	// --- SCALING LOGIC START ---
	const padding = 50 // Generous padding for labels
	const availableWidth = width - padding * 2
	const availableHeight = height - padding * 2

	let shapeWidth = 0
	let shapeHeight = 0

	if (shape.type === "parallelogram") {
		const offset = Math.sqrt(shape.sideLength ** 2 - shape.height ** 2)
		shapeWidth = shape.base + offset
		shapeHeight = shape.height
	} else if (shape.type === "trapezoidRight") {
		// Right trapezoid
		shapeWidth = shape.bottomBase
		shapeHeight = shape.height
	} else {
		// General trapezoid
		shapeWidth = shape.bottomBase
		shapeHeight = shape.height
	}

	const scale = Math.min(availableWidth / shapeWidth, availableHeight / shapeHeight)
	// --- SCALING LOGIC END ---

	// Center the shape in the diagram
	const centerX = width / 2
	const centerY = height / 2

	if (shape.type === "parallelogram") {
		const { base, height: h, sideLength, labels } = shape

		// Validate that side length is at least as long as height for a valid parallelogram
		if (sideLength < h) {
			logger.error("invalid parallelogram dimensions", { sideLength, height: h })
			throw errors.new("side length must be greater than or equal to height for a valid parallelogram")
		}

		const scaledBase = base * scale
		const scaledH = h * scale
		const scaledSide = sideLength * scale
		const scaledOffset = Math.sqrt(scaledSide * scaledSide - scaledH * scaledH)

		// Center the shape
		const shapeActualWidth = scaledBase + scaledOffset
		const xOffset = centerX - shapeActualWidth / 2
		const yOffset = centerY - scaledH / 2

		const vertices = [
			{ x: xOffset, y: yOffset + scaledH }, // 0: Bottom-left
			{ x: xOffset + scaledBase, y: yOffset + scaledH }, // 1: Bottom-right
			{ x: xOffset + scaledBase + scaledOffset, y: yOffset }, // 2: Top-right
			{ x: xOffset + scaledOffset, y: yOffset }, // 3: Top-left
			{ x: xOffset + scaledOffset, y: yOffset + scaledH } // 4: Point for height line base
		]

		// Track all vertices
		vertices.forEach(v => includePointX(ext, v.x))

		// Draw outer boundary polygon
		const outerPoints = [vertices[0], vertices[1], vertices[2], vertices[3]]
			.filter(p => p !== undefined)
			.map(p => `${p.x},${p.y}`)
			.join(" ")
		svgContent += `<polygon points="${outerPoints}" fill="none" stroke="black" stroke-width="2"/>`

		// Draw height line (dashed)
		const v3 = vertices[3]
		const v4 = vertices[4]
		if (v3 && v4) {
			svgContent += `<line x1="${v3.x}" y1="${v3.y}" x2="${v4.x}" y2="${v4.y}" stroke="black" stroke-width="1.5" stroke-dasharray="4 2"/>`
		}

		// Draw right angle marker
		const markerSize = 10
		if (v4) {
			svgContent += `<path d="M ${v4.x - markerSize} ${v4.y} L ${v4.x - markerSize} ${v4.y - markerSize} L ${v4.x} ${v4.y - markerSize}" fill="none" stroke="black" stroke-width="1.5"/>`
		}

		// Draw labels
		// Base label (bottom)
		const baseLabel = labels?.base ?? String(base)
		const baseLabelX = xOffset + scaledBase / 2
		const baseLabelY = yOffset + scaledH + 20
		svgContent += `<text x="${baseLabelX}" y="${baseLabelY}" text-anchor="middle" font-size="14">${baseLabel}</text>`
		includeText(ext, baseLabelX, baseLabel, "middle")

		// Right side label
		const rightLabel = labels?.sideLength ?? String(sideLength)
		const rightLabelX = xOffset + scaledBase + scaledOffset / 2
		const rightLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${rightLabelX + 20}" y="${rightLabelY}" text-anchor="start" font-size="14">${rightLabel}</text>`
		includeText(ext, rightLabelX + 20, rightLabel, "start")

		// Top base label
		const topLabelX = xOffset + scaledOffset + scaledBase / 2
		const topLabelY = yOffset - 10
		svgContent += `<text x="${topLabelX}" y="${topLabelY}" text-anchor="middle" font-size="14">${baseLabel}</text>`
		includeText(ext, topLabelX, baseLabel, "middle")

		// Left side label
		const leftLabel = labels?.sideLength ?? String(sideLength)
		const leftLabelX = xOffset + scaledOffset / 2
		const leftLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${leftLabelX - 20}" y="${leftLabelY}" text-anchor="end" font-size="14">${leftLabel}</text>`
		includeText(ext, leftLabelX - 20, leftLabel, "end")

		// Height label
		const heightLabel = labels?.height ?? String(h)
		if (v3 && v4) {
			const heightLabelX = v3.x + (v4.x - v3.x) / 2 - 10
			const heightLabelY = v3.y + (v4.y - v3.y) / 2
			svgContent += `<text x="${heightLabelX}" y="${heightLabelY}" text-anchor="end" font-size="14">${heightLabel}</text>`
			includeText(ext, heightLabelX, heightLabel, "end")
		}

	} else if (shape.type === "trapezoidRight") {
		// Right trapezoid - left side is perpendicular
		const { topBase, bottomBase, height: h, labels } = shape

		const scaledTop = topBase * scale
		const scaledBottom = bottomBase * scale
		const scaledH = h * scale

		// Center the shape
		const xOffset = centerX - scaledBottom / 2
		const yOffset = centerY - scaledH / 2

		const vertices = [
			{ x: xOffset, y: yOffset + scaledH }, // 0: Bottom-left
			{ x: xOffset + scaledBottom, y: yOffset + scaledH }, // 1: Bottom-right
			{ x: xOffset + scaledTop, y: yOffset }, // 2: Top-right
			{ x: xOffset, y: yOffset }, // 3: Top-left
			{ x: xOffset, y: yOffset + scaledH } // 4: Point for left height
		]

		// Track all vertices
		vertices.forEach(v => includePointX(ext, v.x))

		// Draw outer boundary polygon
		const outerPoints = [vertices[0], vertices[1], vertices[2], vertices[3]]
			.filter(p => p !== undefined)
			.map(p => `${p.x},${p.y}`)
			.join(" ")
		svgContent += `<polygon points="${outerPoints}" fill="none" stroke="black" stroke-width="2"/>`

		// Draw height line (dashed)
		const v3t = vertices[3]
		const v4t = vertices[4]
		if (v3t && v4t) {
			svgContent += `<line x1="${v3t.x}" y1="${v3t.y}" x2="${v4t.x}" y2="${v4t.y}" stroke="black" stroke-width="1.5" stroke-dasharray="4 2"/>`
		}

		// Draw right angle marker
		const markerSize = 10
		if (v4t) {
			svgContent += `<path d="M ${v4t.x} ${v4t.y - markerSize} L ${v4t.x + markerSize} ${v4t.y - markerSize} L ${v4t.x + markerSize} ${v4t.y}" fill="none" stroke="black" stroke-width="1.5"/>`
		}

		const rightOffset = scaledBottom - scaledTop
		const rightSideLengthVal = Math.sqrt(rightOffset * rightOffset + scaledH * scaledH) / scale

		// Draw labels
		// Bottom base label
		const bottomLabel = labels?.bottomBase ?? String(bottomBase)
		const bottomLabelX = xOffset + scaledBottom / 2
		const bottomLabelY = yOffset + scaledH + 20
		svgContent += `<text x="${bottomLabelX}" y="${bottomLabelY}" text-anchor="middle" font-size="14">${bottomLabel}</text>`
		includeText(ext, bottomLabelX, bottomLabel, "middle")

		// Right side label
		const rightLabel = labels?.rightSide ?? String(Number.parseFloat(rightSideLengthVal.toFixed(2)))
		const rightLabelX = xOffset + scaledBottom - rightOffset / 2
		const rightLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${rightLabelX + 20}" y="${rightLabelY}" text-anchor="start" font-size="14">${rightLabel}</text>`
		includeText(ext, rightLabelX + 20, rightLabel, "start")

		// Top base label
		const topLabel = labels?.topBase ?? String(topBase)
		const topLabelX = xOffset + scaledTop / 2
		const topLabelY = yOffset - 10
		svgContent += `<text x="${topLabelX}" y="${topLabelY}" text-anchor="middle" font-size="14">${topLabel}</text>`
		includeText(ext, topLabelX, topLabel, "middle")

		// Left side label
		const leftLabel = labels?.leftSide ?? String(h)
		const leftLabelX = xOffset - 20
		const leftLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${leftLabelX}" y="${leftLabelY}" text-anchor="end" font-size="14">${leftLabel}</text>`
		includeText(ext, leftLabelX, leftLabel, "end")

		// Height label
		const heightLabel = labels?.height ?? String(h)
		const heightLabelX = xOffset - 10
		const heightLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${heightLabelX}" y="${heightLabelY}" text-anchor="end" font-size="14">${heightLabel}</text>`
		includeText(ext, heightLabelX, heightLabel, "end")

	} else {
		// shape.type === "trapezoid" - general trapezoid with both sides slanted
		const { topBase, bottomBase, height: h, leftSideLength, labels } = shape

		const scaledTop = topBase * scale
		const scaledBottom = bottomBase * scale
		const scaledH = h * scale
		const scaledLeft = leftSideLength * scale

		if (scaledLeft < scaledH) {
			logger.error("invalid trapezoid dimensions", { leftSideLength: scaledLeft, height: scaledH })
			throw errors.new("left side length cannot be less than height")
		}

		const leftOffset = Math.sqrt(scaledLeft * scaledLeft - scaledH * scaledH)

		// Center the shape
		const shapeActualWidth = Math.max(scaledBottom, leftOffset + scaledTop)
		const xOffset = centerX - shapeActualWidth / 2
		const yOffset = centerY - scaledH / 2

		const vertices = [
			{ x: xOffset, y: yOffset + scaledH }, // 0: Bottom-left
			{ x: xOffset + scaledBottom, y: yOffset + scaledH }, // 1: Bottom-right
			{ x: xOffset + leftOffset + scaledTop, y: yOffset }, // 2: Top-right
			{ x: xOffset + leftOffset, y: yOffset }, // 3: Top-left
			{ x: xOffset + leftOffset, y: yOffset + scaledH } // 4: Point for left height
		]

		// Track all vertices
		vertices.forEach(v => includePointX(ext, v.x))

		// Draw outer boundary polygon
		const outerPoints = [vertices[0], vertices[1], vertices[2], vertices[3]]
			.filter(p => p !== undefined)
			.map(p => `${p.x},${p.y}`)
			.join(" ")
		svgContent += `<polygon points="${outerPoints}" fill="none" stroke="black" stroke-width="2"/>`

		// Draw height line (dashed)
		const v3g = vertices[3]
		const v4g = vertices[4]
		if (v3g && v4g) {
			svgContent += `<line x1="${v3g.x}" y1="${v3g.y}" x2="${v4g.x}" y2="${v4g.y}" stroke="black" stroke-width="1.5" stroke-dasharray="4 2"/>`
		}

		// Draw right angle marker
		const markerSize = 10
		if (v4g) {
			svgContent += `<path d="M ${v4g.x - markerSize} ${v4g.y} L ${v4g.x - markerSize} ${v4g.y - markerSize} L ${v4g.x} ${v4g.y - markerSize}" fill="none" stroke="black" stroke-width="1.5"/>`
		}

		const rightOffset = scaledBottom - (leftOffset + scaledTop)
		const rightSideLengthVal = Math.sqrt(rightOffset * rightOffset + scaledH * scaledH) / scale

		// Draw labels
		// Bottom base label
		const bottomLabel = labels?.bottomBase ?? String(bottomBase)
		const bottomLabelX = xOffset + scaledBottom / 2
		const bottomLabelY = yOffset + scaledH + 20
		svgContent += `<text x="${bottomLabelX}" y="${bottomLabelY}" text-anchor="middle" font-size="14">${bottomLabel}</text>`
		includeText(ext, bottomLabelX, bottomLabel, "middle")

		// Right side label
		const rightLabel = labels?.rightSide ?? String(Number.parseFloat(rightSideLengthVal.toFixed(2)))
		const rightLabelX = xOffset + scaledBottom - rightOffset / 2
		const rightLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${rightLabelX + 20}" y="${rightLabelY}" text-anchor="start" font-size="14">${rightLabel}</text>`
		includeText(ext, rightLabelX + 20, rightLabel, "start")

		// Top base label
		const topLabel = labels?.topBase ?? String(topBase)
		const topLabelX = xOffset + leftOffset + scaledTop / 2
		const topLabelY = yOffset - 10
		svgContent += `<text x="${topLabelX}" y="${topLabelY}" text-anchor="middle" font-size="14">${topLabel}</text>`
		includeText(ext, topLabelX, topLabel, "middle")

		// Left side label
		const leftLabel = labels?.leftSide ?? String(leftSideLength)
		const leftLabelX = xOffset + leftOffset / 2
		const leftLabelY = yOffset + scaledH / 2
		svgContent += `<text x="${leftLabelX - 20}" y="${leftLabelY}" text-anchor="end" font-size="14">${leftLabel}</text>`
		includeText(ext, leftLabelX - 20, leftLabel, "end")

		// Height label
		const heightLabel = labels?.height ?? String(h)
		if (v3g && v4g) {
			const heightLabelX = v3g.x + (v4g.x - v3g.x) / 2 - 10
			const heightLabelY = v3g.y + (v4g.y - v3g.y) / 2
			svgContent += `<text x="${heightLabelX}" y="${heightLabelY}" text-anchor="end" font-size="14">${heightLabel}</text>`
			includeText(ext, heightLabelX, heightLabel, "end")
		}
	}

	// Final assembly
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, padding)
	let svg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg += svgContent
	svg += "</svg>"

	return svg
}
