import * as errors from "@superbuilders/errors"

/**
 * Processes a string containing <slot /> placeholders and replaces them with
 * the corresponding content from the provided slots map.
 *
 * Supports multiple slot tag formats and performs recursive replacement
 * to handle nested slot references.
 *
 * @param content The HTML content string with placeholders.
 * @param slots A map where keys are slot names and values are the HTML/XML to inject.
 * @returns The content string with all placeholders filled.
 */
export function processAndFillSlots(content: string, slots: Map<string, string>): string {
	const slotRegex = /<slot(?<attributes>(?:\s+(?:[\w-]+(?:\s*=\s*"[^"]*")?))*)(?<whitespace>\s*)(?<selfClose>\/?)>/g
	const processedSlots = new Set<string>()

	function processContent(text: string, depth = 0): string {
		if (depth > 10) {
			throw errors.new("maximum slot nesting depth exceeded (10 levels)")
		}

		const matches = Array.from(text.matchAll(slotRegex))
		if (matches.length === 0) {
			return text
		}

		let result = text
		for (let i = matches.length - 1; i >= 0; i--) {
			const match = matches[i]
			if (!match || match.index === undefined) continue

			const fullMatch = match[0]
			const attributes = match.groups?.attributes || ""
			const nameMatch = attributes.match(/\bname\s*=\s*"(?<name>[^"]+)"/i)
			if (!nameMatch || !nameMatch.groups?.name) {
				throw errors.new(`slot tag missing required 'name' attribute: ${fullMatch}`)
			}

			const slotName = nameMatch.groups.name.trim()
			if (slotName === "") {
				throw errors.new(`slot tag has empty name attribute: ${fullMatch}`)
			}

			const slotKey = `${slotName}_${depth}`
			if (processedSlots.has(slotKey)) {
				throw errors.new(`circular slot reference detected: '${slotName}'`)
			}

			const slotContent = slots.get(slotName)
			if (slotContent === undefined) {
				throw errors.new(`missing content for slot: '${slotName}'`)
			}

			processedSlots.add(slotKey)
			const processedSlotContent = processContent(slotContent, depth + 1)
			result = result.slice(0, match.index) + processedSlotContent + result.slice(match.index + fullMatch.length)
			processedSlots.delete(slotKey)
		}
		return result
	}

	const processedContent = processContent(content)

	const remainingSlots = processedContent.match(/<slot\s+[^>]*>/g)
	if (remainingSlots) {
		const remainingNames = remainingSlots.map((tag) => {
			const nameMatch = tag.match(/name\s*=\s*"([^"]+)"/i)
			return nameMatch ? nameMatch[1] : "unknown"
		})
		throw errors.new(`unprocessed slot tags remain after replacement: ${remainingNames.join(", ")}`)
	}

	return processedContent
}
