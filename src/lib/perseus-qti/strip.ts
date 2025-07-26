import type * as logger from "@superbuilders/slog"

/**
 * Converts problematic HTML entities to their numeric equivalents or actual characters.
 * This prevents validation errors from the QTI API which doesn't accept named HTML entities.
 *
 * @param xml The XML string to process
 * @param logger The logger instance
 * @returns The XML string with HTML entities converted
 */
export function convertHtmlEntities(xml: string, logger: logger.Logger): string {
	// Map of HTML entities to their replacements
	// Using actual Unicode characters instead of numeric entities where possible
	const entityMap: Record<string, string> = {
		"&nbsp;": "\u00A0", // Non-breaking space
		"&minus;": "−", // Minus sign (U+2212)
		"&ndash;": "–", // En dash (U+2013)
		"&mdash;": "—", // Em dash (U+2014)
		"&times;": "×", // Multiplication sign (U+00D7)
		"&divide;": "÷", // Division sign (U+00F7)
		"&copy;": "©", // Copyright (U+00A9)
		"&reg;": "®", // Registered (U+00AE)
		"&trade;": "™", // Trademark (U+2122)
		"&deg;": "°", // Degree (U+00B0)
		"&plusmn;": "±", // Plus-minus (U+00B1)
		"&frac14;": "¼", // One quarter (U+00BC)
		"&frac12;": "½", // One half (U+00BD)
		"&frac34;": "¾", // Three quarters (U+00BE)
		"&hellip;": "…", // Horizontal ellipsis (U+2026)
		"&euro;": "€", // Euro sign (U+20AC)
		"&pound;": "£", // Pound sign (U+00A3)
		"&yen;": "¥", // Yen sign (U+00A5)
		"&cent;": "¢", // Cent sign (U+00A2)
		"&le;": "≤", // Less than or equal to (U+2264)
		"&ge;": "≥" // Greater than or equal to (U+2265)
		// Note: We do NOT convert &lt;, &gt;, &amp; as these are required for XML escaping
	}

	let convertedXml = xml
	let totalReplacements = 0

	// Replace each entity with its equivalent
	for (const [entity, replacement] of Object.entries(entityMap)) {
		const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
		const matches = convertedXml.match(regex)
		if (matches) {
			totalReplacements += matches.length
			convertedXml = convertedXml.replace(regex, replacement)
		}
	}

	if (totalReplacements > 0) {
		logger.debug("converted html entities to unicode characters", {
			totalReplacements,
			originalLength: xml.length,
			convertedLength: convertedXml.length
		})
	}

	return convertedXml
}

/**
 * Strips all XML comments from the provided XML string.
 * This prevents issues with malformed comments that could cause XML parsing errors.
 *
 * @param xml The XML string to process
 * @param logger The logger instance
 * @returns The XML string with all comments removed
 */
export function stripXmlComments(xml: string, logger: logger.Logger): string {
	// EXTREMELY robust regex for matching XML comments
	// This handles multi-line comments and ensures we don't accidentally match
	// things that look like comments but aren't (e.g., within CDATA sections)
	//
	// The regex breakdown:
	// <!--              : Matches the exact opening of an XML comment
	// (?<content>       : Named capture group for the comment content
	//   (?:             : Non-capturing group for the content pattern
	//     (?!-->)       : Negative lookahead - ensures we don't match -->
	//     [\s\S]        : Matches any character including newlines
	//   )*              : Zero or more of any character that isn't part of -->
	// )                 : End of content capture group
	// -->               : Matches the exact closing of an XML comment
	const commentRegex = /<!--(?<content>(?:(?!-->)[\s\S])*)-->/g

	// Count comments for logging
	const commentMatches = xml.match(commentRegex)
	const commentCount = commentMatches ? commentMatches.length : 0

	if (commentCount > 0) {
		logger.debug("stripping xml comments", {
			commentCount,
			firstComment: commentMatches?.[0]?.substring(0, 100),
			originalLength: xml.length
		})
	}

	// Replace all comments with empty string
	const strippedXml = xml.replace(commentRegex, "")

	if (commentCount > 0) {
		logger.debug("xml comments stripped", {
			commentCount,
			originalLength: xml.length,
			strippedLength: strippedXml.length,
			bytesRemoved: xml.length - strippedXml.length
		})
	}

	return strippedXml
}
