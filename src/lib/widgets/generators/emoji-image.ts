import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includeText, initExtents } from "@/lib/widgets/utils/layout"

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

	// MODIFICATION START
	// Use dynamic width calculation instead of fixed size.
	const ext = initExtents(size)
	const cx = size / 2
	const cy = size / 2

	// Track the emoji text for accurate width calculation.
	// Emojis are treated as single characters, but their rendered width can vary.
	// Using a larger font size estimate for avgCharWidthPx.
	includeText(ext, cx, emoji, "middle", size * 0.9)

	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, size, PADDING)

	let svg = `<svg width="${dynamicWidth}" height="${size}" viewBox="${vbMinX} 0 ${dynamicWidth} ${size}" xmlns="http://www.w3.org/2000/svg">`

	// Center the emoji in the available space
	const emojiY = size * 0.85 // Adjust for emoji baseline

	// Render the emoji
	svg += `<text x="${cx}" y="${emojiY}" font-size="${size * 0.9}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>`

	svg += "</svg>"
	return svg
	// MODIFICATION END
}
