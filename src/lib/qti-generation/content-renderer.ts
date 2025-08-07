import * as errors from "@superbuilders/errors"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import type { BlockContent, InlineContent } from "./schemas"

export function renderInlineContent(inlineItems: InlineContent | null | undefined, slots: Map<string, string>): string {
	if (!inlineItems) return ""
	return inlineItems
		.map((item) => {
			switch (item.type) {
				case "text":
					return escapeXmlAttribute(item.content)
				case "math":
					return `<math xmlns="http://www.w3.org/1998/Math/MathML">${item.mathml}</math>`
				case "inlineSlot": {
					const content = slots.get(item.slotId)
					if (content === undefined) {
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
						throw errors.new(`Compiler Error: Content for block slot '${item.slotId}' not found.`)
					}
					return `<div>${content}</div>` // ALWAYS wrap block slots in a div
				}
			}
		})
		.join("\n        ")
}
