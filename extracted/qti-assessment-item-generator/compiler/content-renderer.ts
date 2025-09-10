import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { sanitizeXmlAttributeValue } from "../utils/xml-utils"
import type { BlockContent, InlineContent } from "./schemas"

/**
 * Escapes text content for safe inclusion in XML PCDATA.
 */
function escapeXmlText(text: string): string {
	const sanitized = sanitizeXmlAttributeValue(text)
	return sanitized
		.replace(/&/g, "&amp;") // Must be first to avoid double-escaping
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
}

export function renderInlineContent(inlineItems: InlineContent | null | undefined, slots: Map<string, string>): string {
	if (!inlineItems) return ""
	return inlineItems
		.map((item) => {
			switch (item.type) {
				case "text":
					return escapeXmlText(item.content)
				case "math":
					// Ensure MathML is properly wrapped and namespaced
					return `<math xmlns="http://www.w3.org/1998/Math/MathML">${item.mathml}</math>`
				case "inlineSlot": {
					const content = slots.get(item.slotId)
					if (content === undefined) {
						logger.error("content for inline slot not found", {
							slotId: item.slotId,
							availableSlots: Array.from(slots.keys())
						})
						throw errors.new(`Compiler Error: Content for inline slot '${item.slotId}' not found.`)
					}
					return content // Render directly, no wrapper
				}
			}
		})
		.join("")
}

export function renderBlockContent(blockItems: BlockContent | null | undefined, slots: Map<string, string>): string {
	if (!blockItems) return ""
	return blockItems
		.map((item) => {
			switch (item.type) {
				case "paragraph":
					return `<p>${renderInlineContent(item.content, slots)}</p>`
				case "blockSlot": {
					const content = slots.get(item.slotId)
					if (content === undefined) {
						logger.error("content for block slot not found", {
							slotId: item.slotId,
							availableSlots: Array.from(slots.keys())
						})
						throw errors.new(`Compiler Error: Content for block slot '${item.slotId}' not found.`)
					}
					return `<div>${content}</div>` // ALWAYS wrap block slots in a div
				}
			}
		})
		.join("\n        ")
}
