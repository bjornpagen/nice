/**
 * XML utility functions for extracting data from QTI XML strings
 */

/**
 * Escapes special characters in XML attribute values
 * @param value The value to escape
 * @returns The escaped value
 */
export function escapeXmlAttribute(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;")
}

/**
 * Sanitizes a value for use in XML attributes by removing invalid characters
 * @param value The value to sanitize
 * @returns The sanitized value
 */
export function sanitizeXmlAttributeValue(value: string): string {
	// Remove control characters and other invalid XML characters
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Control chars are intentionally handled here for data sanitization
	return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
}

/**
 * Replaces attributes on the root element of an XML string
 * @param xml The XML string
 * @param elementName The expected root element name
 * @param identifier The identifier attribute value
 * @param title The title attribute value
 * @returns The modified XML string
 */
export function replaceRootAttributes(xml: string, elementName: string, identifier: string, title: string): string {
	// Match the opening tag for the specified element anywhere in the document,
	// preserving any XML declaration that might appear before it.
	const regex = new RegExp(`<\s*${elementName}([^>]*)>`, "i")
	const match = xml.match(regex)
	if (!match) return xml

	const originalAttrs = match[1] ?? ""

	// Update or insert the identifier attribute
	let updatedAttrs = originalAttrs.replace(
		/\sidentifier=["'][^"']*["']/i,
		` identifier="${escapeXmlAttribute(identifier)}"`
	)
	if (!/\sidentifier=["'][^"']*["']/i.test(originalAttrs)) {
		updatedAttrs += ` identifier="${escapeXmlAttribute(identifier)}"`
	}

	// Update or insert the title attribute
	updatedAttrs = updatedAttrs.replace(/\stitle=["'][^"']*["']/i, ` title="${escapeXmlAttribute(title)}"`)
	if (!/\stitle=["'][^"']*["']/i.test(originalAttrs)) {
		updatedAttrs += ` title="${escapeXmlAttribute(title)}"`
	}

	// Reconstruct the opening tag with updated attributes
	const replacement = `<${elementName}${updatedAttrs}>`
	return xml.replace(regex, replacement)
}

/**
 * Extracts the identifier attribute from a QTI XML element
 * @param xml The XML string to parse
 * @param elementName The name of the element (e.g., 'qti-assessment-item')
 * @returns The identifier value or null if not found
 */
export function extractIdentifier(xml: string, elementName: string): string | null {
	// Match the element and extract the identifier attribute
	const regex = new RegExp(`<${elementName}[^>]*\\sidentifier=["']([^"']+)["']`, "i")
	const match = xml.match(regex)
	return match?.[1] ?? null
}

/**
 * Extracts the title from a QTI XML element
 * @param xml The XML string to parse
 * @returns The title value or null if not found
 */
export function extractTitle(xml: string): string | null {
	// Try to extract from title attribute
	const titleAttrMatch = xml.match(/\stitle=["']([^"']+)["']/i)
	if (titleAttrMatch?.[1]) return titleAttrMatch[1]

	// Try to extract from <qti-title> element
	const titleElementMatch = xml.match(/<qti-title[^>]*>([^<]+)<\/qti-title>/i)
	if (titleElementMatch?.[1]) return titleElementMatch[1].trim()

	return null
}

/**
 * Extracts the body content from a QTI stimulus XML
 * @param xml The XML string to parse
 * @returns The body content or null if not found
 */
export function extractQtiStimulusBodyContent(xml: string): string {
	// Extract content between <qti-stimulus-body> tags
	const match = xml.match(/<qti-stimulus-body[^>]*>([\s\S]*?)<\/qti-stimulus-body>/i)
	if (!match) {
		return ""
	}
	return (match[1] ?? "").trim()
}

/**
 * Extracts all assessment item references from a QTI test XML
 * @param xml The XML string to parse
 * @returns Array of referenced item identifiers
 */
export function extractItemRefs(xml: string): string[] {
	const itemRefs: string[] = []

	// Match all qti-assessment-item-ref elements and extract their identifier attributes
	const regex = /<qti-assessment-item-ref[^>]*\sidentifier=["']([^"']+)["']/gi
	let match: RegExpExecArray | null = regex.exec(xml)

	while (match !== null) {
		if (match[1]) itemRefs.push(match[1])
		match = regex.exec(xml)
	}

	// Also check for href attributes that might reference items
	const hrefRegex = /<qti-assessment-item-ref[^>]*\shref=["']([^"']+)["']/gi
	let hrefMatch: RegExpExecArray | null = hrefRegex.exec(xml)

	while (hrefMatch !== null) {
		// Extract identifier from href (usually the last part of the path without extension)
		const href = hrefMatch[1]
		if (href) {
			const identifier = href
				.split("/")
				.pop()
				?.replace(/\.[^.]+$/, "")
			if (identifier && !itemRefs.includes(identifier)) {
				itemRefs.push(identifier)
			}
		}
		hrefMatch = hrefRegex.exec(xml)
	}

	return itemRefs
}
