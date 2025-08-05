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

	const dollarPairRegex = /\$(?<content>[^$]+)\$/g
	let match: RegExpExecArray | null
	match = dollarPairRegex.exec(htmlFragment)
	while (match !== null) {
		if (match.groups?.content) {
			const content = match.groups.content
			const isCurrency = /^\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/.test(content.trim())
			if (!isCurrency) {
				const contextIndex = match.index ?? 0
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
		match = dollarPairRegex.exec(htmlFragment)
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
