import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a dimension label for an edge or a face area
const DimensionLabelSchema = z
	.object({
		text: z.string().describe('The text for the label (e.g., "10 cm", "Area = 9 units²").'),
		target: z
			.string()
			.describe(
				'The specific edge or face to label (e.g., "height", "width", "length", "thickness", "top_face", "front_face").'
			)
	})
	.strict()

// Defines a diagonal line to be drawn between two vertices.
const DiagonalLineSchema = z
	.object({
		fromVertexIndex: z.number().int().min(0).describe("The 0-based index of the starting vertex."),
		toVertexIndex: z.number().int().min(0).describe("The 0-based index of the ending vertex."),
		label: z.string().nullable().describe("An optional text label for the diagonal's length."),
		style: z
			.enum(["solid", "dashed", "dotted"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The visual style of the line.")
	})
	.strict()

// The main Zod schema for the rectangularFrameDiagram function
export const RectangularFrameDiagramPropsSchema = z
	.object({
		type: z.literal("rectangularFrameDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200)
			.describe("The total height of the output SVG container in pixels."),
		outerLength: z.number().describe("The outer length of the frame (depth)."),
		outerWidth: z.number().describe("The outer width of the frame (front-facing dimension)."),
		outerHeight: z.number().describe("The outer height of the frame."),
		thickness: z.number().describe("The thickness of the frame walls."),
		labels: z.array(DimensionLabelSchema).nullable().describe("An array of labels for edge lengths or face areas."),
		diagonals: z
			.array(DiagonalLineSchema)
			.nullable()
			.describe("An optional array of internal diagonals to draw between vertices."),
		shadedFace: z
			.string()
			.nullable()
			.describe('The identifier of a face to shade (e.g., "top_face", "front_face", "side_face", "bottom_face").'),
		showHiddenEdges: z.boolean().describe("If true, render edges hidden from the camera view as dashed lines.")
	})
	.strict()
	.describe(
		"This template generates SVG diagrams of three-dimensional hollow rectangular frames (like picture frames with depth). It renders the frame in an isometric view to provide depth perception. The frame is defined by outer dimensions (length, width, height) and a thickness parameter that creates the hollow interior. The generator provides: Accurate 3D Representation: The frame is drawn with all visible edges as solid lines and hidden edges as dashed lines (toggleable). Dimension Labeling: Can label frame dimensions including height, width, length, and thickness with custom text. Face Highlighting: Supports shading specific faces (front, top, side, bottom) to draw attention to them. Diagonal Lines: Can draw internal diagonals between vertices with optional labels. The output is a clean, mathematically accurate SVG diagram suitable for geometry problems involving hollow rectangular structures."
	)

export type RectangularFrameDiagramProps = z.infer<typeof RectangularFrameDiagramPropsSchema>

/**
 * This template generates SVG diagrams of three-dimensional hollow rectangular frames
 * (like picture frames with depth). It renders the frame in an isometric view to provide
 * depth perception.
 */
export const generateRectangularFrameDiagram: WidgetGenerator<typeof RectangularFrameDiagramPropsSchema> = (data) => {
	const { width, height, outerLength, outerWidth, outerHeight, labels, diagonals, shadedFace, showHiddenEdges } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Scale based on the provided dimensions, similar to Khan Academy approach
	const boxWidth = outerWidth * 25
	const boxHeight = outerHeight * 25
	const boxDepth = outerLength * 20

	// Center the box in the viewBox
	const offsetX = (width - boxWidth - boxDepth) / 2
	const offsetY = (height - boxHeight + boxDepth) / 2

	// Front face coordinates (bottom-left origin)
	const frontLeft = offsetX
	const frontRight = offsetX + boxWidth
	const frontBottom = offsetY + boxHeight
	const frontTop = offsetY

	// Back face coordinates (perspective offset)
	const backLeft = frontLeft + boxDepth
	const backRight = frontRight + boxDepth
	const backBottom = frontBottom - boxDepth * 0.5
	const backTop = frontTop - boxDepth * 0.5

	// Khan Academy style: Use efficient SVG path commands with single paths containing multiple shapes
	// Front face outline (main rectangular face) - exactly like Khan Academy
	svg += `<path fill="none" stroke="#000" d="M${frontLeft} ${frontBottom}h${boxWidth}M${frontRight} ${frontBottom}V${frontTop}M${frontRight} ${frontTop}H${frontLeft}M${frontLeft} ${frontTop}v${boxHeight}" stroke-width="2"/>`

	// Hidden back edges (dashed if enabled) - combined like Khan Academy
	if (showHiddenEdges) {
		svg += `<path fill="none" stroke="#000" d="M${backLeft} ${backBottom}h${boxWidth}" stroke-dasharray="3,1"/>`
		svg += `<path fill="none" stroke="#000" d="M${backRight} ${backBottom}V${backTop}M${backRight} ${backTop}H${backLeft}" stroke-width="2"/>`
		svg += `<path fill="none" stroke="#000" d="M${backLeft} ${backTop}v${boxHeight}M${frontLeft} ${frontBottom}l${boxDepth} ${-boxDepth * 0.5}" stroke-dasharray="3,1"/>`
	}

	// Visible connecting edges (front to back) - combined into single path like Khan Academy
	svg += `<path fill="none" stroke="#000" d="M${frontLeft} ${frontTop}l${boxDepth} ${-boxDepth * 0.5}M${frontRight} ${frontBottom}l${boxDepth} ${-boxDepth * 0.5}M${frontRight} ${frontTop}l${boxDepth} ${-boxDepth * 0.5}" stroke-width="2"/>`

	// Face fills - Khan Academy approach: simple solid shapes, not hollow frames
	const purpleColor = "#7854ab"
	const grayColor = "gray"

	// Front face fill (if shaded)
	if (shadedFace === "front_face") {
		svg += `<path fill="${purpleColor}" stroke="#000" d="M${frontLeft} ${frontBottom}V${frontTop}h${boxWidth}v${boxHeight}z" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	}

	// Combined faces in single paths like Khan Academy - this matches their exact approach
	// Left side face + Top face combined into single path element
	const leftSidePath = `M${frontLeft} ${frontBottom}V${frontTop}l${boxDepth} ${-boxDepth * 0.5}v${boxHeight}z`
	const topFacePath = `M${backLeft} ${backTop}v${boxHeight}h${boxWidth}V${backTop}z`
	const rightSidePath = `M${frontRight} ${frontBottom}V${frontTop}l${boxDepth} ${-boxDepth * 0.5}v${boxHeight}z`

	// Combine left side and top face into single path like Khan Academy does
	const combinedSideTopPath = `${leftSidePath}M${backLeft} ${backTop}v${boxHeight}h${boxWidth}V${backTop}z`

	if (shadedFace === "side_face") {
		svg += `<path fill="${purpleColor}" stroke="#000" d="${leftSidePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
		svg += `<path fill="${grayColor}" stroke="#000" d="${topFacePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	} else if (shadedFace === "top_face") {
		svg += `<path fill="${grayColor}" stroke="#000" d="${leftSidePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
		svg += `<path fill="${purpleColor}" stroke="#000" d="${topFacePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	} else {
		// Default: both faces gray, combined like Khan Academy
		svg += `<path fill="${grayColor}" stroke="#000" d="${combinedSideTopPath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	}

	// Right side face
	if (shadedFace === "bottom_face") {
		svg += `<path fill="${purpleColor}" stroke="#000" d="${rightSidePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	} else {
		svg += `<path fill="${grayColor}" stroke="#000" d="${rightSidePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	}

	// Render diagonals if specified
	if (diagonals) {
		// Define the 8 vertices of the box for diagonal calculations
		const vertices = [
			{ x: frontLeft, y: frontBottom }, // 0: front bottom left
			{ x: frontRight, y: frontBottom }, // 1: front bottom right
			{ x: frontRight, y: frontTop }, // 2: front top right
			{ x: frontLeft, y: frontTop }, // 3: front top left
			{ x: backLeft, y: backBottom }, // 4: back bottom left
			{ x: backRight, y: backBottom }, // 5: back bottom right
			{ x: backRight, y: backTop }, // 6: back top right
			{ x: backLeft, y: backTop } // 7: back top left
		]

		for (const d of diagonals) {
			const from = vertices[d.fromVertexIndex]
			const to = vertices[d.toVertexIndex]
			if (!from || !to) continue

			let strokeDashArray = ""
			if (d.style === "dashed") {
				strokeDashArray = ' stroke-dasharray="4 2"'
			} else if (d.style === "dotted") {
				strokeDashArray = ' stroke-dasharray="2 3"'
			}

			svg += `<path fill="none" stroke="#000" d="M${from.x} ${from.y}L${to.x} ${to.y}" stroke-width="2"${strokeDashArray}/>`

			if (d.label) {
				const midX = (from.x + to.x) / 2
				const midY = (from.y + to.y) / 2
				svg += `<text x="${midX}" y="${midY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="12">${d.label}</text>`
			}
		}
	}

	// Labels for dimensions
	if (labels) {
		for (const lab of labels) {
			if (lab.target === "height") {
				svg += `<text x="${frontLeft - 15}" y="${frontTop + boxHeight / 2}" text-anchor="end" dominant-baseline="middle" font-size="12">${lab.text}</text>`
			}
			if (lab.target === "width") {
				svg += `<text x="${frontLeft + boxWidth / 2}" y="${frontBottom + 20}" text-anchor="middle" font-size="12">${lab.text}</text>`
			}
			if (lab.target === "length") {
				svg += `<text x="${frontRight + boxDepth / 2}" y="${frontBottom - boxDepth * 0.25}" text-anchor="middle" font-size="12">${lab.text}</text>`
			}
			if (lab.target === "thickness") {
				svg += `<text x="${frontLeft + 10}" y="${frontBottom + 15}" text-anchor="start" font-size="10">${lab.text}</text>`
			}
		}
	}

	svg += "</svg>"
	return svg
}
