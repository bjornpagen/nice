import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties for a cylinder
const CylinderDataSchema = z.object({
	type: z.literal("cylinder"),
	radius: z.number().describe("The radius of the circular bases."),
	height: z.number().describe("The perpendicular distance between the two bases.")
})

// Defines the properties for a cone
const ConeDataSchema = z.object({
	type: z.literal("cone"),
	radius: z.number().describe("The radius of the circular base."),
	height: z.number().describe("The perpendicular height from the base to the apex.")
})

// Defines the properties for a sphere
const SphereDataSchema = z.object({
	type: z.literal("sphere"),
	radius: z.number().describe("The radius of the sphere.")
})

// Defines a label for a dimension like radius or height
const SolidDimensionLabelSchema = z.object({
	target: z.enum(["radius", "height"]).describe("The dimension to label."),
	text: z.string().optional().describe("The text for the label. If omitted, the numerical value will be used.")
})

// The main Zod schema for the geometricSolidDiagram function
export const GeometricSolidDiagramPropsSchema = z
	.object({
		width: z.number().optional().default(150).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(200).describe("The total height of the output SVG container in pixels."),
		shape: z
			.union([CylinderDataSchema, ConeDataSchema, SphereDataSchema])
			.describe("The geometric data defining the solid shape."),
		labels: z.array(SolidDimensionLabelSchema).optional().describe("An array of dimension labels to display.")
	})
	.describe(
		"Generates a 3D diagram of a geometric solid that has at least one curved surface, such as a cylinder, cone, or sphere. The output is an SVG rendering from a perspective view, with hidden edges shown as dashed lines to convey three-dimensional structure. The diagram can include labeled dimensions (e.g., radius, height) with leader lines, making it ideal for problems involving volume or surface area calculations for these specific shapes."
	)

export type GeometricSolidDiagramProps = z.infer<typeof GeometricSolidDiagramPropsSchema>

/**
 * Generates a 3D diagram of a geometric solid with curved surfaces (e.g., cylinder, cone).
 * Supports dimension labels for volume and surface area problems.
 */
export const generateGeometricSolidDiagram: WidgetGenerator<typeof GeometricSolidDiagramPropsSchema> = (data) => {
	const { width, height, shape, labels } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	if (shape.type === "cylinder") {
		const r = shape.radius * 4
		const h = shape.height * 8
		const ry = r * 0.3 // Ellipse perspective ratio
		const cx = width / 2
		const topY = (height - h) / 2
		const bottomY = topY + h

		// Side lines
		svg += `<line x1="${cx - r}" y1="${topY}" x2="${cx - r}" y2="${bottomY}" stroke="black" stroke-width="1.5"/>`
		svg += `<line x1="${cx + r}" y1="${topY}" x2="${cx + r}" y2="${bottomY}" stroke="black" stroke-width="1.5"/>`

		// Bottom base (draw back dashed part first)
		svg += `<path d="M ${cx - r} ${bottomY} A ${r} ${ry} 0 0 0 ${cx + r} ${bottomY}" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="4 2"/>`
		// Bottom base (front solid part)
		svg += `<path d="M ${cx - r} ${bottomY} A ${r} ${ry} 0 0 1 ${cx + r} ${bottomY}" fill="rgba(200, 200, 200, 0.3)" stroke="black" stroke-width="1.5"/>`

		// Top base
		svg += `<ellipse cx="${cx}" cy="${topY}" rx="${r}" ry="${ry}" fill="rgba(220, 220, 220, 0.5)" stroke="black" stroke-width="1.5"/>`

		// Labels
		if (labels) {
			for (const l of labels) {
				if (l.target === "radius") {
					svg += `<line x1="${cx}" y1="${bottomY}" x2="${cx + r}" y2="${bottomY}" stroke="black" stroke-width="1"/>`
					svg += `<text x="${cx + r / 2}" y="${bottomY + 15}" fill="black" text-anchor="middle">${l.text ?? shape.radius}</text>`
				}
				if (l.target === "height") {
					svg += `<line x1="${cx + r + 10}" y1="${topY}" x2="${cx + r + 10}" y2="${bottomY}" stroke="black" stroke-width="1" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
					svg += `<text x="${cx + r + 20}" y="${(topY + bottomY) / 2}" fill="black" dominant-baseline="middle">${l.text ?? shape.height}</text>`
				}
			}
		}

		svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black" /></marker></defs>`
	} else if (shape.type === "cone") {
		const r = shape.radius * 4
		const h = shape.height * 8
		const ry = r * 0.3 // Ellipse perspective ratio
		const cx = width / 2
		const apexY = (height - h) / 2
		const baseY = apexY + h

		// Generator lines
		svg += `<line x1="${cx - r}" y1="${baseY}" x2="${cx}" y2="${apexY}" stroke="black" stroke-width="1.5"/>`
		svg += `<line x1="${cx + r}" y1="${baseY}" x2="${cx}" y2="${apexY}" stroke="black" stroke-width="1.5"/>`

		// Base (draw back dashed part first)
		svg += `<path d="M ${cx - r} ${baseY} A ${r} ${ry} 0 0 0 ${cx + r} ${baseY}" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="4 2"/>`
		// Base (front solid part)
		svg += `<path d="M ${cx - r} ${baseY} A ${r} ${ry} 0 0 1 ${cx + r} ${baseY}" fill="rgba(200, 200, 200, 0.3)" stroke="black" stroke-width="1.5"/>`

		// Labels
		if (labels) {
			for (const l of labels) {
				if (l.target === "radius") {
					svg += `<line x1="${cx}" y1="${baseY}" x2="${cx + r}" y2="${baseY}" stroke="black" stroke-width="1"/>`
					svg += `<text x="${cx + r / 2}" y="${baseY + 15}" fill="black" text-anchor="middle">${l.text ?? shape.radius}</text>`
				}
				if (l.target === "height") {
					svg += `<line x1="${cx + r + 10}" y1="${apexY}" x2="${cx + r + 10}" y2="${baseY}" stroke="black" stroke-width="1" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
					svg += `<text x="${cx + r + 20}" y="${(apexY + baseY) / 2}" fill="black" dominant-baseline="middle">${l.text ?? shape.height}</text>`
				}
			}
		}

		svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black" /></marker></defs>`
	} else if (shape.type === "sphere") {
		const r = shape.radius * 4
		const ry = r * 0.3 // Ellipse perspective ratio for internal equator
		const cx = width / 2
		const cy = height / 2

		// Main sphere outline
		svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(220, 220, 220, 0.5)" stroke="black" stroke-width="1.5"/>`

		// Internal equator for 3D effect (front solid, back dashed)
		svg += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="black" stroke-width="1.5"/>`
		svg += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 0 ${cx + r} ${cy}" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="4 2"/>`

		// Labels
		if (labels) {
			for (const l of labels) {
				if (l.target === "radius") {
					// Draw radius line at an angle to avoid overlapping with the sphere
					const angle = -Math.PI / 4 // 45 degrees up-right
					const endX = cx + r * Math.cos(angle)
					const endY = cy + r * Math.sin(angle)
					svg += `<line x1="${cx}" y1="${cy}" x2="${endX}" y2="${endY}" stroke="black" stroke-width="1"/>`
					// Position text outside the sphere
					const textX = cx + (r + 20) * Math.cos(angle)
					const textY = cy + (r + 20) * Math.sin(angle)
					svg += `<text x="${textX}" y="${textY}" fill="black" text-anchor="middle" dominant-baseline="middle">${l.text ?? shape.radius}</text>`
				}
				// Skip height for sphere
			}
		}
	}

	svg += "</svg>"
	return svg
}
