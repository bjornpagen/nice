import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Multi-pass QTI content normalization pipeline.
 * Implements systematic content model compliance based on QTI 3.0 specification.
 *
 * @see docs/qti-content-model-rules.md for detailed ruleset
 */

interface ContentAnalysis {
	hasRawText: boolean
	hasBlockInInline: boolean
	hasNestedParagraphs: boolean
	hasBlockInteractions: boolean
	hasInlineInteractions: boolean
	violationCount: number
}

interface ProcessingContext {
	phase: string
	violations: string[]
	transformations: number
}

/**
 * Phase 1: XML Syntax Fixes
 * Fix entity escaping and malformed XML structures.
 */
function fixXmlSyntax(content: string, context: ProcessingContext): string {
	logger.debug("phase 1: fixing xml syntax", { phase: context.phase })

	let fixed = content
	let transformations = 0

	// Fix unescaped XML entities
	const entityFixes = [
		{ pattern: /&(?![a-zA-Z]+;|#[0-9]+;|#x[0-9a-fA-F]+;)/g, replacement: "&amp;", name: "unescaped ampersand" },
		{ pattern: /</g, replacement: "&lt;", name: "unescaped less-than" },
		{ pattern: />/g, replacement: "&gt;", name: "unescaped greater-than" }
	]

	for (const fix of entityFixes) {
		const matches = fixed.match(fix.pattern)
		if (matches) {
			fixed = fixed.replace(fix.pattern, fix.replacement)
			transformations += matches.length
			context.violations.push(`${fix.name}: ${matches.length} instances`)
		}
	}

	// Sanitize invalid XML characters
	// Remove control characters that are not allowed in XML (except tab, LF, CR)
	// Using character code approach to avoid linter control character warnings
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control chars for XML sanitization
	const invalidCharPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
	const invalidChars = fixed.match(invalidCharPattern)
	if (invalidChars) {
		logger.debug("removing invalid xml characters", {
			count: invalidChars.length,
			examples: invalidChars.slice(0, 5).map((c) => `0x${c.charCodeAt(0).toString(16)}`)
		})
		fixed = fixed.replace(invalidCharPattern, "")
		transformations += invalidChars.length
		context.violations.push(`invalid xml characters: ${invalidChars.length} instances removed`)
	}

	// Convert common HTML entities to numeric entities (safer for XML)
	const htmlEntityFixes = [
		{ pattern: /&nbsp;/g, replacement: "&#160;", name: "nbsp entity" },
		{ pattern: /&ndash;/g, replacement: "&#8211;", name: "ndash entity" },
		{ pattern: /&mdash;/g, replacement: "&#8212;", name: "mdash entity" },
		{ pattern: /&ldquo;/g, replacement: "&#8220;", name: "ldquo entity" },
		{ pattern: /&rdquo;/g, replacement: "&#8221;", name: "rdquo entity" },
		{ pattern: /&lsquo;/g, replacement: "&#8216;", name: "lsquo entity" },
		{ pattern: /&rsquo;/g, replacement: "&#8217;", name: "rsquo entity" },
		{ pattern: /&hellip;/g, replacement: "&#8230;", name: "hellip entity" }
	]

	for (const fix of htmlEntityFixes) {
		const matches = fixed.match(fix.pattern)
		if (matches) {
			fixed = fixed.replace(fix.pattern, fix.replacement)
			transformations += matches.length
			context.violations.push(`${fix.name}: ${matches.length} instances converted`)
		}
	}

	// Fix malformed MathML tags
	const mathmlFixes = [
		{
			pattern: /<mroot><mn>([^<]+)<\/mn><mn>([^<]+)<\/mroot>/g,
			replacement: "<mroot><mn>$1</mn><mn>$2</mn></mroot>",
			name: "malformed mroot tags"
		}
	]

	for (const fix of mathmlFixes) {
		const beforeCount = (fixed.match(fix.pattern) || []).length
		fixed = fixed.replace(fix.pattern, fix.replacement)
		const afterCount = (fixed.match(fix.pattern) || []).length
		const fixedCount = beforeCount - afterCount
		if (fixedCount > 0) {
			transformations += fixedCount
			context.violations.push(`${fix.name}: ${fixedCount} instances`)
		}
	}

	// Fix basic XML structure issues
	// Remove invalid characters in tag names and fix malformed attributes
	const xmlStructureFixes = [
		// Fix malformed tag names (remove invalid characters)
		{
			// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control chars in XML tags
			pattern: /<([a-zA-Z][\w:-]*[^>]*?)[\u0000-\u001F\u007F]+([^>]*?)>/g,
			replacement: "<$1$2>",
			name: "invalid characters in tags"
		},
		// Fix unclosed self-closing tags
		{
			pattern: /<(img|br|hr|input|meta)([^>]*?)(?<!\/)\s*>/g,
			replacement: "<$1$2 />",
			name: "unclosed self-closing tags"
		},
		// Fix malformed attribute values (remove control chars)
		{
			// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control chars in XML attributes
			pattern: /(\w+)=["']([^"']*?)[\u0000-\u001F\u007F]+([^"']*?)["']/g,
			replacement: '$1="$2$3"',
			name: "invalid characters in attributes"
		}
	]

	for (const fix of xmlStructureFixes) {
		const matches = fixed.match(fix.pattern)
		if (matches) {
			fixed = fixed.replace(fix.pattern, fix.replacement)
			transformations += matches.length
			context.violations.push(`${fix.name}: ${matches.length} instances fixed`)
		}
	}

	context.transformations += transformations
	logger.debug("phase 1 complete", { transformations, violations: context.violations.length })

	return fixed
}

/**
 * Phase 2: Content Model Analysis
 * Analyze content structure to detect QTI schema violations.
 */
function analyzeContent(content: string): ContentAnalysis {
	logger.debug("phase 2: analyzing content model")

	const analysis: ContentAnalysis = {
		hasRawText: false,
		hasBlockInInline: false,
		hasNestedParagraphs: false,
		hasBlockInteractions: false,
		hasInlineInteractions: false,
		violationCount: 0
	}

	// Detect raw text at start (element-only violation)
	const trimmed = content.trim()
	if (trimmed && !trimmed.startsWith("<")) {
		analysis.hasRawText = true
		analysis.violationCount++
	}

	// Detect block elements inside inline contexts
	const blockInInlinePattern = /<(?:p|span)[^>]*>[^<]*<(?:div|table|ul|ol|blockquote|pre|h[1-6])[^>]*>/gi
	if (blockInInlinePattern.test(content)) {
		analysis.hasBlockInInline = true
		analysis.violationCount++
	}

	// Detect nested paragraphs
	const nestedPPattern = /<p[^>]*>[^<]*<p[^>]*>/gi
	if (nestedPPattern.test(content)) {
		analysis.hasNestedParagraphs = true
		analysis.violationCount++
	}

	// Detect interaction types
	const blockInteractionPattern = /<qti-(?:choice|order)-interaction[^>]*>/gi
	const inlineInteractionPattern = /<qti-(?:text-entry|inline-choice)-interaction[^>]*>/gi

	if (blockInteractionPattern.test(content)) {
		analysis.hasBlockInteractions = true
	}
	if (inlineInteractionPattern.test(content)) {
		analysis.hasInlineInteractions = true
	}

	logger.debug("content analysis complete", {
		analysis,
		violationCount: analysis.violationCount
	})

	return analysis
}

/**
 * Phase 3: Raw Text Wrapping
 * Wrap raw text content in proper elements for element-only contexts.
 */
function wrapRawText(content: string): { content: string; transformations: number } {
	logger.debug("phase 3: wrapping raw text")

	let wrapped = content
	let transformations = 0

	// If content starts with raw text, wrap in paragraph
	const trimmed = wrapped.trim()
	if (trimmed && !trimmed.startsWith("<")) {
		wrapped = `<p>${wrapped}</p>`
		transformations++
	}

	logger.debug("phase 3 complete", { transformations })

	return { content: wrapped, transformations }
}

/**
 * Phase 4: Block Element Splitting
 * Split paragraphs that contain block elements (tables, choice interactions).
 */
function splitBlockElements(content: string): { content: string; transformations: number } {
	logger.debug("phase 4: splitting block elements")

	let split = content
	let transformations = 0

	// Split paragraphs containing tables
	const tableSplitPattern = /<p([^>]*)>(.*?)(<table[^>]*>[\s\S]*?<\/table>)(.*?)<\/p>/gi
	split = split.replace(tableSplitPattern, (_match, pAttrs, beforeText, table, afterText) => {
		transformations++
		let result = ""

		const trimmedBefore = beforeText.trim()
		if (trimmedBefore) {
			result += `<p${pAttrs}>${beforeText}</p>`
		}

		result += table

		const trimmedAfter = afterText.trim()
		if (trimmedAfter) {
			result += `<p${pAttrs}>${afterText}</p>`
		}

		return result
	})

	// Split paragraphs containing choice interactions wrapped in divs
	const choiceInteractionPattern =
		/<p([^>]*)>(.*?)<div[^>]*>(<qti-(?:choice|order)-interaction[^>]*>[\s\S]*?<\/qti-(?:choice|order)-interaction>)<\/div>(.*?)<\/p>/gi
	split = split.replace(choiceInteractionPattern, (_match, pAttrs, beforeText, interaction, afterText) => {
		transformations++
		let result = ""

		const trimmedBefore = beforeText.trim()
		if (trimmedBefore) {
			result += `<p${pAttrs}>${beforeText}</p>`
		}

		result += `<div>${interaction}</div>`

		const trimmedAfter = afterText.trim()
		if (trimmedAfter) {
			result += `<p${pAttrs}>${afterText}</p>`
		}

		return result
	})

	logger.debug("phase 4 complete", { transformations })

	return { content: split, transformations }
}

/**
 * Phase 5: Inline Context Conversion
 * Convert block elements to inline elements in prompt/feedback contexts.
 */
function convertInlineContexts(content: string): { content: string; transformations: number } {
	logger.debug("phase 5: converting inline contexts")

	let converted = content
	let transformations = 0

	// Convert <p> to <span> in interaction prompts and feedback
	// This handles the transformToInlineContent logic from interaction-compiler.ts
	const promptFeedbackPattern =
		/<(qti-feedback-inline|prompt)[^>]*>([^<]*(?:<(?!\/(?:qti-feedback-inline|prompt)>)[^<]*)*)<\/(?:qti-feedback-inline|prompt)>/gi

	converted = converted.replace(promptFeedbackPattern, (_match, tagName, innerContent) => {
		const inlineContent = innerContent
			.replace(/<p(\s[^>]*)?>([^<]*(?:<(?!\/p>)[^<]*)*)<\/p>/gi, "<span$1>$2</span>")
			.replace(/<p>/gi, "<span>")
			.replace(/<\/p>/gi, "</span>")

		if (inlineContent !== innerContent) {
			transformations++
		}

		return `<${tagName}>${inlineContent}</${tagName}>`
	})

	logger.debug("phase 5 complete", { transformations })

	return { content: converted, transformations }
}

/**
 * Phase 6: Context-Aware Interaction Wrapping
 * Apply appropriate wrappers to interactions based on QTI content model rules.
 */
function wrapInteractions(content: string): { content: string; transformations: number } {
	logger.debug("phase 6: wrapping interactions")

	const transformations = 0

	// This phase is handled by the interaction-compiler.ts
	// The interactions are already properly wrapped when they're compiled
	// This placeholder ensures the pipeline is complete

	logger.debug("phase 6 complete", { transformations })

	return { content, transformations }
}

/**
 * Phase 7: Final Validation
 * Perform final checks and cleanup.
 */
function finalValidation(content: string): { content: string; transformations: number } {
	logger.debug("phase 7: final validation")

	// Final cleanup of any remaining nested paragraph issues
	let validated = content
	let transformations = 0

	// Convert any remaining nested <p> tags to <span>
	const nestedPPattern = /<p([^>]*)>(<qti-[^>]*-interaction[^>]*\/>)<\/p>/gi
	const beforeMatches = (validated.match(nestedPPattern) || []).length
	validated = validated.replace(nestedPPattern, "<span$1>$2</span>")
	const afterMatches = (validated.match(nestedPPattern) || []).length
	transformations = beforeMatches - afterMatches

	logger.debug("phase 7 complete", { transformations })

	return { content: validated, transformations }
}

/**
 * Phase 8: MathML Normalization
 * Fix MathML namespace, placement, and structure issues.
 */
function normalizeMathML(content: string): { content: string; transformations: number } {
	logger.debug("phase 8: normalizing mathml")

	let normalized = content
	let transformations = 0

	// Fix 1: Correct MathML namespace (2000 -> 1998)
	const namespace2000Matches = normalized.match(/http:\/\/www\.w3\.org\/2000\/Math\/MathML/g)
	if (namespace2000Matches) {
		normalized = normalized.replace(/http:\/\/www\.w3\.org\/2000\/Math\/MathML/g, "http://www.w3.org/1998/Math/MathML")
		transformations += namespace2000Matches.length
		logger.debug("fixed mathml namespace", { count: namespace2000Matches.length })
	}

	// Fix 2: Ensure MathML elements have proper namespace declaration
	const mathElementsWithoutNs = normalized.match(/<math(?![^>]*xmlns)/g)
	if (mathElementsWithoutNs) {
		normalized = normalized.replace(/<math(?![^>]*xmlns)/g, '<math xmlns="http://www.w3.org/1998/Math/MathML"')
		transformations += mathElementsWithoutNs.length
		logger.debug("added mathml namespace declarations", { count: mathElementsWithoutNs.length })
	}

	// Fix 3: Replace deprecated mfenced elements
	const mfencedPattern = /<mfenced([^>]*)>(.*?)<\/mfenced>/g
	let mfencedReplacements = 0
	let mfencedMatch = mfencedPattern.exec(normalized)

	while (mfencedMatch !== null) {
		const attributes = mfencedMatch[1] || ""
		const content = mfencedMatch[2] || ""
		let separators = ","

		// Extract separators attribute if present
		const separatorsMatch = attributes.match(/separators=["']([^"']*?)["']/)
		if (separatorsMatch) {
			separators = separatorsMatch[1] || ","
		}

		// Build mrow replacement
		const separatorElements = separators
			.split("")
			.map((sep) => `<mo>${sep}</mo>`)
			.join("")

		const replacement = `<mrow><mo>(</mo>${content.replace(/(<\/m[^>]+>)(?!$)/g, `$1${separatorElements}`)}<mo>)</mo></mrow>`

		normalized = normalized.replace(mfencedMatch[0], replacement)
		mfencedReplacements++
		mfencedMatch = mfencedPattern.exec(normalized)
	}

	if (mfencedReplacements > 0) {
		transformations += mfencedReplacements
		logger.debug("replaced deprecated mfenced elements", { count: mfencedReplacements })
	}

	// Fix 4: Wrap orphaned MathML elements in paragraphs
	// Pattern: <math> directly in qti-item-body or other block contexts
	const orphanedMathPattern = /(<qti-item-body[^>]*>|<div[^>]*>|<qti-content-body[^>]*>)\s*(<math[^>]*>.*?<\/math>)/g
	const orphanedMathMatches = normalized.match(orphanedMathPattern)
	if (orphanedMathMatches) {
		normalized = normalized.replace(orphanedMathPattern, "$1<p>$2</p>")
		transformations += orphanedMathMatches.length
		logger.debug("wrapped orphaned mathml elements", { count: orphanedMathMatches.length })
	}

	// Fix 5: Fix incomplete msup/msub elements (must have exactly 2 children)
	const incompleteMsupPattern = /<msup>\s*(<[^>]+>.*?<\/[^>]+>)\s*<\/msup>/g
	const incompleteMsupMatches = normalized.match(incompleteMsupPattern)
	if (incompleteMsupMatches) {
		normalized = normalized.replace(incompleteMsupPattern, "<msup>$1<mn></mn></msup>")
		transformations += incompleteMsupMatches.length
		logger.debug("fixed incomplete msup elements", { count: incompleteMsupMatches.length })
	}

	const incompleteMsubPattern = /<msub>\s*(<[^>]+>.*?<\/[^>]+>)\s*<\/msub>/g
	const incompleteMsubMatches = normalized.match(incompleteMsubPattern)
	if (incompleteMsubMatches) {
		normalized = normalized.replace(incompleteMsubPattern, "<msub>$1<mn></mn></msub>")
		transformations += incompleteMsubMatches.length
		logger.debug("fixed incomplete msub elements", { count: incompleteMsubMatches.length })
	}

	logger.debug("phase 8 complete", { transformations })

	return { content: normalized, transformations }
}

/**
 * Main entry point: Multi-pass QTI content normalization pipeline.
 * Systematically applies transformations to ensure QTI schema compliance.
 */
export function normalizeQtiContent(content: string): string {
	logger.info("starting qti content normalization", {
		inputLength: content.length
	})

	let totalTransformations = 0
	const violations: string[] = []

	const result = errors.trySync(() => {
		let normalized = content

		// Phase 1: XML Syntax Fixes
		normalized = fixXmlSyntax(normalized, { phase: "xml-syntax", violations, transformations: 0 })

		// Phase 2: Content Model Analysis
		analyzeContent(normalized)

		// Phase 3: Raw Text Wrapping
		const phase3 = wrapRawText(normalized)
		normalized = phase3.content
		totalTransformations += phase3.transformations

		// Phase 4: Block Element Splitting
		const phase4 = splitBlockElements(normalized)
		normalized = phase4.content
		totalTransformations += phase4.transformations

		// Phase 5: Inline Context Conversion
		const phase5 = convertInlineContexts(normalized)
		normalized = phase5.content
		totalTransformations += phase5.transformations

		// Phase 6: Context-Aware Interaction Wrapping
		const phase6 = wrapInteractions(normalized)
		normalized = phase6.content
		totalTransformations += phase6.transformations

		// Phase 7: Final Validation
		const phase7 = finalValidation(normalized)
		normalized = phase7.content
		totalTransformations += phase7.transformations

		// Phase 8: MathML Normalization
		const phase8 = normalizeMathML(normalized)
		normalized = phase8.content
		totalTransformations += phase8.transformations

		logger.info("qti content normalization complete", {
			totalTransformations,
			violationsFound: violations.length,
			violations,
			outputLength: normalized.length
		})

		return normalized
	})

	if (result.error) {
		logger.error("qti content normalization failed", {
			error: result.error,
			violations,
			transformations: totalTransformations
		})
		throw errors.wrap(result.error, "qti content normalization")
	}

	return result.data
}
