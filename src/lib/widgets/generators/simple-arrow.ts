import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { theme } from "@/lib/widgets/utils/theme"

const PADDING = 20

export const SimpleArrowPropsSchema = z.object({
	type: z.literal("simpleArrow"),
	width: z.number().positive(),
	height: z.number().positive(),
	orientation: z.enum(["vertical", "horizontal"]).default("vertical"),
	direction: z.enum(["forward", "backward", "bidirectional"]).default("forward"),
	color: z.string().default("#333333"),
	strokeWidth: z.number().positive().default(2),
	arrowSize: z.number().positive().default(6),
	// Optional circles along the arrow
	circles: z.array(z.object({
		position: z.number().min(0).max(1), // 0 = start, 1 = end
		radius: z.number().positive().default(4),
		fill: z.string().default("#000000")
	})).default([])
})

export type SimpleArrowProps = z.infer<typeof SimpleArrowPropsSchema>

/**
 * generates a simple arrow with configurable direction, optionally with circles along the line
 */
export const generateSimpleArrow: WidgetGenerator<typeof SimpleArrowPropsSchema> = async (props) => {
	const { width, height, orientation, direction, color, strokeWidth, arrowSize, circles } = props

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// define arrow markers for different directions
	canvas.addDef(
		`<marker id="arrow-forward" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`
	)
	canvas.addDef(
		`<marker id="arrow-backward" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="${arrowSize}" markerHeight="${arrowSize}" orient="auto"><path d="M 10 0 L 0 5 L 10 10 z" fill="${color}"/></marker>`
	)

	// determine which markers to use based on direction
	let markerStart: string | undefined
	let markerEnd: string | undefined

	if (direction === "forward") {
		// both arrows point in the forward direction
		markerStart = "url(#arrow-forward)"
		markerEnd = "url(#arrow-forward)"
	} else if (direction === "backward") {
		// both arrows point in the backward direction
		markerStart = "url(#arrow-backward)"
		markerEnd = "url(#arrow-backward)"
	} else if (direction === "bidirectional") {
		// arrows point outward from both ends
		markerStart = "url(#arrow-backward)"
		markerEnd = "url(#arrow-forward)"
	}

	if (orientation === "vertical") {
		const x = width / 2
		const startY = PADDING
		const endY = height - PADDING
		
		// draw vertical line with appropriate arrows
		canvas.drawLine(x, startY, x, endY, {
			stroke: color,
			strokeWidth: strokeWidth,
			markerStart: markerStart,
			markerEnd: markerEnd
		})

		// draw circles along the line
		for (const circle of circles) {
			const circleY = startY + (endY - startY) * circle.position
			canvas.drawCircle(x, circleY, circle.radius, {
				fill: circle.fill,
				stroke: color,
				strokeWidth: 1
			})
		}
	} else {
		const y = height / 2
		const startX = PADDING
		const endX = width - PADDING
		
		// draw horizontal line with appropriate arrows
		canvas.drawLine(startX, y, endX, y, {
			stroke: color,
			strokeWidth: strokeWidth,
			markerStart: markerStart,
			markerEnd: markerEnd
		})

		// draw circles along the line
		for (const circle of circles) {
			const circleX = startX + (endX - startX) * circle.position
			canvas.drawCircle(circleX, y, circle.radius, {
				fill: circle.fill,
				stroke: color,
				strokeWidth: 1
			})
		}
	}

	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}
