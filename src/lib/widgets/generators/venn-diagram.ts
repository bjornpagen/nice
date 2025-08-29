import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"

function createCircleSchema() {
	return z
		.object({
			label: z
				.string()
				.describe(
					"Category name for this circle (e.g., 'Has a Dog', 'Likes Pizza', 'Students in Band', 'Even Numbers'). Keep concise to fit above circle. Plaintext only; no markdown or HTML."
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
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
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
	const padding = { top: PADDING * 2, bottom: PADDING * 2, horizontal: PADDING / 2 }
	const chartHeight = height - padding.top - padding.bottom

	const r = Math.min(width / 4, chartHeight / 2.5) // Reduced radius for better spacing
	const overlap = r * 0.45 // 45% overlap for balanced spacing
	const cxA = width / 2 - r + overlap
	const cxB = width / 2 + r - overlap
	const cy = padding.top + chartHeight / 2

	const ext = initExtents(width)
	let svgContent = "<style>.label { font-size: 16px; font-weight: bold; text-anchor: middle; } .count { font-size: 18px; text-anchor: middle; }</style>"

	// Draw containing box
	svgContent += `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="${theme.colors.axis}" />`

	// Track circles
	includePointX(ext, cxA - r)
	includePointX(ext, cxA + r)
	includePointX(ext, cxB - r)
	includePointX(ext, cxB + r)
	
	// Circles (semi-transparent for overlap visibility)
	svgContent += `<circle cx="${cxA}" cy="${cy}" r="${r}" fill="${circleA.color}" fill-opacity="${theme.opacity.overlay}" stroke="${theme.colors.axis}"/>`
	svgContent += `<circle cx="${cxB}" cy="${cy}" r="${r}" fill="${circleB.color}" fill-opacity="${theme.opacity.overlay}" stroke="${theme.colors.axis}"/>`

	// Labels for circles - positioned farther apart to use side space
	const labelA_X = cxA - r * 0.5
	const labelB_X = cxB + r * 0.5
	includeText(ext, labelA_X, abbreviateMonth(circleA.label), "middle")
	includeText(ext, labelB_X, abbreviateMonth(circleB.label), "middle")
	svgContent += `<text x="${labelA_X}" y="${padding.top - 5}" class="label">${abbreviateMonth(circleA.label)}</text>` // Moved left
	svgContent += `<text x="${labelB_X}" y="${padding.top - 5}" class="label">${abbreviateMonth(circleB.label)}</text>` // Moved right

	// Track counts
	const countA_X = cxA - r / 2
	const countB_X = cxB + r / 2
	const intersection_X = (cxA + cxB) / 2
	const outside_X = width / 2
	includeText(ext, countA_X, String(circleA.count), "middle")
	includeText(ext, countB_X, String(circleB.count), "middle")
	includeText(ext, intersection_X, String(intersectionCount), "middle")
	includeText(ext, outside_X, String(outsideCount), "middle")
	
	// A only
	svgContent += `<text x="${countA_X}" y="${cy}" class="count" dominant-baseline="middle">${circleA.count}</text>`
	// B only
	svgContent += `<text x="${countB_X}" y="${cy}" class="count" dominant-baseline="middle">${circleB.count}</text>`
	// Intersection
	svgContent += `<text x="${intersection_X}" y="${cy}" class="count" dominant-baseline="middle">${intersectionCount}</text>`
	svgContent += `<text x="${outside_X}" y="${height - padding.bottom / 2}" class="count">${outsideCount}</text>` // Adjusted y position based on padding

	// Final assembly
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	let svg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">`
	svg += svgContent
	svg += "</svg>"
	return svg
}
