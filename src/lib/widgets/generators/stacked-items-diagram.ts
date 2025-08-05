import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties of an emoji icon used in the diagram
const DiagramEmojiSchema = z
	.object({
		emoji: z.string().describe("The emoji character to use as the icon (e.g., '🍦', '🥞', '📚')."),
		size: z.number().describe("The size of the emoji in pixels."),
		label: z.string().describe("Alternative text describing the emoji for accessibility.")
	})
	.strict()

// The main Zod schema for the stackedItemsDiagram function
export const StackedItemsDiagramPropsSchema = z
	.object({
		type: z.literal("stackedItemsDiagram"),
		width: z.number().describe("The total width of the output container div in pixels."),
		height: z.number().describe("The total height of the output container div in pixels."),
		altText: z.string().describe("A comprehensive alt text describing the final composite image for accessibility."),
		baseItem: DiagramEmojiSchema.describe("The emoji for the non-repeated base item (e.g., the cone '🍦')."),
		stackedItem: DiagramEmojiSchema.describe(
			"The emoji for the item that will be repeated and stacked (e.g., the scoop '🍨')."
		),
		count: z.number().int().min(0).describe("The number of times the stackedItem should be rendered."),
		orientation: z
			.enum(["vertical", "horizontal"])
			.nullable()
			.transform((val) => val ?? "vertical")
			.describe("The direction of the stack."),
		overlap: z
			.number()
			.nullable()
			.transform((val) => val ?? 0.75)
			.describe(
				"The proportion of the stacked item's size to overlap. E.g., 0.75 means each new item overlaps 75% of the previous one. A value of 0 means they touch at the edges. A negative value would create space."
			)
	})
	.strict()
	.describe(
		"This template is designed to generate a simple, clear visual representation of a quantity by stacking emoji items on top of a base emoji. It is particularly useful for word problems where a count of items (like scoops of ice cream, pancakes, or blocks) is central to the problem. The output is a self-contained <div> containing absolutely positioned emoji text elements to create a clean, layered visual. The generator will render a single baseItem emoji (e.g., an ice cream cone '🍦', a plate '🍽️'). It will then render a stackedItem emoji a specified number of times (count), creating a vertical or horizontal stack. The degree of overlap or spacing between the stacked items is configurable, allowing for a tight stack or a more spaced-out list. This template's purpose is purely illustrative, helping students visualize the number mentioned in the problem's text. All visual parameters, including the emoji characters, dimensions, and count, are fully configurable to adapt to various scenarios."
	)

export type StackedItemsDiagramProps = z.infer<typeof StackedItemsDiagramPropsSchema>

/**
 * This template is designed to generate a simple, clear visual representation of a quantity
 * by stacking emoji items on top of a base emoji. It is particularly useful for word problems where
 * a count of items (like scoops of ice cream, pancakes, or blocks) is central to the problem.
 */
export const generateStackedItemsDiagram: WidgetGenerator<typeof StackedItemsDiagramPropsSchema> = (data) => {
	const { width, height, altText, baseItem, stackedItem, count, orientation, overlap } = data
	let html = `<div style="position: relative; width: ${width}px; height: ${height}px;" role="img" aria-label="${altText}">`

	// Base item is aligned to the bottom-left corner of the container
	html += `<span style="position: absolute; bottom: 0; left: 0; font-size: ${baseItem.size}px; line-height: 1; z-index: 1;" aria-label="${baseItem.label}">${baseItem.emoji}</span>`

	// Stacked items
	for (let i = 0; i < count; i++) {
		let posStyle = ""
		if (orientation === "vertical") {
			// Each new item is placed higher than the last.
			// Overlap of 1 means they are at the same spot. Overlap of 0 means they touch.
			const step = stackedItem.size * (1 - overlap)
			posStyle = `bottom: ${i * step}px; left: 0;`
		} else {
			// Horizontal stacking
			const step = stackedItem.size * (1 - overlap)
			posStyle = `left: ${i * step}px; bottom: 0;`
		}
		html += `<span style="position: absolute; font-size: ${stackedItem.size}px; line-height: 1; ${posStyle} z-index: ${i + 2};" aria-label="${stackedItem.label}">${stackedItem.emoji}</span>`
	}

	html += "</div>"
	return html
}
