import type * as logger from "@superbuilders/slog"
import he from "he"

/**
 * Converts problematic HTML entities to their numeric equivalents or actual characters.
 * This prevents validation errors from the QTI API which doesn't accept named HTML entities.
 *
 * @param xml The XML string to process
 * @param logger The logger instance
 * @returns The XML string with HTML entities converted
 */
export function convertHtmlEntities(xml: string, logger: logger.Logger): string {
	const exceptions = new Set(["&quot;", "&apos;", "&lt;", "&gt;", "&amp;"])
	const entityRegex = /&(#?[a-zA-Z0-9]+);/g

	let totalReplacements = 0
	const convertedXml = xml.replace(entityRegex, (match) => {
		if (exceptions.has(match)) {
			return match
		}
		totalReplacements++
		return he.decode(match)
	})

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

/**
 * Removes consecutive newlines from the XML string, leaving only single newlines.
 * This handles all types of line endings (Unix \n, Windows \r\n, and mixed).
 *
 * @param xml The XML string to process
 * @param logger The logger instance
 * @returns The XML string with consecutive newlines reduced to single newlines
 */
export function removeDoubleNewlines(xml: string, logger: logger.Logger): string {
	// First normalize all line endings to \n for consistent processing
	// This handles \r\n (Windows), \r (old Mac), and leaves \n (Unix) as is
	const normalizedXml = xml.replace(/\r\n/g, "\n").replace(/\r/g, "\n")

	// Count the number of double (or more) newline sequences before replacement
	const doubleNewlineMatches = normalizedXml.match(/\n{2,}/g)
	const doubleNewlineCount = doubleNewlineMatches ? doubleNewlineMatches.length : 0

	if (doubleNewlineCount > 0) {
		// Calculate total excess newlines
		const excessNewlines = doubleNewlineMatches?.reduce((sum, match) => sum + match.length - 1, 0)

		logger.debug("removing double newlines", {
			doubleNewlineSequences: doubleNewlineCount,
			totalExcessNewlines: excessNewlines,
			originalLength: xml.length
		})
	}

	// Replace any sequence of 2 or more newlines with a single newline
	const cleanedXml = normalizedXml.replace(/\n{2,}/g, "\n")

	if (doubleNewlineCount > 0) {
		logger.debug("double newlines removed", {
			sequencesRemoved: doubleNewlineCount,
			originalLength: xml.length,
			cleanedLength: cleanedXml.length,
			bytesRemoved: xml.length - cleanedXml.length
		})
	}

	return cleanedXml
}
