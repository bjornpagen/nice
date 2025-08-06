import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import he from "he"

const LATEX_LIKE_REGEX = /\\(?:[a-zA-Z]+|[(){}[\]])/

// ADD: New regex constants for the new checks.
const PERSEUS_ARTIFACT_REGEX = /\[\[☃\s*[\s\S]*?\]\]/
const MFENCED_REGEX = /<mfenced(?:\s+[^>]*)?>/i

/**
 * Validates that no LaTeX content is present in an HTML/XML string fragment.
 * Throws an error if LaTeX is detected.
 * @param htmlFragment The string to validate.
 * @param logger The logger instance.
 */
export function checkNoLatex(htmlFragment: string, logger: logger.Logger): void {
	const latexCommandMatch = htmlFragment.match(LATEX_LIKE_REGEX)
	if (latexCommandMatch) {
		const contextIndex = latexCommandMatch.index ?? 0
		const errorContext = htmlFragment.substring(
			Math.max(0, contextIndex - 50),
			Math.min(htmlFragment.length, contextIndex + 50)
		)
		logger.error("found latex command-like content", { match: latexCommandMatch[0], context: errorContext })
		throw errors.new(
			`Invalid content: LaTeX command-like content is not allowed. Found: "${latexCommandMatch[0]}". Context: "...${errorContext}..."`
		)
	}

	// First, check if dollar signs are properly tagged as currency - if so, skip LaTeX validation
	// This handles cases like <span class="currency">$</span>
	const currencyTaggedDollar = /<span\s+class\s*=\s*["']currency["']\s*>\s*\$\s*<\/span>/gi
	const fragmentWithoutCurrencyTags = htmlFragment.replace(currencyTaggedDollar, "CURRENCY_PLACEHOLDER")

	// Also handle cases where $ appears right before a number or math tag (likely currency)
	// Examples: $50, $<math>, <mo>$</mo>
	const currencyPatterns = [
		// Dollar sign in MathML operator element (e.g., <mo>$</mo>)
		/<mo(?:\s+[^>]*)?>[\s]*\$[\s]*<\/mo>/gi,
		// Dollar sign immediately before a number or math tag
		/\$(?=\s*(?:<math|<mn|\d))/g,
		// Dollar sign at end of sentence/phrase before punctuation or tag
		/\$(?=\s*(?:[.,;:!?]|<\/|$))/g
	]

	let processedFragment = fragmentWithoutCurrencyTags
	for (const pattern of currencyPatterns) {
		processedFragment = processedFragment.replace(pattern, "CURRENCY_PLACEHOLDER")
	}

	// Now check for LaTeX-style dollar delimiters in the processed fragment
	const dollarPairRegex = /\$(?<content>[^$]+)\$/g
	let match: RegExpExecArray | null
	match = dollarPairRegex.exec(processedFragment)
	while (match !== null) {
		if (match.groups?.content) {
			const content = match.groups.content
			// Check if this looks like mathematical content (not just a number)
			const hasMathIndicators =
				// Variables or expressions with operators
				/[a-zA-Z]\s*[+\-*/=]/.test(content) ||
				// Superscript or subscript notation
				/[a-zA-Z0-9][_^]/.test(content) ||
				// Mathematical functions or parentheses with variables
				/\([^)]*[a-zA-Z][^)]*\)/.test(content) ||
				// Mixed letters and numbers (like 2x, 3y)
				/\d+[a-zA-Z]|[a-zA-Z]+\d/.test(content) ||
				// Equals signs with variables
				/[a-zA-Z]\s*=/.test(content)

			if (hasMathIndicators) {
				// Find the original position in the unprocessed fragment
				const contextIndex = htmlFragment.indexOf(match[0])
				if (contextIndex !== -1) {
					const errorContext = htmlFragment.substring(
						Math.max(0, contextIndex - 50),
						Math.min(htmlFragment.length, contextIndex + 50)
					)
					logger.error("found dollar-sign delimited latex", { match: match[0], context: errorContext })
					throw errors.new(
						`Invalid content: Dollar-sign delimited LaTeX is not allowed. Found: "${match[0]}". Context: "...${errorContext}..."`
					)
				}
			}
		}
		match = dollarPairRegex.exec(processedFragment)
	}
}

/**
 * NEW: Validates that no Perseus artifacts are present in an HTML/XML string fragment.
 * Throws an error if an artifact is detected.
 * @param htmlFragment The string to validate.
 * @param logger The logger instance.
 */
export function checkNoPerseusArtifacts(htmlFragment: string, logger: logger.Logger): void {
	const match = htmlFragment.match(PERSEUS_ARTIFACT_REGEX)
	if (match) {
		const contextIndex = match.index ?? 0
		const errorContext = htmlFragment.substring(
			Math.max(0, contextIndex - 50),
			Math.min(htmlFragment.length, contextIndex + 50)
		)
		logger.error("found perseus artifact", { match: match[0], context: errorContext })
		throw errors.new(
			`Invalid content: Perseus artifact '[[☃ ...]]' is not allowed. Found: "${match[0]}". Context: "...${errorContext}..."`
		)
	}
}

/**
 * NEW: Validates that no deprecated <mfenced> elements are used in an HTML/XML string fragment.
 * Throws an error if an mfenced element is detected.
 * @param htmlFragment The string to validate.
 * @param logger The logger instance.
 */
export function checkNoMfencedElements(htmlFragment: string, logger: logger.Logger): void {
	const match = htmlFragment.match(MFENCED_REGEX)
	if (match) {
		const contextIndex = match.index ?? 0
		const errorContext = htmlFragment.substring(
			Math.max(0, contextIndex - 50),
			Math.min(htmlFragment.length, contextIndex + 50)
		)
		logger.error("found deprecated mfenced element", { match: match[0], context: errorContext })
		throw errors.new(
			`Invalid MathML: The <mfenced> element is deprecated and not allowed. Found: "${match[0]}". Context: "...${errorContext}..."`
		)
	}
}

/**
 * A shared utility to convert problematic HTML entities to their character equivalents.
 * @param htmlFragment The HTML string to process.
 * @returns The processed string.
 */
export function sanitizeHtmlEntities(htmlFragment: string): string {
	const exceptions = new Set(["&quot;", "&apos;", "&lt;", "&gt;", "&amp;"])
	const entityRegex = /&(#?[a-zA-Z0-9]+);/g
	return htmlFragment.replace(entityRegex, (match) => {
		if (exceptions.has(match)) {
			return match
		}
		return he.decode(match)
	})
}

/**
 * A shared utility to fix common MathML operator issues.
 * @param htmlFragment The HTML string to process.
 * @returns The processed string.
 */
export function sanitizeMathMLOperators(htmlFragment: string): string {
	let fixedXml = htmlFragment
	fixedXml = fixedXml.replace(/<mo(?:\s+[^>]?)?>(<)<\/mo>/gi, (match) => match.replace("<</mo>", "&lt;</mo>"))
	fixedXml = fixedXml.replace(/<mo(?:\s+[^>]*)?>><\/mo>/gi, (match) => match.replace("></mo>", "&gt;</mo>"))
	fixedXml = fixedXml.replace(/<mo(?:\s+[^>]?)?><=(\/mo>)/gi, (match) => match.replace("<=", "≤"))
	fixedXml = fixedXml.replace(/<mo(?:\s+[^>]*)?>>=(<\/mo>)/gi, (match) => match.replace(">=", "≥"))
	return fixedXml
}
