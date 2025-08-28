import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

const Cylinder = z
	.object({
		type: z.literal("cylinder").describe("Specifies a circular cylinder shape."),
		radius: z
			.number()
			.describe(
				"Radius of the circular base in arbitrary units (e.g., 3, 5, 4.5). The cylinder has uniform circular cross-sections."
			),
		height: z
			.number()
			.describe(
				"Height of the cylinder along its axis in arbitrary units (e.g., 8, 10, 6.5). The distance between the two circular bases."
			)
	})
	.strict()

const Cone = z
	.object({
		type: z.literal("cone").describe("Specifies a circular cone shape."),
		radius: z
			.number()
			.describe(
				"Radius of the circular base in arbitrary units (e.g., 4, 6, 3.5). The base is at the bottom of the cone."
			),
		height: z
			.number()
			.describe(
				"Perpendicular height from base to apex in arbitrary units (e.g., 7, 9, 5.5). Measured along the cone's axis."
			)
	})
	.strict()

const Sphere = z
	.object({
		type: z.literal("sphere").describe("Specifies a perfect sphere shape."),
		radius: z
			.number()
			.describe(
				"Radius of the sphere in arbitrary units (e.g., 5, 8, 4). All points on the surface are equidistant from center."
			)
	})
	.strict()

const DimensionLabel = z
	.object({
		target: z
			.enum(["radius", "height"])
			.describe(
				"Which dimension to label. 'radius' labels the radius/diameter, 'height' labels vertical dimension (not applicable for spheres)."
			),
		text: z
			.string()
			.describe(
				"The label text to display (e.g., 'r = 5', '10 cm', 'h = 8', 'd = 10'). Can include units, equations, or simple values."
			)
	})
	.strict()

export const GeometricSolidDiagramPropsSchema = z
	.object({
		type: z
			.literal("geometricSolidDiagram")
			.describe("Identifies this as a geometric solid diagram showing 3D shapes with dimension labels."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 300, 400, 350). Must accommodate the 3D projection and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 300, 400, 350). Should fit the shape with comfortable padding."
			),
		shape: z
			.discriminatedUnion("type", [Cylinder, Cone, Sphere])
			.describe("The 3D geometric solid to display. Each type has specific dimension requirements."),
		labels: z
			.array(DimensionLabel)
			.describe(
				"Dimension labels to display on the shape. Empty array means no labels. Can label radius, height, or both as appropriate for the shape type."
			)
	})
	.strict()
	.describe(
		"Creates 3D geometric solids (cylinder, cone, sphere) with optional dimension labels. Uses isometric-style projection to show depth. Essential for teaching volume, surface area, and 3D geometry concepts. Labels help identify key measurements for calculations."
	)

export type GeometricSolidDiagramProps = z.infer<typeof GeometricSolidDiagramPropsSchema>

/**
 * Generates a 3D diagram of a geometric solid with curved surfaces (e.g., cylinder, cone).
 * Supports dimension labels for volume and surface area problems.
 */
export const generateGeometricSolidDiagram: WidgetGenerator<typeof GeometricSolidDiagramPropsSchema> = (data) => {
	const { width, height, shape, labels } = data

	// --- NEW SCALING AND DRAWING LOGIC ---

	const labelSpace = labels.length > 0 ? 40 : 0 // Extra space for external labels
	
	const ext = initExtents(width)
	
	let svgBody = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black" /></marker></defs>`

	const availableWidth = width - 2 * PADDING - labelSpace
	const availableHeight = height - 2 * PADDING - labelSpace

	if (shape.type === "cylinder") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / shape.height)
		const r = shape.radius * scale
		const h = shape.height * scale
		const ry = r * 0.25 // Ellipse perspective ratio

		const cx = width / 2
		const topY = (height - h) / 2
		const bottomY = topY + h

		// --- ADDED ---
		includePointX(ext, cx - r)
		includePointX(ext, cx + r)
		// --- END ADDED ---

		// Side lines
		svgBody += `<line x1="${cx - r}" y1="${topY}" x2="${cx - r}" y2="${bottomY}" stroke="black" stroke-width="2"/>`
		svgBody += `<line x1="${cx + r}" y1="${topY}" x2="${cx + r}" y2="${bottomY}" stroke="black" stroke-width="2"/>`

		// Bottom base (draw back dashed part first, then front solid part)
		svgBody += `<path d="M ${cx - r} ${bottomY} A ${r} ${ry} 0 0 0 ${cx + r} ${bottomY}" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4 3"/>`
		svgBody += `<path d="M ${cx - r} ${bottomY} A ${r} ${ry} 0 0 1 ${cx + r} ${bottomY}" fill="rgba(200, 200, 200, 0.2)" stroke="black" stroke-width="2"/>`

		// Top base
		svgBody += `<ellipse cx="${cx}" cy="${topY}" rx="${r}" ry="${ry}" fill="rgba(220, 220, 220, 0.4)" stroke="black" stroke-width="2"/>`

		for (const l of labels) {
			if (l.target === "radius") {
				// Dashed line for radius on the bottom base
				svgBody += `<line x1="${cx}" y1="${bottomY}" x2="${cx + r}" y2="${bottomY}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
				const textY = Math.min(bottomY + 18, height - 10) // Ensure text stays within bounds
				svgBody += `<text x="${cx + r / 2}" y="${textY}" fill="black" text-anchor="middle">${l.text}</text>`
				includeText(ext, cx + r / 2, String(l.text), "middle", 7)
			}
			if (l.target === "height") {
				// External line with arrows for height
				const lineX = Math.min(cx + r + 15, width - 50) // Ensure it stays within bounds
				svgBody += `<line x1="${lineX}" y1="${topY}" x2="${lineX}" y2="${bottomY}" stroke="black" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
				svgBody += `<text x="${lineX + 10}" y="${height / 2}" fill="black" dominant-baseline="middle">${l.text}</text>`
				includeText(ext, lineX + 10, String(l.text), "start", 7)
			}
		}
	} else if (shape.type === "cone") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / shape.height)
		const r = shape.radius * scale
		const h = shape.height * scale
		const ry = r * 0.25 // Ellipse perspective ratio

		const cx = width / 2
		const apexY = (height - h) / 2
		const baseY = apexY + h

		// --- ADDED ---
		includePointX(ext, cx - r)
		includePointX(ext, cx + r)
		// --- END ADDED ---

		// Generator lines
		svgBody += `<line x1="${cx - r}" y1="${baseY}" x2="${cx}" y2="${apexY}" stroke="black" stroke-width="2"/>`
		svgBody += `<line x1="${cx + r}" y1="${baseY}" x2="${cx}" y2="${apexY}" stroke="black" stroke-width="2"/>`

		// Base (draw back dashed part first, then front solid part)
		svgBody += `<path d="M ${cx - r} ${baseY} A ${r} ${ry} 0 0 0 ${cx + r} ${baseY}" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4 3"/>`
		svgBody += `<path d="M ${cx - r} ${baseY} A ${r} ${ry} 0 0 1 ${cx + r} ${baseY}" fill="rgba(200, 200, 200, 0.2)" stroke="black" stroke-width="2"/>`

		for (const l of labels) {
			if (l.target === "radius") {
				// Dashed line from center to right for radius
				svgBody += `<line x1="${cx}" y1="${baseY}" x2="${cx + r}" y2="${baseY}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
				const textY = Math.min(baseY + 18, height - 10) // Ensure text stays within bounds
				svgBody += `<text x="${cx + r / 2}" y="${textY}" fill="black" text-anchor="middle">${l.text}</text>`
				includeText(ext, cx + r / 2, String(l.text), "middle", 7)
			}
			if (l.target === "height") {
				// Dashed line from apex to center for height
				svgBody += `<line x1="${cx}" y1="${apexY}" x2="${cx}" y2="${baseY}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
				// Right angle indicator
				const indicatorSize = Math.min(10, r * 0.2)
				svgBody += `<path d="M ${cx + indicatorSize} ${baseY} L ${cx + indicatorSize} ${baseY - indicatorSize} L ${cx} ${baseY - indicatorSize}" fill="none" stroke="black" stroke-width="1"/>`
				svgBody += `<text x="${cx - 10}" y="${height / 2}" fill="black" text-anchor="end" dominant-baseline="middle">${l.text}</text>`
				includeText(ext, cx - 10, String(l.text), "end", 7)
			}
		}
	} else if (shape.type === "sphere") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / (shape.radius * 2))
		const r = shape.radius * scale
		const ry = r * 0.3 // Ellipse perspective ratio for equator

		const cx = width / 2
		const cy = height / 2

		// --- ADDED ---
		includePointX(ext, cx - r)
		includePointX(ext, cx + r)
		// --- END ADDED ---

		// Main sphere outline
		svgBody += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(220, 220, 220, 0.4)" stroke="black" stroke-width="2"/>`

		// Internal equator for 3D effect (dashed back, solid front)
		svgBody += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 0 ${cx + r} ${cy}" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="4 3"/>`
		svgBody += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="black" stroke-width="1.5"/>`

		for (const l of labels) {
			if (l.target === "radius") {
				// Dashed line from center to circumference for radius
				svgBody += `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
				svgBody += `<text x="${cx + r / 2}" y="${cy - 10}" fill="black" text-anchor="middle">${l.text}</text>`
				includeText(ext, cx + r / 2, String(l.text), "middle", 7)
			}
		}
	}

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
		+ svgBody
		+ `</svg>`
	return finalSvg
}
