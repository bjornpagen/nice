import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a type of object to be rendered
const ObjectTypeSchema = z
	.object({
		count: z
			.number()
			.int()
			.describe(
				"Number of objects of this type to display. Must be non-negative integer (e.g., 5, 12, 0). Zero means this type is absent."
			),
		emoji: z
			.string()
			.describe(
				"The emoji character representing this object type (e.g., '🍎' for apple, '🍊' for orange, '🐶' for dog). Should be a single emoji for clarity."
			)
	})
	.strict()

// The main Zod schema for the discreteObjectRatioDiagram function
export const DiscreteObjectRatioDiagramPropsSchema = z
	.object({
		type: z
			.literal("discreteObjectRatioDiagram")
			.describe("Identifies this as a discrete object ratio diagram for visualizing ratios with countable objects."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 600). Must accommodate all objects with reasonable spacing."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 300, 400, 250). Adjust based on total object count and layout."
			),
		objects: z
			.array(ObjectTypeSchema)
			.describe(
				"Array of object types with their counts. Each type uses a different emoji. Order affects color assignment and grouping. Can be empty array for blank diagram."
			),
		layout: z
			.enum(["grid", "cluster"])
			.describe(
				"Visual arrangement of objects. 'grid' spaces all objects evenly in rows. 'cluster' groups objects by type, ideal for showing distinct ratios."
			),
		title: z
			.string()
			.describe(
				"Title displayed above the diagram (e.g., 'Fruit Basket Contents', 'Pet Types in Class', ''). Empty string means no title. Keep concise."
			)
	})
	.strict()
	.describe(
		"Creates visual representations of ratios using discrete countable objects (emojis). Perfect for elementary ratio concepts, part-to-part and part-to-whole relationships. The 'cluster' layout clearly shows groupings while 'grid' emphasizes the total collection."
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
	const chartHeight = height - padding.top - padding.bottom

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`

	// Add a clean background container with rounded corners and subtle border
	const containerPadding = 10
	const containerX = padding.left - containerPadding
	const containerY = padding.top - containerPadding
	const containerWidth = chartWidth + 2 * containerPadding
	const containerHeight = chartHeight + 2 * containerPadding

	svg += `<rect x="${containerX}" y="${containerY}" width="${containerWidth}" height="${containerHeight}" fill="#fafafa" stroke="#e0e0e0" stroke-width="2" rx="8" ry="8"/>`

	if (title !== "") {
		svg += `<text x="${width / 2}" y="${padding.top / 2}" fill="#333333" text-anchor="middle" font-weight="bold">${title}</text>`
	}

	const iconSize = 28 // Larger for better emoji visibility
	const iconPadding = 8 // More breathing room
	const step = iconSize + iconPadding

	// Function to draw emojis with better positioning
	const drawIcon = (x: number, y: number, emoji: string) => {
		const fontSize = iconSize * 0.9 // Better emoji sizing
		return `<text x="${x + iconSize / 2}" y="${y + iconSize / 2}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${emoji}</text>`
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
				svg += drawIcon(currentX, currentY, obj.emoji)
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
				svg += drawIcon(currentX, currentY, obj.emoji)
				currentX += step
			}
		}
	}

	svg += "</svg>"
	return svg
}
