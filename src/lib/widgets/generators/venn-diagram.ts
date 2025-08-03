import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the vennDiagram function
export const VennDiagramPropsSchema = z
	.object({
		width: z.number().optional().default(350).describe("The total width of the output SVG container in pixels."),
		height: z.number().optional().default(250).describe("The total height of the output SVG container in pixels."),
		circleA: z.object({
			label: z.string().describe('The label for the first circle (e.g., "Have a Dog").'),
			count: z.number().describe("The numerical count for the region unique to this circle (non-overlapping part)."),
			color: z.string().optional().default("rgba(66, 133, 244, 0.5)").describe("The fill color for this circle.")
		}),
		circleB: z.object({
			label: z.string().describe('The label for the second circle (e.g., "Have a Cat").'),
			count: z.number().describe("The numerical count for the region unique to this circle (non-overlapping part)."),
			color: z.string().optional().default("rgba(52, 168, 83, 0.5)").describe("The fill color for this circle.")
		}),
		intersectionCount: z.number().describe("The numerical count for the overlapping region of the two circles."),
		outsideCount: z.number().describe("The numerical count for the region outside of both circles.")
	})
	.describe(
		"This template generates a classic two-circle Venn diagram as an SVG graphic. It is designed to visually represent the relationship between two sets of data. It renders two labeled, overlapping circles and displays the numerical counts for each of the four distinct regions: Circle A only, Circle B only, the intersection, and the region outside both circles. This is ideal for translating set information into a two-way table or for calculating probabilities."
	)

export type VennDiagramProps = z.infer<typeof VennDiagramPropsSchema>

/**
 * This template generates a classic two-circle Venn diagram as an SVG graphic
 * to visually represent the relationship between two sets of data.
 */
export const generateVennDiagram: WidgetGenerator<typeof VennDiagramPropsSchema> = (data) => {
	const { width, height, circleA, circleB, intersectionCount, outsideCount } = data
	const padding = { top: 40, bottom: 40, horizontal: 10 }
	const chartHeight = height - padding.top - padding.bottom

	const r = Math.min(width / 4, chartHeight / 2.5) // Reduced radius for better spacing
	const overlap = r * 0.45 // 45% overlap for balanced spacing
	const cxA = width / 2 - r + overlap
	const cxB = width / 2 + r - overlap
	const cy = padding.top + chartHeight / 2

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg +=
		"<style>.label { font-size: 16px; font-weight: bold; text-anchor: middle; } .count { font-size: 18px; text-anchor: middle; }</style>"

	// Draw containing box
	svg += `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#333333" />`

	// Circles (semi-transparent for overlap visibility)
	svg += `<circle cx="${cxA}" cy="${cy}" r="${r}" fill="${circleA.color}" fill-opacity="0.6" stroke="#333333"/>`
	svg += `<circle cx="${cxB}" cy="${cy}" r="${r}" fill="${circleB.color}" fill-opacity="0.6" stroke="#333333"/>`

	// Labels for circles - positioned farther apart to use side space
	svg += `<text x="${cxA - r * 0.5}" y="${padding.top - 5}" class="label">${circleA.label}</text>` // Moved left
	svg += `<text x="${cxB + r * 0.5}" y="${padding.top - 5}" class="label">${circleB.label}</text>` // Moved right

	// Counts
	// A only
	svg += `<text x="${cxA - r / 2}" y="${cy}" class="count" dominant-baseline="middle">${circleA.count}</text>`
	// B only
	svg += `<text x="${cxB + r / 2}" y="${cy}" class="count" dominant-baseline="middle">${circleB.count}</text>`
	// Intersection
	svg += `<text x="${(cxA + cxB) / 2}" y="${cy}" class="count" dominant-baseline="middle">${intersectionCount}</text>`
	// Outside
	svg += `<text x="${width / 2}" y="${height - padding.bottom / 2}" class="count">${outsideCount}</text>` // Adjusted y position based on padding

	svg += "</svg>"
	return svg
}
