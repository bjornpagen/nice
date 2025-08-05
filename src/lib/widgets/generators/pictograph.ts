import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the key for interpreting the pictograph
const PictographKeySchema = z
	.object({
		icon: z.string().describe("The icon to be used, which can be an emoji or an SVG string/URL."),
		label: z.string().describe('The full text label explaining the key (e.g., "= 1 home run").')
	})
	.strict()

// Defines a single row in the pictograph
const PictographDataRowSchema = z
	.object({
		category: z.string().describe('The text label for the data row (e.g., "Lancers", "Glenda").'),
		iconCount: z.number().describe("The number of icons to display for this category.")
	})
	.strict()

// The main Zod schema for the pictograph function
export const PictographPropsSchema = z
	.object({
		type: z.literal("pictograph"),
		title: z.string().nullable().describe("An optional title displayed above the pictograph."),
		key: PictographKeySchema.describe("The key that explains the value of a single icon."),
		data: z
			.array(PictographDataRowSchema)
			.describe("An array of data objects, each specifying a category label and the number of icons to render.")
	})
	.strict()
	.describe(
		'This template generates a pictograph, a type of chart that uses icons or images (often emojis) to represent data quantities, making it visually engaging and easy to understand at a glance. The generator will create a layout with category labels aligned on one side (e.g., vertically down the left) and corresponding rows of icons on the other. The number of icons in each row is proportional to the value of that category. A crucial component of the pictograph is the key, which will be displayed prominently (usually at the bottom) to explain the numerical value represented by a single icon (e.g., "⚾ = 1 home run" or "🪄 = 2 wands"). The template allows for full customization of the category labels, the icon to be used, and the value represented by the icon.'
	)

export type PictographProps = z.infer<typeof PictographPropsSchema>

/**
 * This template generates a pictograph, a type of chart that uses icons or images
 * (often emojis) to represent data quantities, making it visually engaging and
 * easy to understand at a glance.
 */
export const generatePictograph: WidgetGenerator<typeof PictographPropsSchema> = (data) => {
	const { title, key, data: pictographData } = data
	let html = `<div style="font-family: sans-serif; border: 1px solid #ccc; padding: 10px; border-radius: 5px;">`
	if (title) {
		html += `<h3 style="text-align: center; margin-top: 0;">${title}</h3>`
	}
	html += `<table style="width: 100%; border-collapse: collapse;">`
	html += "<tbody>"
	for (const d of pictographData) {
		html += "<tr>"
		html += `<td style="padding: 8px; width: 30%; font-weight: bold; text-align: right; border-right: 1px solid #eee;">${d.category}</td>`
		html += `<td style="padding: 8px; font-size: 1.5em; letter-spacing: 0.2em;">`
		for (let i = 0; i < d.iconCount; i++) {
			html += key.icon
		}
		html += "</td>"
		html += "</tr>"
	}
	html += "</tbody>"
	html += "</table>"
	html += `<div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ccc;">`
	html += `<span style="font-size: 1.5em;">${key.icon}</span> ${key.label}`
	html += "</div>"
	html += "</div>"
	return html
}
