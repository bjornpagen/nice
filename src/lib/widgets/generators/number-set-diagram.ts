import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

function createStyleSchema() {
  return z.object({ 
    label: z.string().nullable().transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)).describe("Display name for this number set (e.g., 'Whole Numbers', 'Integers', 'Rational', 'ℚ', null). Can use symbols or full names. Null shows no label."), 
    color: z.string().regex(
      CSS_COLOR_PATTERN,
      "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)"
    ).describe("Hex-only fill color for this set's region (e.g., '#E8F4FD', '#1E90FF', '#FFC86480' for 50% alpha). Use translucency via 8-digit hex for nested visibility.") 
  }).strict()
}

// The main Zod schema for the numberSetDiagram function
export const NumberSetDiagramPropsSchema = z
	.object({
		type: z.literal("numberSetDiagram"),
		width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 500, 600, 450). Must accommodate all nested sets and labels."),
		height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 350, 450). Should provide good proportions for the nested ovals."),
		sets: z.object({ 
		    whole: createStyleSchema().describe("Style for whole numbers (0, 1, 2, ...). The innermost set in the hierarchy."), 
		    integer: createStyleSchema().describe("Style for integers (..., -2, -1, 0, 1, 2, ...). Contains whole numbers and their negatives."), 
		    rational: createStyleSchema().describe("Style for rational numbers (fractions/decimals). Contains integers and all fractions. Shown as containing whole ⊂ integer."), 
		    irrational: createStyleSchema().describe("Style for irrational numbers (π, √2, e, ...). Separate from rationals, together they form the reals.") 
		  }).strict().describe("Styling for each number set in the hierarchy. The diagram shows whole ⊂ integer ⊂ rational, with irrational separate.")
	})
	.strict()
	.describe("Creates an Euler diagram showing the hierarchical relationship between number sets. Whole numbers nest inside integers, which nest inside rationals. Irrationals are shown separately. Together, rationals and irrationals form the real numbers. Essential for teaching number system classification and set relationships.")

export type NumberSetDiagramProps = z.infer<typeof NumberSetDiagramPropsSchema>

/**
 * Generates a static SVG Euler diagram that visually represents the hierarchical
 * relationship between different sets of numbers (whole, integer, rational, irrational).
 */
export const generateNumberSetDiagram: WidgetGenerator<typeof NumberSetDiagramPropsSchema> = (data) => {
	const { width, height, sets } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg +=
		"<style>.set-label { font-size: 14px; font-weight: bold; text-anchor: middle; dominant-baseline: middle; fill: black; }</style>"

	const mainCenterX = width * 0.4
	const mainCenterY = height / 2
	const rationalRx = width * 0.35
	const rationalRy = height * 0.45

	const irrationalCenterX = width * 0.8
	const irrationalCenterY = height / 2
	const irrationalRx = width * 0.15
	const irrationalRy = height * 0.3

	// Rational Numbers (outermost of the nested set)
	svg += `<ellipse cx="${mainCenterX}" cy="${mainCenterY}" rx="${rationalRx}" ry="${rationalRy}" fill="${sets.rational.color}" stroke="black" />`
	if (sets.rational.label !== null) {
		svg += `<text x="${mainCenterX}" y="${mainCenterY - rationalRy + 20}" class="set-label">${sets.rational.label}</text>`
	}

	// Integer Numbers
	const integerRx = rationalRx * 0.7
	const integerRy = rationalRy * 0.7
	svg += `<ellipse cx="${mainCenterX}" cy="${mainCenterY}" rx="${integerRx}" ry="${integerRy}" fill="${sets.integer.color}" stroke="black" />`
	if (sets.integer.label !== null) {
		svg += `<text x="${mainCenterX}" y="${mainCenterY - integerRy + (rationalRy - integerRy) / 2}" class="set-label">${sets.integer.label}</text>`
	}

	// Whole Numbers
	const wholeRx = integerRx * 0.6
	const wholeRy = integerRy * 0.6
	svg += `<ellipse cx="${mainCenterX}" cy="${mainCenterY}" rx="${wholeRx}" ry="${wholeRy}" fill="${sets.whole.color}" stroke="black" />`
	if (sets.whole.label !== null) {
		svg += `<text x="${mainCenterX}" y="${mainCenterY}" class="set-label">${sets.whole.label}</text>`
	}

	// Irrational Numbers (separate)
	svg += `<ellipse cx="${irrationalCenterX}" cy="${irrationalCenterY}" rx="${irrationalRx}" ry="${irrationalRy}" fill="${sets.irrational.color}" stroke="black" />`
	if (sets.irrational.label !== null) {
		svg += `<text x="${irrationalCenterX}" y="${irrationalCenterY}" class="set-label">${sets.irrational.label}</text>`
	}

	svg += "</svg>"
	return svg
}
