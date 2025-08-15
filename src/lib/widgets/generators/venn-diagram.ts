import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

function createCircleSchema() {
	return z
		.object({
			label: z
				.string()
				.nullable()
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
				.describe(
					"Category name for this circle (e.g., 'Has a Dog', 'Likes Pizza', 'Students in Band', 'Even Numbers', null). Keep concise to fit above circle. Null for no label. Plaintext only; no markdown or HTML."
				),
			count: z
				.number()
				.int()
				.min(0)
				.describe(
					"Number of items ONLY in this circle, excluding the intersection (e.g., 12, 8, 0). This is the exclusive (non-negative integer) count for this category alone."
				),
			color: z
				.string()
				.regex(
						CSS_COLOR_PATTERN,
						"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)"
					)
				.describe(
					"Hex-only fill color for this circle (e.g., '#FF6B6B', '#1E90FF', '#000000', '#00000080' for 50% alpha). Use translucency to show overlap."
				)
		})
		.strict()
}

// The main Zod schema for the vennDiagram function
export const VennDiagramPropsSchema = z
	.object({
		type: z
			.literal("vennDiagram")
			.describe("Identifies this as a Venn diagram widget for visualizing set relationships and overlaps."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate both circles, labels, and outside region."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 300, 400, 250). Should provide balanced proportions with width."
			),
		circleA: createCircleSchema().describe(
			"Left circle representing the first category or set. The count is for items ONLY in A (not in B)."
		),
		circleB: createCircleSchema().describe(
			"Right circle representing the second category or set. The count is for items ONLY in B (not in A)."
		),
		intersectionCount: z
			.number()
			.int()
			.min(0)
			.describe(
				"Number of items in BOTH circles (A AND B intersection). Displayed in the overlapping region (e.g., 5, 15, 0). Non-negative integer."
			),
		outsideCount: z
			.number()
			.int()
			.min(0)
			.describe(
				"Number of items in NEITHER circle (outside both A and B). Displayed outside the circles (e.g., 3, 20, 0). Non-negative integer."
			)
	})
	.strict()
	.describe(
		"Creates a two-circle Venn diagram showing set relationships with counts in each region. Displays four distinct regions: only A, only B, both A and B (intersection), and neither. Perfect for teaching set theory, logical relationships, and data categorization. Circle colors should be translucent to show overlap clearly."
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

	// Labels for circles - positioned farther apart to use side space (only if labels exist)
	if (circleA.label) {
		svg += `<text x="${cxA - r * 0.5}" y="${padding.top - 5}" class="label">${circleA.label}</text>` // Moved left
	}
	if (circleB.label) {
		svg += `<text x="${cxB + r * 0.5}" y="${padding.top - 5}" class="label">${circleB.label}</text>` // Moved right
	}

	// A only
	svg += `<text x="${cxA - r / 2}" y="${cy}" class="count" dominant-baseline="middle">${circleA.count}</text>`
	// B only
	svg += `<text x="${cxB + r / 2}" y="${cy}" class="count" dominant-baseline="middle">${circleB.count}</text>`
	// Intersection
	svg += `<text x="${(cxA + cxB) / 2}" y="${cy}" class="count" dominant-baseline="middle">${intersectionCount}</text>`
	svg += `<text x="${width / 2}" y="${height - padding.bottom / 2}" class="count">${outsideCount}</text>` // Adjusted y position based on padding

	svg += "</svg>"
	return svg
}
