import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels" // NEW
import {
	computeDynamicWidth,
	includePointX,
	includeText,
	initExtents,
	type Extents
} from "@/lib/widgets/utils/layout" // NEW

const Point = z
	.object({
		x: z
			.number()
			.describe(
				"Horizontal coordinate relative to figure's local origin. Can be negative. Figure will be auto-positioned within the layout (e.g., -30, 0, 50, 25.5)."
			),
		y: z
			.number()
			.describe(
				"Vertical coordinate relative to figure's local origin. Can be negative. Positive y is downward (e.g., -20, 0, 40, 15.5)."
			)
	})
	.strict()

const Figure = z
	.object({
		vertices: z
			.array(Point)
			.describe(
				"Ordered array of vertices defining the polygon. Connect in order, closing back to first. Minimum 3 vertices for a valid polygon (e.g., triangle, square, pentagon)."
			),
		fillColor: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe(
				"Hex-only fill color for the polygon interior (e.g., '#E8F4FD', 'transparent' for outline only, '#FFC8004D' for ~30% alpha)."
			),
		strokeColor: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe(
				"Hex-only color for the polygon's border (e.g., '#000000', '#333333', '#00008B'). Set to 'transparent' to hide the outline."
			),
		strokeWidth: z
			.number()
			.min(0)
			.describe(
				"Width of the polygon's border in pixels (e.g., 2 for standard, 3 for bold, 1 for thin). Use 0 for no visible border."
			),
		sideLabels: z
			.array(
				z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			)
			.describe(
				"Labels for each edge of the polygon. Array length should match vertex count. First label is for edge from vertex[0] to vertex[1]. Null for no label on that edge."
			),
		sideLabelOffset: z
			.number()
			.describe(
				"Distance in pixels from edge to place side labels. Positive places outside, negative inside (e.g., 15, -10, 20). Applies to all side labels."
			),
		figureLabel: z
			.object({
				text: z
					.string()
					.describe(
						"Main label for the entire figure (e.g., 'Figure A', 'Original', 'Square', '64 cm²'). Can include math notation or symbols."
					),
				position: z
					.enum(["top", "bottom", "left", "right", "center"])
					.describe(
						"Where to place the label relative to the figure. 'center' places inside the polygon, others place outside."
					),
				offset: z
					.number()
					.describe(
						"Additional spacing in pixels from the figure's edge or center (e.g., 10, 20, 5). For 'center', this has no effect."
					)
			})
			.strict()
			.describe("Configuration for the figure's main identifying label.")
	})
	.strict()

export const FigureComparisonDiagramPropsSchema = z
	.object({
		type: z
			.literal("figureComparisonDiagram")
			.describe("Identifies this as a figure comparison diagram for displaying multiple polygons side by side."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 600, 800, 500). Must accommodate all figures with spacing and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 400, 300, 500). Must accommodate all figures with spacing and labels."
			),
		figures: z
			.array(Figure)
			.describe(
				"Array of polygonal figures to display. Can show different shapes or same shape with different properties. Order determines left-to-right or top-to-bottom placement."
			),
		layout: z
			.enum(["horizontal", "vertical"])
			.describe(
				"Arrangement direction. 'horizontal' places figures left to right. 'vertical' stacks figures top to bottom. Choose based on figure count and aspect ratios."
			),
		spacing: z
			.number()
			.min(0)
			.describe(
				"Gap between figures in pixels (e.g., 50, 80, 30). Provides visual separation. Larger spacing prevents label overlap."
			)
	})
	.strict()
	.describe(
		"Creates a comparison view of multiple polygonal figures with comprehensive labeling options. Perfect for showing transformations, comparing shapes, demonstrating congruence/similarity, or analyzing different polygons. Each figure can have different styling and complete edge/vertex labeling."
	)

export type FigureComparisonDiagramProps = z.infer<typeof FigureComparisonDiagramPropsSchema>

/**
 * Generates diagrams for comparing multiple independent geometric figures.
 * Perfect for scale copies, similarity problems, and geometric comparisons.
 */
export const generateFigureComparisonDiagram: WidgetGenerator<typeof FigureComparisonDiagramPropsSchema> = (data) => {
	const { width, height, figures, layout, spacing } = data

	if (figures.length === 0) return `<svg width="${width}" height="${height}" />`

	// Calculate bounding boxes for each figure
	const figureBounds = figures.map((figure) => {
		const xs = figure.vertices.map((v) => v.x)
		const ys = figure.vertices.map((v) => v.y)
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
			width: Math.max(...xs) - Math.min(...xs),
			height: Math.max(...ys) - Math.min(...ys)
		}
	})

	// Calculate total dimensions needed
	const padding = 30
	const totalFigureSpacing = (figures.length - 1) * spacing
	const maxFigureWidth = Math.max(...figureBounds.map((b) => b.width))
	const maxFigureHeight = Math.max(...figureBounds.map((b) => b.height))

	let totalContentWidth: number
	let totalContentHeight: number

	if (layout === "horizontal") {
		totalContentWidth = figureBounds.reduce((sum, b) => sum + b.width, 0) + totalFigureSpacing
		totalContentHeight = maxFigureHeight
	} else {
		totalContentWidth = maxFigureWidth
		totalContentHeight = figureBounds.reduce((sum, b) => sum + b.height, 0) + totalFigureSpacing
	}

	// Calculate scale to fit within the specified dimensions
	const availableWidth = width - 2 * padding
	const availableHeight = height - 2 * padding
	const scaleX = availableWidth / totalContentWidth
	const scaleY = availableHeight / totalContentHeight
	const scale = Math.min(scaleX, scaleY, 1) // Don't scale up, only down

	// Calculate scaled dimensions
	const scaledContentWidth = totalContentWidth * scale
	const scaledContentHeight = totalContentHeight * scale

	// Start SVG with proper viewBox
	const viewBoxX = 0
	const viewBoxY = 0
	const viewBoxWidth = width
	const viewBoxHeight = height
	
	const ext = initExtents(width) // NEW: Initialize extents
	let svgBody = ""

	// Calculate starting position to center the content
	const startX = (width - scaledContentWidth) / 2
	const startY = (height - scaledContentHeight) / 2

	// Draw each figure
	let currentX = startX
	let currentY = startY

	for (let i = 0; i < figures.length; i++) {
		const figure = figures[i]
		const bounds = figureBounds[i]
		if (!figure || !bounds) continue

		// Calculate offset to position this figure
		const offsetX = currentX - bounds.minX * scale
		const offsetY = currentY - bounds.minY * scale

		// Draw the figure
		svgBody += drawFigure(figure, offsetX, offsetY, scale, ext) // MODIFIED: Pass extents

		// Move to next position
		if (layout === "horizontal") {
			currentX += bounds.width * scale + spacing * scale
		} else {
			currentY += bounds.height * scale + spacing * scale
		}
	}

	// NEW: Apply dynamic width at the end
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${viewBoxHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}

/**
 * Draws a single figure with all its properties
 */
function drawFigure(figure: z.infer<typeof Figure>, offsetX: number, offsetY: number, scale: number, ext: Extents): string { // MODIFIED: Accept extents
	let svg = ""

	// Transform vertices
	const transformedVertices = figure.vertices.map((v) => ({
		x: v.x * scale + offsetX,
		y: v.y * scale + offsetY
	}))

	// --- ADDED ---
	// Track all transformed vertices to ensure the figure is within the dynamic bounds
	for (const vertex of transformedVertices) {
		includePointX(ext, vertex.x)
	}
	// --- END ADDED ---

	// Draw the figure shape
	const points = transformedVertices.map((v) => `${v.x},${v.y}`).join(" ")
	const fillAttr = `fill="${figure.fillColor}"`
	const strokeWidth = figure.strokeWidth * scale

	svg += `<polygon points="${points}" ${fillAttr} stroke="${figure.strokeColor}" stroke-width="${strokeWidth}"/>`

	// Draw side labels
	for (let i = 0; i < Math.min(figure.sideLabels.length, transformedVertices.length); i++) {
		const rawLabel = figure.sideLabels[i]
		if (!rawLabel) continue
		const label = abbreviateMonth(rawLabel) // MODIFIED: Abbreviate

		const from = transformedVertices[i]
		const to = transformedVertices[(i + 1) % transformedVertices.length]
		if (!from || !to) continue

		// Calculate midpoint
		const midX = (from.x + to.x) / 2
		const midY = (from.y + to.y) / 2

		// Calculate perpendicular offset for label placement
		const dx = to.x - from.x
		const dy = to.y - from.y
		const length = Math.sqrt(dx * dx + dy * dy)
		const normalX = -dy / length
		const normalY = dx / length

		// Determine outward direction
		const centerX = transformedVertices.reduce((sum, v) => sum + v.x, 0) / transformedVertices.length
		const centerY = transformedVertices.reduce((sum, v) => sum + v.y, 0) / transformedVertices.length
		const toCenterX = centerX - midX
		const toCenterY = centerY - midY
		const dotProduct = normalX * toCenterX + normalY * toCenterY

		// Flip normal if it points toward center
		const outwardNormalX = dotProduct > 0 ? -normalX : normalX
		const outwardNormalY = dotProduct > 0 ? -normalY : normalY

		const labelOffset = figure.sideLabelOffset * scale
		const labelX = midX + outwardNormalX * labelOffset
		const labelY = midY + outwardNormalY * labelOffset

		const fontSize = Math.max(10, 14 * scale)
		svg += `<text x="${labelX}" y="${labelY}" fill="${figure.strokeColor}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold">${label}</text>`
		includeText(ext, labelX, label, "middle") // NEW: Track text
	}

	// Draw figure label
	const bounds = {
		minX: Math.min(...transformedVertices.map((v) => v.x)),
		maxX: Math.max(...transformedVertices.map((v) => v.x)),
		minY: Math.min(...transformedVertices.map((v) => v.y)),
		maxY: Math.max(...transformedVertices.map((v) => v.y))
	}

	const centerX = (bounds.minX + bounds.maxX) / 2
	const centerY = (bounds.minY + bounds.maxY) / 2
	const labelOffset = figure.figureLabel.offset * scale

	let labelX = centerX
	let labelY = centerY

	switch (figure.figureLabel.position) {
		case "top":
			labelY = bounds.minY - labelOffset
			break
		case "bottom":
			labelY = bounds.maxY + labelOffset
			break
		case "left":
			labelX = bounds.minX - labelOffset
			break
		case "right":
			labelX = bounds.maxX + labelOffset
			break
		default:
			// Already set to center
			break
	}

	const rawLabelText = figure.figureLabel.text
	const labelText = abbreviateMonth(rawLabelText) // MODIFIED: Abbreviate

	const fontSize = Math.max(12, 16 * scale)
	svg += `<text x="${labelX}" y="${labelY}" fill="${figure.strokeColor}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold">${labelText}</text>`
	includeText(ext, labelX, labelText, "middle") // NEW: Track text

	return svg
}
