import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"

export const NPolygonPropsSchema = z
	.object({
		type: z.literal("nPolygon").describe("Identifies this as an n-sided regular polygon widget."),
		width: z.number().positive().describe("Total width of the SVG in pixels."),
		height: z.number().positive().describe("Total height of the SVG in pixels."),
		shape: z
			.enum(["triangle", "square", "rectangle", "pentagon", "hexagon", "heptagon", "octagon"])
			.describe("The specific type of regular polygon to render."),
		fillColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("The hex-only fill color for the polygon.")
	})
	.strict()
	.describe(
		"Renders a simple, filled polygon with a black border. Supports triangle, square, rectangle, pentagon, hexagon, heptagon, and octagon. Rectangle uses the full available space with 4:3 aspect ratio, while others are regular polygons. Does not support labels."
	)

export type NPolygonProps = z.infer<typeof NPolygonPropsSchema>

export const generateNPolygon: WidgetGenerator<typeof NPolygonPropsSchema> = async (props) => {
	const { width, height, shape, fillColor } = props

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	const cx = width / 2
	const cy = height / 2
	const radius = Math.min(width, height) / 2 - PADDING

	const shapeToSides: Record<typeof shape, number> = {
		triangle: 3,
		square: 4,
		rectangle: 4,
		pentagon: 5,
		hexagon: 6,
		heptagon: 7,
		octagon: 8
	}
	const numSides = shapeToSides[shape]

	const points: Array<{ x: number; y: number }> = []

	if (shape === "rectangle") {
		// Rectangle is always wider than tall with a 4:3 aspect ratio
		const availableWidth = width - 2 * PADDING
		const availableHeight = height - 2 * PADDING
		
		// Calculate rectangle size maintaining 4:3 aspect ratio (wider than tall)
		const aspectRatio = 4 / 3
		let rectWidth = availableWidth
		let rectHeight = rectWidth / aspectRatio
		
		// If height exceeds available space, scale based on height
		if (rectHeight > availableHeight) {
			rectHeight = availableHeight
			rectWidth = rectHeight * aspectRatio
		}
		
		const halfWidth = rectWidth / 2
		const halfHeight = rectHeight / 2
		
		points.push(
			{ x: cx - halfWidth, y: cy - halfHeight }, // top-left
			{ x: cx + halfWidth, y: cy - halfHeight }, // top-right
			{ x: cx + halfWidth, y: cy + halfHeight }, // bottom-right
			{ x: cx - halfWidth, y: cy + halfHeight }  // bottom-left
		)
	} else {
		// Regular polygons use circular arrangement
		// Offset angle to orient shapes predictably (e.g., triangle point-up, square flat)
		const angleOffset = shape === "square" ? Math.PI / 4 : -Math.PI / 2
		
		for (let i = 0; i < numSides; i++) {
			const angle = (i / numSides) * 2 * Math.PI + angleOffset
			points.push({
				x: cx + radius * Math.cos(angle),
				y: cy + radius * Math.sin(angle)
			})
		}
	}

	canvas.drawPolygon(points, {
		fill: fillColor,
		stroke: "#000000",
		strokeWidth: 2
	})

	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg">${svgBody}</svg>`
}
