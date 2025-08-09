import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex
const PointSchema = z
	.object({
		x: z.number().describe("The horizontal coordinate of the vertex."),
		y: z.number().describe("The vertical coordinate of the vertex.")
	})
	.strict()

// Defines an independent figure with its own properties
const FigureSchema = z
	.object({
		vertices: z.array(PointSchema).min(3).describe("An array of {x, y} coordinates defining the figure's vertices."),
		fillColor: z
			.string()
			.nullable()
			.describe("The CSS fill color for the figure (e.g., 'rgba(116, 207, 112, 0.3)' or null for no fill)."),
		strokeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "black")
			.describe("The CSS stroke color for the figure outline."),
		strokeWidth: z
			.number()
			.nullable()
			.transform((val) => val ?? 2)
			.describe("The width of the figure outline."),
		sideLabels: z
			.array(
				z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val))
			)
			.nullable()
			.describe("An optional array of labels for each side of the figure. Use null for sides without labels."),
		sideLabelOffset: z
			.number()
			.nullable()
			.transform((val) => val ?? 15)
			.describe("Distance from the edge to place side labels."),
		figureLabel: z
			.object({
				text: z.string().describe('The figure label text (e.g., "Figure A", "Figure B").'),
				position: z
					.enum(["top", "bottom", "left", "right", "center"])
					.nullable()
					.transform((val) => val ?? "bottom")
					.describe("Where to position the figure label relative to the shape."),
				offset: z
					.number()
					.nullable()
					.transform((val) => val ?? 20)
					.describe("Distance from the shape to place the figure label.")
			})
			.nullable()
			.describe("An optional label for the entire figure.")
	})
	.strict()

// The main schema for figure comparison diagrams
export const FigureComparisonDiagramPropsSchema = z
	.object({
		type: z.literal("figureComparisonDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 220)
			.describe("The total height of the output SVG container in pixels."),
		figures: z.array(FigureSchema).min(1).describe("An array of independent figures to be displayed for comparison."),
		layout: z
			.enum(["horizontal", "vertical"])
			.nullable()
			.transform((val) => val ?? "horizontal")
			.describe("How to arrange the figures relative to each other."),
		spacing: z
			.number()
			.nullable()
			.transform((val) => val ?? 50)
			.describe("The spacing between figures in pixels.")
	})
	.strict()
	.describe(
		"Generates diagrams for comparing multiple independent geometric figures side-by-side or vertically. Perfect for scale copies, similarity problems, and geometric comparisons. Supports labeled sides, figure labels (like 'Figure A', 'Figure B'), different colors for visual distinction, and automatic scaling to fit the container. Ideal for educational content involving proportional reasoning, similar figures, and geometric transformations."
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

	let svg = `<svg width="${width}" height="${viewBoxHeight}" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`

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
		svg += drawFigure(figure, offsetX, offsetY, scale)

		// Move to next position
		if (layout === "horizontal") {
			currentX += bounds.width * scale + spacing * scale
		} else {
			currentY += bounds.height * scale + spacing * scale
		}
	}

	svg += "</svg>"
	return svg
}

/**
 * Draws a single figure with all its properties
 */
function drawFigure(figure: z.infer<typeof FigureSchema>, offsetX: number, offsetY: number, scale: number): string {
	let svg = ""

	// Transform vertices
	const transformedVertices = figure.vertices.map((v) => ({
		x: v.x * scale + offsetX,
		y: v.y * scale + offsetY
	}))

	// Draw the figure shape
	const points = transformedVertices.map((v) => `${v.x},${v.y}`).join(" ")
	const fillAttr = figure.fillColor ? `fill="${figure.fillColor}"` : 'fill="none"'
	const strokeColor = figure.strokeColor ?? "black"
	const strokeWidth = (figure.strokeWidth ?? 2) * scale

	svg += `<polygon points="${points}" ${fillAttr} stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`

	// Draw side labels
	if (figure.sideLabels) {
		for (let i = 0; i < Math.min(figure.sideLabels.length, transformedVertices.length); i++) {
			const label = figure.sideLabels[i]
			if (!label) continue

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

			const labelOffset = (figure.sideLabelOffset ?? 15) * scale
			const labelX = midX + outwardNormalX * labelOffset
			const labelY = midY + outwardNormalY * labelOffset

			const fontSize = Math.max(10, 14 * scale)
			svg += `<text x="${labelX}" y="${labelY}" fill="${strokeColor}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold">${label}</text>`
		}
	}

	// Draw figure label
	if (figure.figureLabel) {
		const bounds = {
			minX: Math.min(...transformedVertices.map((v) => v.x)),
			maxX: Math.max(...transformedVertices.map((v) => v.x)),
			minY: Math.min(...transformedVertices.map((v) => v.y)),
			maxY: Math.max(...transformedVertices.map((v) => v.y))
		}

		const centerX = (bounds.minX + bounds.maxX) / 2
		const centerY = (bounds.minY + bounds.maxY) / 2
		const labelOffset = (figure.figureLabel.offset ?? 20) * scale

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

		const fontSize = Math.max(12, 16 * scale)
		svg += `<text x="${labelX}" y="${labelY}" fill="${strokeColor}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold">${figure.figureLabel.text}</text>`
	}

	return svg
}
