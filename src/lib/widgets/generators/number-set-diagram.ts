import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the labels and colors for the regions in the diagram
const NumberSetStyleSchema = z.object({
	label: z.string().describe('The text label for the number set (e.g., "Whole numbers").'),
	color: z.string().describe('The CSS fill color for the region (e.g., "#E8F0FE").')
})

// The main Zod schema for the numberSetDiagram function
export const NumberSetDiagramPropsSchema = z
	.object({
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 475)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 180)
			.describe("The total height of the output SVG container in pixels."),
		sets: z
			.object({
				whole: NumberSetStyleSchema,
				integer: NumberSetStyleSchema,
				rational: NumberSetStyleSchema,
				irrational: NumberSetStyleSchema
			})
			.describe("An object containing the labels and colors for each number set region.")
	})
	.describe(
		"Generates a static SVG Euler diagram that visually represents the hierarchical relationship between the sets of whole, integer, rational, and irrational numbers. It renders nested ovals for the first three sets and a separate oval for irrational numbers, with each region clearly labeled and colored. This provides a classic visual aid for classifying numbers."
	)

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
	svg += `<text x="${mainCenterX}" y="${mainCenterY - rationalRy + 20}" class="set-label">${sets.rational.label}</text>`

	// Integer Numbers
	const integerRx = rationalRx * 0.7
	const integerRy = rationalRy * 0.7
	svg += `<ellipse cx="${mainCenterX}" cy="${mainCenterY}" rx="${integerRx}" ry="${integerRy}" fill="${sets.integer.color}" stroke="black" />`
	svg += `<text x="${mainCenterX}" y="${mainCenterY - integerRy + (rationalRy - integerRy) / 2}" class="set-label">${sets.integer.label}</text>`

	// Whole Numbers
	const wholeRx = integerRx * 0.6
	const wholeRy = integerRy * 0.6
	svg += `<ellipse cx="${mainCenterX}" cy="${mainCenterY}" rx="${wholeRx}" ry="${wholeRy}" fill="${sets.whole.color}" stroke="black" />`
	svg += `<text x="${mainCenterX}" y="${mainCenterY}" class="set-label">${sets.whole.label}</text>`

	// Irrational Numbers (separate)
	svg += `<ellipse cx="${irrationalCenterX}" cy="${irrationalCenterY}" rx="${irrationalRx}" ry="${irrationalRy}" fill="${sets.irrational.color}" stroke="black" />`
	svg += `<text x="${irrationalCenterX}" y="${irrationalCenterY}" class="set-label">${sets.irrational.label}</text>`

	svg += "</svg>"
	return svg
}
