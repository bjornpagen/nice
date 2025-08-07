/**
 * XML utility functions for safe attribute value escaping and manipulation
 */

import * as errors from "@superbuilders/errors"

/**
 * Sanitizes a string for safe inclusion in XML attribute values by
 * - normalizing common mis-encodings found in source content
 * - removing disallowed control characters (per XML 1.0)
 */
export function sanitizeXmlAttributeValue(raw: string): string {
	// Normalize common mis-encodings observed in dataset
	// U+0019 often used as an apostrophe; normalize to the ASCII apostrophe
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Control chars are intentionally handled here for data sanitization
	let value = raw.replace(/\u0019|\x19|[\u0019]/g, "'")

	// Rare control char U+0004 sometimes appears between digits to denote a fraction like 1\u00044
	// Normalize digit-CTRL-digit to digit/digit
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Control chars are intentionally handled here for data sanitization
	value = value.replace(/(\d)\u0004(\d)/g, "$1/$2")

	// Remove all other disallowed control characters except TAB (0x09), LF (0x0A), CR (0x0D)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Control chars are intentionally handled here for data sanitization
	value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")

	return value
}

/**
 * Escapes special characters in a string to make it safe for use as an XML attribute value.
 * Must escape & first to avoid double-escaping other entities.
 *
 * @param value - The string to escape
 * @returns The escaped string safe for XML attributes
 */
export function escapeXmlAttribute(value: string): string {
	const sanitized = sanitizeXmlAttributeValue(value)
	return sanitized
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

/**
 * Extracts the content from within <qti-stimulus-body> tags in a QTI XML document.
 * This is a hyper-robust implementation that handles various edge cases and XML variations.
 *
 * The QTI API expects only the inner HTML content of the stimulus body, not the full XML document.
 *
 * @param xml - The full QTI XML document
 * @returns The extracted inner HTML content from the qti-stimulus-body element
 * @throws Error if no qti-stimulus-body element is found or if content extraction fails
 */
export function extractQtiStimulusBodyContent(xml: string): string {
	// Remove any BOM (Byte Order Mark) that might be present
	const cleanXml = xml.replace(/^\uFEFF/, "")

	// Hyper-robust regex explanation:
	// 1. <qti-stimulus-body - Match the opening tag name exactly
	// 2. (?![a-zA-Z0-9_-]) - Negative lookahead to ensure tag name ends here (not qti-stimulus-body-something)
	// 3. (?:\s+ - Optional whitespace followed by attributes
	// 4. (?:[^>"']+|"[^"]*"|'[^']*')* - Match attributes (unquoted, double-quoted, or single-quoted values)
	// 5. )? - Make attributes section optional
	// 6. \s*> - Optional whitespace and closing bracket
	// 7. ([\s\S]*?) - Capture group for content (non-greedy, matches anything including newlines)
	// 8. </qti-stimulus-body\s*> - Closing tag with optional whitespace before >
	const bodyRegex =
		/<qti-stimulus-body(?![a-zA-Z0-9_-])(?:\s+(?:[^>"']+|"[^"]*"|'[^']*')*)?\s*>([\s\S]*?)<\/qti-stimulus-body\s*>/i

	const match = cleanXml.match(bodyRegex)

	if (!match || !match[1]) {
		// Try to provide helpful error context
		const hasOpenTag = cleanXml.match(/<qti-stimulus-body/i)
		const hasCloseTag = cleanXml.match(/<\/qti-stimulus-body/i)

		if (!hasOpenTag && !hasCloseTag) {
			throw errors.new("No qti-stimulus-body element found in XML")
		}
		if (!hasOpenTag) {
			throw errors.new("Found closing </qti-stimulus-body> tag but no opening tag")
		}
		if (!hasCloseTag) {
			throw errors.new("Found opening <qti-stimulus-body> tag but no closing tag")
		}
		// Both tags exist but regex didn't match - likely malformed
		throw errors.new("Found qti-stimulus-body tags but they appear to be malformed or improperly nested")
	}

	// Extract the content and handle edge cases
	let content = match[1]

	// Check for self-closing tag (should have no content)
	if (cleanXml.match(/<qti-stimulus-body[^>]*\/>/i)) {
		return ""
	}

	// Trim the content but preserve intentional whitespace within
	// Only trim leading/trailing whitespace that's likely from XML formatting
	content = content.replace(/^\s*\n/, "").replace(/\n\s*$/, "")

	// Validate that we actually extracted something meaningful
	if (content.length === 0) {
		// Empty content is valid - some stimuli might legitimately be empty
		return ""
	}

	return content
}
