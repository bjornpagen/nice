import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const UrlImageWidgetPropsSchema = z
	.object({
		type: z.literal("urlImage"),
		url: z.string().url().describe("The direct URL to the image resource (e.g., 'https://.../image.png')."),
		alt: z
			.string()
			.min(1)
			.describe(
				"Required alternative text describing the image for accessibility. This should be descriptive and meaningful."
			),
		width: z.number().positive().nullable().describe("Optional width for the image in pixels."),
		height: z.number().positive().nullable().describe("Optional height for the image in pixels."),
		caption: z.string().nullable().describe("An optional caption to display below the image.")
	})
	.strict()

export const generateUrlImage: WidgetGenerator<typeof UrlImageWidgetPropsSchema> = (props) => {
	const { url, alt, width, height, caption } = props

	const containerStyles = "display: inline-block; text-align: center;"
	const imgStyles = ["display: block;", width ? `width: ${width}px;` : "", height ? `height: ${height}px;` : ""]
		.filter(Boolean)
		.join(" ")
	const captionStyles = "font-size: 0.9em; color: #555; margin-top: 4px;"

	const imgTag = `<img src="${url}" alt="${alt}" style="${imgStyles}" />`
	const captionTag = caption ? `<div style="${captionStyles}">${caption}</div>` : ""

	return `<div style="${containerStyles}">${imgTag}${captionTag}</div>`
}
