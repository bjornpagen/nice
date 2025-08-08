import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties for a cylinder
const CylinderDataSchema = z
	.object({
		type: z.literal("cylinder"),
		radius: z.number().describe("The radius of the circular bases."),
		height: z.number().describe("The perpendicular distance between the two bases.")
	})
	.strict()

// Defines the properties for a cone
const ConeDataSchema = z
	.object({
		type: z.literal("cone"),
		radius: z.number().describe("The radius of the circular base."),
		height: z.number().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines the properties for a sphere
const SphereDataSchema = z
	.object({
		type: z.literal("sphere"),
		radius: z.number().describe("The radius of the sphere.")
	})
	.strict()

// Defines a label for a dimension like radius or height
const SolidDimensionLabelSchema = z
	.object({
		target: z.enum(["radius", "height"]).describe("The dimension to label."),
		text: z.string().nullable().describe("The text for the label. If omitted, the numerical value will be used.")
	})
	.strict()

// The main Zod schema for the geometricSolidDiagram function
export const GeometricSolidDiagramPropsSchema = z
	.object({
		type: z.literal("geometricSolidDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 150)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200)
			.describe("The total height of the output SVG container in pixels."),
		shape: z
			.discriminatedUnion("type", [CylinderDataSchema, ConeDataSchema, SphereDataSchema])
			.describe("The geometric data defining the solid shape."),
		labels: z.array(SolidDimensionLabelSchema).nullable().describe("An array of dimension labels to display.")
	})
	.strict()
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

	// --- NEW SCALING AND DRAWING LOGIC ---

	const padding = 30 // Increased padding for labels and dimension lines
	const labelSpace = labels ? 40 : 0 // Extra space for external labels
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="black" /></marker></defs>`

	const availableWidth = width - 2 * padding - labelSpace
	const availableHeight = height - 2 * padding - labelSpace

	if (shape.type === "cylinder") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / shape.height)
		const r = shape.radius * scale
		const h = shape.height * scale
		const ry = r * 0.25 // Ellipse perspective ratio

		const cx = width / 2
		const topY = (height - h) / 2
		const bottomY = topY + h

		// Side lines
		svg += `<line x1="${cx - r}" y1="${topY}" x2="${cx - r}" y2="${bottomY}" stroke="black" stroke-width="2"/>`
		svg += `<line x1="${cx + r}" y1="${topY}" x2="${cx + r}" y2="${bottomY}" stroke="black" stroke-width="2"/>`

		// Bottom base (draw back dashed part first, then front solid part)
		svg += `<path d="M ${cx - r} ${bottomY} A ${r} ${ry} 0 0 0 ${cx + r} ${bottomY}" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4 3"/>`
		svg += `<path d="M ${cx - r} ${bottomY} A ${r} ${ry} 0 0 1 ${cx + r} ${bottomY}" fill="rgba(200, 200, 200, 0.2)" stroke="black" stroke-width="2"/>`

		// Top base
		svg += `<ellipse cx="${cx}" cy="${topY}" rx="${r}" ry="${ry}" fill="rgba(220, 220, 220, 0.4)" stroke="black" stroke-width="2"/>`

		if (labels) {
			for (const l of labels) {
				if (l.target === "radius") {
					// Dashed line for radius on the bottom base
					svg += `<line x1="${cx}" y1="${bottomY}" x2="${cx + r}" y2="${bottomY}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
					const textY = Math.min(bottomY + 18, height - 10) // Ensure text stays within bounds
					svg += `<text x="${cx + r / 2}" y="${textY}" fill="black" text-anchor="middle">${l.text ?? shape.radius}</text>`
				}
				if (l.target === "height") {
					// External line with arrows for height
					const lineX = Math.min(cx + r + 15, width - 50) // Ensure it stays within bounds
					svg += `<line x1="${lineX}" y1="${topY}" x2="${lineX}" y2="${bottomY}" stroke="black" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`
					svg += `<text x="${lineX + 10}" y="${height / 2}" fill="black" dominant-baseline="middle">${l.text ?? shape.height}</text>`
				}
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

		// Generator lines
		svg += `<line x1="${cx - r}" y1="${baseY}" x2="${cx}" y2="${apexY}" stroke="black" stroke-width="2"/>`
		svg += `<line x1="${cx + r}" y1="${baseY}" x2="${cx}" y2="${apexY}" stroke="black" stroke-width="2"/>`

		// Base (draw back dashed part first, then front solid part)
		svg += `<path d="M ${cx - r} ${baseY} A ${r} ${ry} 0 0 0 ${cx + r} ${baseY}" fill="none" stroke="black" stroke-width="2" stroke-dasharray="4 3"/>`
		svg += `<path d="M ${cx - r} ${baseY} A ${r} ${ry} 0 0 1 ${cx + r} ${baseY}" fill="rgba(200, 200, 200, 0.2)" stroke="black" stroke-width="2"/>`

		if (labels) {
			for (const l of labels) {
				if (l.target === "radius") {
					// Dashed line from center to right for radius
					svg += `<line x1="${cx}" y1="${baseY}" x2="${cx + r}" y2="${baseY}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
					const textY = Math.min(baseY + 18, height - 10) // Ensure text stays within bounds
					svg += `<text x="${cx + r / 2}" y="${textY}" fill="black" text-anchor="middle">${l.text ?? shape.radius}</text>`
				}
				if (l.target === "height") {
					// Dashed line from apex to center for height
					svg += `<line x1="${cx}" y1="${apexY}" x2="${cx}" y2="${baseY}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
					// Right angle indicator
					const indicatorSize = Math.min(10, r * 0.2)
					svg += `<path d="M ${cx + indicatorSize} ${baseY} L ${cx + indicatorSize} ${baseY - indicatorSize} L ${cx} ${baseY - indicatorSize}" fill="none" stroke="black" stroke-width="1"/>`
					svg += `<text x="${cx - 10}" y="${height / 2}" fill="black" text-anchor="end" dominant-baseline="middle">${l.text ?? shape.height}</text>`
				}
			}
		}
	} else if (shape.type === "sphere") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / (shape.radius * 2))
		const r = shape.radius * scale
		const ry = r * 0.3 // Ellipse perspective ratio for equator

		const cx = width / 2
		const cy = height / 2

		// Main sphere outline
		svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(220, 220, 220, 0.4)" stroke="black" stroke-width="2"/>`

		// Internal equator for 3D effect (dashed back, solid front)
		svg += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 0 ${cx + r} ${cy}" fill="none" stroke="black" stroke-width="1.5" stroke-dasharray="4 3"/>`
		svg += `<path d="M ${cx - r} ${cy} A ${r} ${ry} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="black" stroke-width="1.5"/>`

		if (labels) {
			for (const l of labels) {
				if (l.target === "radius") {
					// Dashed line from center to circumference for radius
					svg += `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="black" stroke-width="1.5" stroke-dasharray="3 2"/>`
					svg += `<text x="${cx + r / 2}" y="${cy - 10}" fill="black" text-anchor="middle">${l.text ?? shape.radius}</text>`
				}
			}
		}
	}

	svg += "</svg>"
	return svg
}
