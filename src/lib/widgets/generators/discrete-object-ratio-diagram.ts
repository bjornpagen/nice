import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a type of object to be rendered
const ObjectTypeSchema = z.object({
	count: z.number().int().min(0).describe("The number of this type of object to render."),
	// In a real implementation, this could be an enum of available icons or an SVG path string.
	icon: z.string().describe('An identifier for the icon to use (e.g., "largeFish", "penguin", "smallBall").'),
	color: z.string().optional().describe("An optional CSS color to apply to the icon.")
})

// The main Zod schema for the discreteObjectRatioDiagram function
export const DiscreteObjectRatioDiagramPropsSchema = z
	.object({
		width: z.number().default(320).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(240).describe("The total height of the output SVG container in pixels."),
		objects: z.array(ObjectTypeSchema).min(2).describe("An array defining the types and counts of objects to display."),
		layout: z.enum(["grid", "cluster"]).default("cluster").describe("The arrangement of the rendered objects."),
		title: z.string().optional().describe('An optional title for the diagram (e.g., "Fish in Aquarium").')
	})
	.describe(
		'This template generates an SVG graphic that visually represents a ratio using a collection of discrete, countable objects. It is perfect for introductory ratio problems where students can directly count the items to understand the relationship. The generator will render a specified number of two or more distinct types of objects. Each object type is defined by an SVG icon or shape and a count. For example, to show a ratio of 8 large fish to 10 small fish, the generator would render 8 instances of a "large fish" icon and 10 instances of a "small fish" icon. The objects will be arranged in a visually appealing and easy-to-count layout, such as a grid or a loose cluster. The colors and designs of the objects are configurable. This template provides a simple, concrete way to introduce the concept of ratios before moving to more abstract representations like tables or tape diagrams.'
	)

export type DiscreteObjectRatioDiagramProps = z.infer<typeof DiscreteObjectRatioDiagramPropsSchema>

/**
 * This template generates an SVG graphic that visually represents a ratio using a collection
 * of discrete, countable objects. It is perfect for introductory ratio problems where
 * students can directly count the items to understand the relationship.
 */
export const generateDiscreteObjectRatioDiagram: WidgetGenerator<typeof DiscreteObjectRatioDiagramPropsSchema> = (
	data
) => {
	const { width, height, objects, layout, title } = data
	const padding = { top: 40, right: 20, bottom: 20, left: 20 }
	const chartWidth = width - padding.left - padding.right
	const _chartHeight = height - padding.top - padding.bottom

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	if (title) {
		svg += `<text x="${width / 2}" y="${padding.top / 2}" fill="black" text-anchor="middle" font-weight="bold">${title}</text>`
	}

	const iconSize = 20
	const iconPadding = 5
	const step = iconSize + iconPadding

	// Function to draw a specific shape based on the icon identifier
	const drawIcon = (x: number, y: number, icon: string, color: string) => {
		switch (icon) {
			case "square":
				return `<rect x="${x}" y="${y}" width="${iconSize}" height="${iconSize}" fill="${color}" />`
			case "triangle": {
				const points = `${x + iconSize / 2},${y} ${x},${y + iconSize} ${x + iconSize},${y + iconSize}`
				return `<polygon points="${points}" fill="${color}" />`
			}
			default:
				return `<circle cx="${x + iconSize / 2}" cy="${y + iconSize / 2}" r="${iconSize / 2}" fill="${color}" />`
		}
	}

	let currentX = padding.left
	let currentY = padding.top

	if (layout === "grid") {
		for (const obj of objects) {
			for (let i = 0; i < obj.count; i++) {
				if (currentX + iconSize > width - padding.right) {
					currentX = padding.left
					currentY += step
				}
				svg += drawIcon(currentX, currentY, obj.icon, obj.color || "gray")
				currentX += step
			}
		}
	} else {
		// Cluster layout: group objects by type
		for (let groupIndex = 0; groupIndex < objects.length; groupIndex++) {
			const obj = objects[groupIndex]
			if (!obj) continue
			const groupWidth = chartWidth / objects.length
			const startX = padding.left + groupIndex * groupWidth
			currentX = startX
			currentY = padding.top
			for (let i = 0; i < obj.count; i++) {
				if (currentX + step > startX + groupWidth) {
					currentX = startX
					currentY += step
				}
				svg += drawIcon(currentX, currentY, obj.icon, obj.color || "gray")
				currentX += step
			}
		}
	}

	svg += "</svg>"
	return svg
}
