import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const EmojiImagePropsSchema = z
	.object({
		type: z
			.literal("emojiImage")
			.describe("Identifies this as an emoji image widget for displaying a single emoji character."),
		emoji: z
			.string()
			.describe(
				"The emoji character to display (e.g., '🎉', '📚', '🌟', '👍'). Must be a valid Unicode emoji. Can be single emoji or emoji with modifiers. This value is required."
			),
		size: z
			.number()
			.positive()
			.max(512)
			.describe(
				"Size of the emoji in pixels (both width and height). Controls the font size and SVG dimensions (e.g., 48, 64, 100, 32). Larger sizes show more detail. Max 512."
			)
	})
	.strict()
	.describe(
		"Renders a single emoji as an SVG image with consistent sizing and centering. Useful for icons, visual elements in problems, or decorative purposes. The emoji is centered and baseline-adjusted for proper alignment."
	)

export type EmojiImageProps = z.infer<typeof EmojiImagePropsSchema>

/**
 * Generates an SVG image widget that displays an emoji at a specified size.
 * Can be used to replace various Perseus image widgets with emoji representations.
 */
export const generateEmojiImage: WidgetGenerator<typeof EmojiImagePropsSchema> = (data) => {
	const { emoji, size } = data

	// Calculate dimensions
	const totalHeight = size
	const totalWidth = size

	let svg = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">`

	// Center the emoji in the available space
	const emojiY = size * 0.85 // Adjust for emoji baseline

	// Render the emoji
	svg += `<text x="${totalWidth / 2}" y="${emojiY}" font-size="${size * 0.9}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>`

	svg += "</svg>"
	return svg
}
