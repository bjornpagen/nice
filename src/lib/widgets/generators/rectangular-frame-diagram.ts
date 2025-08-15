import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidDimensions = errors.new("invalid frame dimensions")

const DimensionLabel = z
	.object({
		text: z
			.string()
			.describe(
				"The measurement or label text (e.g., '10 cm', '5 m', 'length', 'Area = 50 cm²'). Can include units and mathematical expressions."
			),
		target: z
			.string()
			.describe(
				"Which dimension or face to label: 'height', 'width', 'length', 'thickness', 'top_face', 'front_face', 'side_face', 'bottom_face', 'back_face', 'inner_face'."
			)
	})
	.strict()

const Diagonal = z
	.object({
		fromVertexIndex: z
			.number()
			.int()
			.describe(
				"Starting vertex index (0-based) for the diagonal. Vertices numbered 0-7: outer corners first (0-3), then inner corners (4-7)."
			),
		toVertexIndex: z
			.number()
			.int()
			.describe(
				"Ending vertex index (0-based) for the diagonal. Must be different from fromVertexIndex. Can connect any two vertices."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the diagonal's length (e.g., '15 cm', 'd = 13', '√50', null). Null means no label. Positioned at midpoint."
			),
		style: z
			.enum(["solid", "dashed", "dotted"])
			.describe(
				"Visual style of the diagonal line. 'solid' for main diagonals, 'dashed' for auxiliary lines, 'dotted' for reference lines."
			)
	})
	.strict()

export const RectangularFrameDiagramPropsSchema = z
	.object({
		type: z
			.literal("rectangularFrameDiagram")
			.describe("Identifies this as a 3D rectangular frame (hollow box) diagram."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 500, 600, 400). Must accommodate the 3D projection and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 400, 500, 350). Should fit the isometric view comfortably."
			),
		outerLength: z
			.number()
			.describe(
				"Outer depth/length of the frame in units (e.g., 10, 8, 12.5). The z-axis dimension extending into the page."
			),
		outerWidth: z
			.number()
			.describe(
				"Outer width of the frame in units (e.g., 6, 10, 7.5). The horizontal dimension across the front face."
			),
		outerHeight: z
			.number()
			.describe("Outer height of the frame in units (e.g., 4, 8, 5). The vertical dimension of the frame."),
		thickness: z
			.number()
			.describe(
				"Wall thickness of the hollow frame in units (e.g., 0.5, 1, 2). Subtracts from outer dimensions to create inner cavity."
			),
		labels: z
			.array(DimensionLabel)
			.describe(
				"Labels for edges and faces. Empty array means no labels. Can label dimensions, areas, or custom text on specific parts."
			),
		diagonals: z
			.array(Diagonal)
			.describe(
				"Internal diagonal lines between vertices. Empty array means no diagonals. Useful for showing space diagonals or cross-sections."
			),
		shadedFace: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Face identifier to shade/highlight: 'top_face', 'side_face', 'front_face', 'bottom_face', or null. Null means no shading."
			),
		showHiddenEdges: z
			.boolean()
			.describe(
				"Whether to show edges hidden behind the frame as dashed lines. True for mathematical clarity, false for realistic view."
			)
	})
	.strict()
	.describe(
		"Creates a 3D hollow rectangular frame (box with walls) in isometric projection. Shows inner and outer dimensions with wall thickness. Perfect for volume problems involving hollow objects, surface area of boxes with cavities, or structural engineering concepts. Supports face shading and space diagonals."
	)

export type RectangularFrameDiagramProps = z.infer<typeof RectangularFrameDiagramPropsSchema>

/**
 * This template generates SVG diagrams of three-dimensional hollow rectangular frames
 * (like picture frames with depth). It renders the frame in an isometric view to provide
 * depth perception.
 */
export const generateRectangularFrameDiagram: WidgetGenerator<typeof RectangularFrameDiagramPropsSchema> = (data) => {
	const {
		width,
		height,
		outerLength,
		outerWidth,
		outerHeight,
		thickness,
		labels,
		diagonals,
		shadedFace,
		showHiddenEdges
	} = data

	if (width <= 0 || height <= 0) {
		throw errors.wrap(ErrInvalidDimensions, `width: ${width}, height: ${height}`)
	}

	if (thickness <= 0 || thickness >= Math.min(outerLength, outerWidth, outerHeight)) {
		throw errors.wrap(
			ErrInvalidDimensions,
			`thickness: ${thickness} must be positive and less than all outer dimensions`
		)
	}

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
	} else if (shadedFace !== "") {
		// Default: both faces gray, combined like Khan Academy
		svg += `<path fill="${grayColor}" stroke="#000" d="${combinedSideTopPath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	}

	// Right side face
	if (shadedFace === "bottom_face") {
		svg += `<path fill="${purpleColor}" stroke="#000" d="${rightSidePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	} else if (shadedFace !== "") {
		svg += `<path fill="${grayColor}" stroke="#000" d="${rightSidePath}" stroke-width="2" fill-opacity=".4" stroke-dasharray="0"/>`
	}

	// Render diagonals if any exist
	if (diagonals.length > 0) {
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
	if (labels.length > 0) {
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
