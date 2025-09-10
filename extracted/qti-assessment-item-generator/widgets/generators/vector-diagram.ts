import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { theme } from "@/lib/widgets/utils/theme"

// Factory functions to avoid schema instance reuse
function createVectorSchema() {
	return z.object({
		id: z.string().describe("Unique identifier for this vector"),
		start: z.object({
			x: z.number().describe("Starting x coordinate"),
			y: z.number().describe("Starting y coordinate")
		}).describe("Starting point of the vector"),
		end: z.object({
			x: z.number().describe("Ending x coordinate"), 
			y: z.number().describe("Ending y coordinate")
		}).describe("Ending point of the vector"),
		color: z.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.default("#0066cc")
			.describe("Color of the vector line and arrow"),
		strokeWidth: z.number()
			.positive()
			.default(2)
			.describe("Width of the vector line in pixels"),
		showArrow: z.boolean()
			.default(true)
			.describe("Whether to show an arrowhead at the end of the vector"),
		arrowSize: z.number()
			.positive()
			.default(8)
			.describe("Size of the arrowhead in pixels")
	}).strict()
}

function createMarkerSchema() {
	return z.object({
		id: z.string().describe("Unique identifier for this marker"),
		position: z.object({
			x: z.number().describe("X coordinate of the marker"),
			y: z.number().describe("Y coordinate of the marker")
		}).describe("Position of the marker"),
		shape: z.enum(["circle", "square", "rightAngle"]).default("circle").describe("Shape of the marker - rightAngle creates a 90-degree angle indicator"),
		size: z.number().positive().default(6).describe("Size of the marker in pixels (or side length for rightAngle)"),
		color: z.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color")
			.default("#0066cc")
			.describe("Color of the marker")
	}).strict()
}

export const VectorDiagramPropsSchema = z.object({
	type: z.literal("vectorDiagram").describe("Identifies this as a vector diagram widget"),
	width: z.number().positive().describe("Total width of the diagram in pixels"),
	height: z.number().positive().describe("Total height of the diagram in pixels"),
	gridSpacing: z.number().positive().default(20).describe("Spacing between grid lines in pixels"),
	showGrid: z.boolean().default(true).describe("Whether to show the background grid"),
	gridColor: z.string()
		.regex(CSS_COLOR_PATTERN, "invalid css color")
		.default("#e0e0e0")
		.describe("Color of the grid lines"),
	vectors: z.array(createVectorSchema()).describe("Array of vectors to draw"),
	markers: z.array(createMarkerSchema()).default([]).describe("Array of markers to place on the diagram")
}).strict().describe(
	"Creates a vector diagram with a clean grid background and customizable vector arrows. Perfect for physics diagrams, force diagrams, and mathematical vector illustrations."
)

export type VectorDiagramProps = z.infer<typeof VectorDiagramPropsSchema>

export const generateVectorDiagram: WidgetGenerator<typeof VectorDiagramPropsSchema> = async (props) => {
	const { width, height, gridSpacing, showGrid, gridColor, vectors, markers } = props

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// Draw grid background if enabled
	if (showGrid) {
		// Vertical grid lines
		for (let x = 0; x <= width; x += gridSpacing) {
			canvas.drawLine(x, 0, x, height, {
				stroke: gridColor,
				strokeWidth: 1
			})
		}
		
		// Horizontal grid lines  
		for (let y = 0; y <= height; y += gridSpacing) {
			canvas.drawLine(0, y, width, y, {
				stroke: gridColor,
				strokeWidth: 1
			})
		}
	}

	// Draw markers first (so they appear underneath vectors)
	for (const marker of markers) {
		if (marker.shape === "circle") {
			canvas.drawCircle(marker.position.x, marker.position.y, marker.size, {
				fill: marker.color,
				stroke: marker.color,
				strokeWidth: 1
			})
		} else if (marker.shape === "square") {
			const halfSize = marker.size / 2
			canvas.drawRect(
				marker.position.x - halfSize,
				marker.position.y - halfSize,
				marker.size,
				marker.size,
				{
					fill: marker.color,
					stroke: marker.color,
					strokeWidth: 1
				}
			)
		} else if (marker.shape === "rightAngle") {
			// Draw a small square in the upper-right quadrant to indicate 90-degree angle
			const offset = marker.size / 2
			canvas.drawRect(
				marker.position.x,
				marker.position.y - offset,
				offset,
				offset,
				{
					fill: "none",
					stroke: marker.color,
					strokeWidth: 2
				}
			)
		}
	}

	// Create arrow markers for vectors
	const arrowMarkers = new Set<string>()
	for (const vector of vectors) {
		if (vector.showArrow) {
			const markerId = `arrow-${vector.id}`
			if (!arrowMarkers.has(markerId)) {
				canvas.addDef(
					`<marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="${vector.arrowSize}" markerHeight="${vector.arrowSize}" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${vector.color}"/></marker>`
				)
				arrowMarkers.add(markerId)
			}
		}
	}

	// Draw vectors (on top of markers)
	for (const vector of vectors) {
		const markerEnd = vector.showArrow ? `url(#arrow-${vector.id})` : undefined
		
		canvas.drawLine(
			vector.start.x,
			vector.start.y,
			vector.end.x,
			vector.end.y,
			{
				stroke: vector.color,
				strokeWidth: vector.strokeWidth,
				markerEnd: markerEnd,
				strokeLinecap: "round"
			}
		)
	}

	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}
