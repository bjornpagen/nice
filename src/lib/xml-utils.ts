/**
 * XML utility functions for safe attribute value escaping and manipulation
 */

/**
 * Escapes special characters in a string to make it safe for use as an XML attribute value.
 * Must escape & first to avoid double-escaping other entities.
 *
 * @param value - The string to escape
 * @returns The escaped string safe for XML attributes
 */
export function escapeXmlAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;") // Must be first to avoid double-escaping
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
}

/**
 * Replaces the identifier and title attributes on the root tag of a given XML string.
 *
 * @param xml - The original XML string
 * @param rootTag - The name of the root tag (e.g., "qti-assessment-item")
 * @param newIdentifier - The new identifier to set
 * @param newTitle - The new title to set
 * @returns The XML string with updated attributes
 */
export function replaceRootAttributes(xml: string, rootTag: string, newIdentifier: string, newTitle: string): string {
	// A robust regex to find the root tag and capture its attributes
	const rootTagRegex = new RegExp(`<(${rootTag})([^>]*?)>`)

	// Escape the title to be safely used in an XML attribute
	const safeTitle = escapeXmlAttribute(newTitle)

	return xml.replace(rootTagRegex, (_match, tagName, existingAttrs) => {
		// Replace attributes within the captured group
		let updatedAttrs = existingAttrs.replace(/identifier="[^"]*"/, `identifier="${newIdentifier}"`)
		updatedAttrs = updatedAttrs.replace(/title="[^"]*"/, `title="${safeTitle}"`)
		return `<${tagName}${updatedAttrs}>`
	})
}
