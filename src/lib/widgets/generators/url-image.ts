import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { escapeXmlAttribute, sanitizeXmlAttributeValue } from "@/lib/xml-utils"

export const UrlImageWidgetPropsSchema = z
	.object({
		type: z.literal("urlImage"),
		url: z
			.string()
			.regex(
				/^https:\/\/.+\.(?:svg|png|jpe?g)$/,
				"url must start with https:// and end with .svg, .png, .jpg, or .jpeg"
			)
			.describe("The direct HTTPS URL to the image resource (must end with .svg, .png, .jpg, or .jpeg)."),
		alt: z
			.string()
			.min(1)
			.describe(
				"Required alternative text describing the image for accessibility. This should be descriptive and meaningful."
			),
		width: z.number().positive().nullable().describe("Optional width for the image in pixels."),
		height: z.number().positive().nullable().describe("Optional height for the image in pixels."),
		caption: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe(
				"An optional descriptive caption to display below the image. This should describe what the image shows or provide context."
			),
		attribution: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe(
				"An optional attribution or source credit field (not rendered). This field exists to encourage LLMs to separate attribution/source information from the caption text. Include image source, creator, or copyright information here instead of in the caption."
			)
	})
	.strict()

export const generateUrlImage: WidgetGenerator<typeof UrlImageWidgetPropsSchema> = (props) => {
	const { url, alt, width, height, caption } = props
	// Note: attribution is intentionally not destructured or rendered
	// The attribution field exists in the schema to encourage LLMs to separate
	// attribution/source info from the caption, but we don't display it

	// Validate URL at compile time
	const urlValidationResult = errors.trySync((): void => {
		new URL(url)
	})
	if (urlValidationResult.error) {
		logger.error("invalid url provided to urlImage widget", { url, error: urlValidationResult.error })
		throw errors.new("invalid url")
	}

	const containerStyles = "display: inline-block; text-align: center;"
	const imgStyles = ["display: block;", width ? `width: ${width}px;` : "", height ? `height: ${height}px;` : ""]
		.filter(Boolean)
		.join(" ")
	const captionStyles = "font-size: 0.9em; color: #333; margin-top: 8px;"

	// Escape helpers for XML contexts
	const escapeXmlText = (text: string): string =>
		sanitizeXmlAttributeValue(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

	const imgTag = `<img src="${escapeXmlAttribute(url)}" alt="${escapeXmlAttribute(alt)}" style="${escapeXmlAttribute(imgStyles)}" />`
	const captionTag = caption ? `<div style="${escapeXmlAttribute(captionStyles)}">${escapeXmlText(caption)}</div>` : ""

	return `<div style="${containerStyles}">${imgTag}${captionTag}</div>`
}
