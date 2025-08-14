import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Generates a OneRoster filter for prefix matching that leverages btree indexes.
 * Takes only the alphanumeric prefix of the input string and creates a range filter.
 *
 * @param prefix The prefix to search for
 * @returns A filter string like "sourcedId>='prefix' AND sourcedId<'prefixNext'"
 */
export function createPrefixFilter(prefix: string): string {
	// Extract only alphanumeric characters from the start of the string
	const alphanumericMatch = prefix.match(/^[a-zA-Z0-9]+/)
	if (!alphanumericMatch) {
		logger.error("No alphanumeric characters found at start of prefix", { prefix })
		throw errors.new(`No alphanumeric characters found at start of prefix: ${prefix}`)
	}

	const alphanumericPrefix = alphanumericMatch[0]

	// The regex guarantees at least one character, but check for TypeScript
	if (alphanumericPrefix.length === 0) {
		logger.error("Alphanumeric prefix cannot be empty", { prefix, alphanumericPrefix })
		throw errors.new("Alphanumeric prefix cannot be empty")
	}

	// Get the last character and increment its code point
	const lastIndex = alphanumericPrefix.length - 1
	const lastChar = alphanumericPrefix.charAt(lastIndex)
	const lastCharCode = lastChar.charCodeAt(0)
	const nextCharCode = lastCharCode + 1
	const nextChar = String.fromCharCode(nextCharCode)

	// Build the upper bound by replacing the last character
	const upperBound = alphanumericPrefix.slice(0, -1) + nextChar

	// Return the filter string
	return `sourcedId>='${alphanumericPrefix}' AND sourcedId<'${upperBound}'`
}
