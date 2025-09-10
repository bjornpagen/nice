import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"

import { theme } from "@/lib/widgets/utils/theme"
import { drawChartTitle } from "@/lib/widgets/utils/chart-layout-utils"

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
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Title displayed above the diagram (e.g., 'Fruit Basket Contents', null). Null means no title. Plaintext only; no markdown/HTML."
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
export const generateDiscreteObjectRatioDiagram: WidgetGenerator<typeof DiscreteObjectRatioDiagramPropsSchema> = async (
	data
) => {
	const { width, height, objects, layout, title } = data

	// Titles float above the chart content area.
	const padding = { top: 40, right: PADDING, bottom: PADDING, left: PADDING }

	const chartWidth = width - padding.left - padding.right
	const chartHeight = height - padding.top - padding.bottom

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// Add a clean background container with rounded corners and subtle border
	const containerPadding = 10
	const containerX = padding.left - containerPadding
	const containerY = padding.top - containerPadding
	const containerWidth = chartWidth + 2 * containerPadding
	const containerHeight = chartHeight + 2 * containerPadding

	// Draw container background using Canvas API
	canvas.drawRect(containerX, containerY, containerWidth, containerHeight, {
		fill: theme.colors.background,
		stroke: theme.colors.border,
		strokeWidth: theme.stroke.width.thick
	})

	// Draw the title using the new helper
	if (title !== null) {
		// Define the frame for the title
		const titleFrame = {
			left: 0,
			top: 0,
			width: width,
			height: height
		}

		// Call the new helper
		drawChartTitle(canvas, titleFrame, abbreviateMonth(title), {
			maxWidthPolicy: "frame",
			fontPx: theme.font.size.base * 1.1
		})
	}

	const iconSize = 28 // Larger for better emoji visibility
	const iconPadding = 8 // More breathing room
	const step = iconSize + iconPadding

	// Function to draw emojis with better positioning using Canvas API
	const drawIcon = (x: number, y: number, emoji: string) => {
		const fontSize = iconSize * 0.9 // Better emoji sizing
		canvas.drawText({
			x: x + iconSize / 2,
			y: y + iconSize / 2,
			text: emoji,
			fontPx: fontSize,
			anchor: "middle",
			dominantBaseline: "middle"
		})
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
				drawIcon(currentX, currentY, obj.emoji)
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
				drawIcon(currentX, currentY, obj.emoji)
				currentX += step
			}
		}
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.medium}">${svgBody}</svg>`
}
