import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties of an image used in the diagram
const DiagramImageSchema = z.object({
	src: z.string().url().describe("The full URL source of the image file (e.g., SVG, PNG)."),
	width: z.number().describe("The width of the image in pixels."),
	height: z.number().describe("The height of the image in pixels."),
	alt: z.string().describe("Alternative text for the individual image component for accessibility.")
})

// The main Zod schema for the stackedItemsDiagram function
export const StackedItemsDiagramPropsSchema = z
	.object({
		width: z.number().describe("The total width of the output container div in pixels."),
		height: z.number().describe("The total height of the output container div in pixels."),
		altText: z.string().describe("A comprehensive alt text describing the final composite image for accessibility."),
		baseItem: DiagramImageSchema.describe("The image for the non-repeated base item (e.g., the cone)."),
		stackedItem: DiagramImageSchema.describe(
			"The image for the item that will be repeated and stacked (e.g., the scoop)."
		),
		count: z.number().int().min(0).describe("The number of times the stackedItem should be rendered."),
		orientation: z
			.enum(["vertical", "horizontal"])
			.optional()
			.default("vertical")
			.describe("The direction of the stack."),
		overlap: z
			.number()
			.optional()
			.default(0.75)
			.describe(
				"The proportion of the stacked item's height (for vertical) or width (for horizontal) to overlap. E.g., 0.75 means each new item overlaps 75% of the previous one. A value of 0 means they touch at the edges. A negative value would create space."
			)
	})
	.describe(
		"This template is designed to generate a simple, clear visual representation of a quantity by stacking items on top of a base. It is particularly useful for word problems where a count of items (like scoops of ice cream, pancakes, or blocks) is central to the problem. The output is a self-contained <div> containing either an SVG or a series of absolutely positioned <img> elements to create a clean, layered visual. The generator will render a single baseItem image (e.g., an ice cream cone, a plate). It will then render a stackedItem image a specified number of times (count), creating a vertical or horizontal stack. The degree of overlap or spacing between the stacked items is configurable, allowing for a tight stack or a more spaced-out list. This template's purpose is purely illustrative, helping students visualize the number mentioned in the problem's text. All visual parameters, including the source images, dimensions, and count, are fully configurable to adapt to various scenarios."
	)

export type StackedItemsDiagramProps = z.infer<typeof StackedItemsDiagramPropsSchema>

/**
 * This template is designed to generate a simple, clear visual representation of a quantity
 * by stacking items on top of a base. It is particularly useful for word problems where
 * a count of items (like scoops of ice cream, pancakes, or blocks) is central to the problem.
 */
export const generateStackedItemsDiagram: WidgetGenerator<typeof StackedItemsDiagramPropsSchema> = (data) => {
	const { width, height, altText, baseItem, stackedItem, count, orientation, overlap } = data
	let html = `<div style="position: relative; width: ${width}px; height: ${height}px;" role="img" aria-label="${altText}">`

	// Base item is aligned to the bottom-left corner of the container
	html += `<img src="${baseItem.src}" width="${baseItem.width}" height="${baseItem.height}" alt="${baseItem.alt}" style="position: absolute; bottom: 0; left: 0; z-index: 1;"/>`

	// Stacked items
	for (let i = 0; i < count; i++) {
		let posStyle = ""
		if (orientation === "vertical") {
			// Each new item is placed higher than the last.
			// Overlap of 1 means they are at the same spot. Overlap of 0 means they touch.
			const step = stackedItem.height * (1 - overlap)
			posStyle = `bottom: ${i * step}px; left: 0;`
		} else {
			// Horizontal stacking
			const step = stackedItem.width * (1 - overlap)
			posStyle = `left: ${i * step}px; bottom: 0;`
		}
		html += `<img src="${stackedItem.src}" width="${stackedItem.width}" height="${stackedItem.height}" alt="${stackedItem.alt}" style="position: absolute; ${posStyle} z-index: ${i + 2};"/>`
	}

	html += "</div>"
	return html
}
