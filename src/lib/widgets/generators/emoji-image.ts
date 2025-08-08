import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the emojiImage function
export const EmojiImagePropsSchema = z
	.object({
		type: z.literal("emojiImage"),
		emoji: z.string().describe("The emoji character(s) to render. Can be a single emoji or multiple emojis."),
		size: z
			.number()
			.nullable()
			.transform((val) => val ?? 100)
			.describe("The size of the emoji in pixels. Defaults to 100.")
		// label: z.string().nullable().describe("Optional label text to display below the emoji.")
	})
	.strict()
	.describe(
		"Generates a simple image widget that renders an emoji at a specified size. This is useful for replacing various image widgets (trucks, horses, cookies, etc.) with emojis. The emoji is rendered as text within an SVG for consistent sizing and positioning."
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
