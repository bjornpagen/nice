import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { QTI_INTERACTION_TAGS } from "@/lib/qti-generation/valid-tags"
import { escapeXmlAttribute, extractQtiStimulusBodyContent } from "@/lib/xml-utils"
import { ghettoValidateItem, ghettoValidateTest } from "@/lib/qti-validation/ghetto"

type ValidationContext = {
	id: string
	rootTag: string
	title: string // Title is required
	logger: logger.Logger
	// MODIFIED: Make perseusContent optional
	perseusContent?: unknown
}

// Centralized Regex Constants
const REGEX = {
	PERSEUS_ARTIFACT: /\[\[☃\s*[\s\S]*?\]\]/g,
	TRUNCATED_TAG: /<\/(?:_|\s*>|\.\.\.)/,
	IMAGE_URL: /(?<attribute>src|href)\s*=\s*["'](?<url>https?:\/\/[^"']+\.(?:svg|jpe?g|png|gif))["']/gi,
	SUPPORTED_IMAGE_URL: /(?<attribute>src|href)\s*=\s*["'](?<url>https?:\/\/[^"']+\.(?:jpe?g|png|gif))["']/gi,
	// Simple LaTeX detection: any backslash followed by letters (commands) or LaTeX-like constructs
	LATEX_LIKE: /\\(?:[a-zA-Z]+|[(){}[\]])/
} as const

/**
 * Validates that < and > symbols are properly escaped within XML content.
 * This prevents XML parsing errors from unescaped angle brackets in text content.
 */
function validateXmlAngleBrackets(xml: string, logger: logger.Logger): string | null {
	// First, remove all valid XML constructs to isolate just the content
	// This is done in stages to avoid false positives

	// Step 1: Remove XML declaration
	let contentOnly = xml.replace(/<\?xml[^?]*\?>/g, "")

	// Step 2: Remove XML comments (which might contain < or >)
	contentOnly = contentOnly.replace(/<!--[\s\S]*?-->/g, "")

	// Step 3: Remove CDATA sections (which can contain unescaped < and >)
	contentOnly = contentOnly.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")

	// Step 4: Extract only the text content between tags
	// This regex captures content between > and < that isn't part of a tag
	const textContentMatches: string[] = []

	// Match content between tags, being careful with self-closing tags
	const contentRegex = />([^<]+)</g
	let match: RegExpExecArray | null
	match = contentRegex.exec(contentOnly)
	while (match !== null) {
		if (match[1]) {
			textContentMatches.push(match[1])
		}
		match = contentRegex.exec(contentOnly)
	}

	// Also check attribute values which could contain < or >
	const attrValueRegex = /\s+[-\w:]+\s*=\s*(["'])(.*?)\1/g
	match = attrValueRegex.exec(xml)
	while (match !== null) {
		if (match[2]) {
			textContentMatches.push(match[2])
		}
		match = attrValueRegex.exec(xml)
	}

	// Now check each piece of content for unescaped < or >
	for (const content of textContentMatches) {
		// Skip if this content is just whitespace
		if (!content.trim()) continue

		// Check for unescaped <
		if (content.includes("<")) {
			logger.error("found unescaped < in xml content", {
				content: content.substring(0, 100),
				context: content.substring(
					Math.max(0, content.indexOf("<") - 20),
					Math.min(content.length, content.indexOf("<") + 20)
				)
			})
			return "invalid xml content: Unescaped '<' character found. Use &lt; instead."
		}

		// Check for unescaped >
		if (content.includes(">")) {
			logger.error("found unescaped > in xml content", {
				content: content.substring(0, 100),
				context: content.substring(
					Math.max(0, content.indexOf(">") - 20),
					Math.min(content.length, content.indexOf(">") + 20)
				)
			})
			return "invalid xml content: Unescaped '>' character found. Use &gt; instead."
		}
	}

	// Additional check: Look for < or > that might be in text nodes using a different approach
	// This catches cases where < or > appear in ways the above might miss
	const tagRegex = /<(?:"[^"]*"|'[^']*'|[^>"'])+>/g
	const xmlWithoutTags = contentOnly.replace(tagRegex, " ")

	if (xmlWithoutTags.includes("<")) {
		logger.error("found unescaped < after tag removal", {
			sample: xmlWithoutTags.substring(
				Math.max(0, xmlWithoutTags.indexOf("<") - 50),
				Math.min(xmlWithoutTags.length, xmlWithoutTags.indexOf("<") + 50)
			)
		})
		return "invalid xml content: Unescaped '<' character found in text content. Use &lt; instead."
	}

	if (xmlWithoutTags.includes(">")) {
		logger.error("found unescaped > after tag removal", {
			sample: xmlWithoutTags.substring(
				Math.max(0, xmlWithoutTags.indexOf(">") - 50),
				Math.min(xmlWithoutTags.length, xmlWithoutTags.indexOf(">") + 50)
			)
		})
		return "invalid xml content: Unescaped '>' character found in text content. Use &gt; instead."
	}

	return null
}

export function validateRootElement(xml: string, context: ValidationContext): void {
	const { logger } = context
	const rootTagRegex = new RegExp(
		`^<\\?xml[^>]*\\?>\\s*<${context.rootTag}[^>]*>[\\s\\S]*<\\/${context.rootTag}>\\s*$`,
		"s"
	)
	if (!rootTagRegex.test(xml.trim())) {
		logger.error("invalid xml root", { rootTag: context.rootTag, xmlLength: xml.length })
		throw errors.new(`invalid xml root: expected a complete document with a single <${context.rootTag}> root element.`)
	}
}

export function validateTitleAttribute(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Extract the root element opening tag
	const rootTagMatch = xml.match(new RegExp(`<${context.rootTag}([^>]*)>`, "s"))
	if (!rootTagMatch) {
		logger.error("invalid xml: missing opening tag", { rootTag: context.rootTag, xmlLength: xml.length })
		throw errors.new(`invalid xml: could not find ${context.rootTag} opening tag`)
	}

	const attributes = rootTagMatch[1]
	if (!attributes) {
		logger.error("invalid xml: missing attributes", { rootTag: context.rootTag })
		throw errors.new(`invalid xml: missing attributes in <${context.rootTag}> element`)
	}

	// Check if title attribute exists
	const titleMatch = attributes.match(/\btitle\s*=\s*["']([^"']*?)["']/)
	if (!titleMatch) {
		logger.error("invalid xml: missing title attribute", { rootTag: context.rootTag, attributes })
		throw errors.new(`invalid xml: missing required 'title' attribute in <${context.rootTag}> element`)
	}

	// Check if title is empty
	const titleValue = titleMatch[1]
	if (!titleValue || !titleValue.trim()) {
		logger.error("invalid xml: empty title attribute", { rootTag: context.rootTag, titleValue })
		throw errors.new(`invalid xml: 'title' attribute in <${context.rootTag}> element cannot be empty`)
	}

	logger.debug("validated title attribute", { title: titleValue.trim() })
}

export function validateTruncatedTags(xml: string, context: ValidationContext): void {
	const { logger } = context
	const match = xml.match(REGEX.TRUNCATED_TAG)
	if (match) {
		const xmlContext = xml.substring(Math.max(0, (match.index ?? 0) - 50), (match.index ?? 0) + 50)
		logger.error("invalid xml closing tag: truncated or malformed", {
			matchedTag: match[0],
			context: xmlContext,
			index: match.index
		})
		throw errors.new(
			`invalid xml closing tag: detected a truncated or malformed closing tag '${match[0]}'. Context: "...${xmlContext}..."`
		)
	}
}

export function validatePerseusArtifacts(xml: string, context: ValidationContext): void {
	const { logger } = context
	const match = xml.match(REGEX.PERSEUS_ARTIFACT)
	if (match) {
		logger.error("invalid xml content: Perseus artifact detected", { artifact: match[0], position: match.index })
		throw errors.new(
			`invalid xml content: Perseus artifact '[[☃ ...]]' is not allowed in QTI XML and must be removed or converted. Found: ${match[0]}`
		)
	}
}

/**
 * Validates that all <qti-prompt> elements are children of valid interaction tags.
 * It does this by stripping out all valid interaction blocks and then checking if any
 * <qti-prompt> tags remain. If they do, they were in an invalid location.
 */
export function validatePromptPlacement(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Create a regex that matches any valid interaction tag and its entire content.
	const interactionTagsPattern = QTI_INTERACTION_TAGS.join("|")
	const interactionBlockRegex = new RegExp(`<(${interactionTagsPattern})[\\s\\S]*?<\\/\\1>`, "g")

	const xmlWithoutInteractions = xml.replace(interactionBlockRegex, "")

	// Now, check if any <qti-prompt> tags are left.
	const promptMatch = xmlWithoutInteractions.match(/<qti-prompt/)
	if (promptMatch) {
		if (promptMatch.index === undefined) {
			logger.error("regex engine failure: prompt match found but index is undefined")
			throw errors.new("regex engine failure: prompt match found but index is undefined")
		}
		const contextIndex = promptMatch.index
		const context = xml.substring(Math.max(0, contextIndex - 70), Math.min(xml.length, contextIndex + 70))

		// Check if there are any interaction tags in the original XML to provide specific guidance
		const hasInteractionTag = new RegExp(`<(?:${interactionTagsPattern})`).test(xml)

		if (hasInteractionTag) {
			logger.error("invalid qti-prompt placement: must be child of interaction", {
				contextSnippet: context,
				contextIndex
			})
			throw errors.new(
				`invalid qti-prompt placement: <qti-prompt> must be a direct child of an interaction element (e.g., qti-choice-interaction), not qti-item-body. Move the <qti-prompt> inside the interaction tag. Context: "...${context}..."`
			)
		}
		logger.error("invalid qti-prompt placement: no interaction element", { contextSnippet: context, contextIndex })
		throw errors.new(
			`invalid qti-prompt placement: <qti-prompt> is not allowed without an interaction element. Convert the <qti-prompt> to a <p> tag instead. Context: "...${context}..."`
		)
	}
}

/**
 * Validates that min-choices and max-choices attributes are ALWAYS present on interactions that support them.
 * These attributes are required for safety and explicit behavior definition.
 */
export function validateInteractionAttributes(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Define which interaction types require min-choices and max-choices attributes
	const INTERACTIONS_REQUIRING_CHOICES = new Set([
		"qti-choice-interaction",
		"qti-associate-interaction",
		"qti-match-interaction",
		"qti-gap-match-interaction",
		"qti-hottext-interaction",
		"qti-graphic-associate-interaction",
		"qti-graphic-gap-match-interaction",
		"qti-hotspot-interaction"
	])

	// Robust regex with named capture groups to find any QTI interaction tag with its attributes
	const interactionRegex =
		/<(?<tagname>qti-(?:choice|order|associate|match|inline-choice|gap-match|hottext|extended-text|text-entry|slider|upload|drawing|graphic-associate|graphic-gap-match|graphic-order|hotspot|media|position-object|select-point|custom|portable-custom)-interaction)(?<attributes>[^>]*)>/gi

	let match: RegExpExecArray | null
	match = interactionRegex.exec(xml)
	while (match !== null) {
		if (!match.groups) {
			match = interactionRegex.exec(xml)
			continue
		}

		const tagName = match.groups.tagname
		const attributes = match.groups.attributes

		// Skip if tagName is somehow undefined (shouldn't happen with our regex)
		if (!tagName) {
			match = interactionRegex.exec(xml)
			continue
		}

		// Check if this interaction type requires min-choices and max-choices
		if (INTERACTIONS_REQUIRING_CHOICES.has(tagName)) {
			// If attributes is undefined, it means the tag has no attributes at all
			if (!attributes) {
				logger.error("invalid interaction attributes: no attributes", { tagName })
				throw errors.new(
					`invalid interaction attributes: <${tagName}> has no attributes. Both min-choices and max-choices attributes are required.`
				)
			}

			// Check for presence of min-choices and max-choices with named capture groups
			const minChoicesMatch = attributes.match(/\bmin-choices\s*=\s*(?<quote>["'])(?<value>\d+)(?<endquote>["'])/)
			const maxChoicesMatch = attributes.match(/\bmax-choices\s*=\s*(?<quote>["'])(?<value>\d+)(?<endquote>["'])/)

			const hasMinChoices = minChoicesMatch !== null
			const hasMaxChoices = maxChoicesMatch !== null

			// Both attributes MUST be present
			if (!hasMinChoices && !hasMaxChoices) {
				logger.error("invalid interaction attributes: missing both required attributes", { tagName, attributes })
				throw errors.new(
					`invalid interaction attributes: Both min-choices and max-choices attributes are required on <${tagName}>. Neither attribute was found. Found: <${tagName}${attributes}>`
				)
			}
			if (!hasMinChoices) {
				logger.error("invalid interaction attributes: missing min-choices", { tagName, attributes })
				throw errors.new(
					`invalid interaction attributes: min-choices attribute is required on <${tagName}>. Found: <${tagName}${attributes}>`
				)
			}
			if (!hasMaxChoices) {
				logger.error("invalid interaction attributes: missing max-choices", { tagName, attributes })
				throw errors.new(
					`invalid interaction attributes: max-choices attribute is required on <${tagName}>. Found: <${tagName}${attributes}>`
				)
			}
		}

		match = interactionRegex.exec(xml)
	}
}

/**
 * Validates that qti-text-entry-interaction elements are properly wrapped in block-level elements.
 * These interactions cannot be direct children of qti-item-body.
 */
export function validateTextEntryInteractionPlacement(xml: string, context: ValidationContext): void {
	const { logger } = context
	// First, let's check if there are any text-entry-interactions at all
	if (!xml.includes("qti-text-entry-interaction")) {
		return
	}

	// Extract the qti-item-body content with named capture groups
	const itemBodyRegex = /<qti-item-body(?<attributes>[^>]*)>(?<content>[\s\S]*?)<\/qti-item-body>/i
	const itemBodyMatch = xml.match(itemBodyRegex)
	if (!itemBodyMatch || !itemBodyMatch.groups) {
		return // No item body found, other validators will catch this
	}

	const itemBodyContent = itemBodyMatch.groups.content
	if (!itemBodyContent) {
		return
	}

	// Create a simplified version by removing all content within valid wrapper elements
	// Start by removing comments to avoid false positives
	let simplifiedContent = itemBodyContent.replace(/<!--[\s\S]*?-->/g, "")

	// Remove content of block elements that could validly contain the interaction
	// This list includes all common block-level elements that could wrap the interaction
	const blockElements = [
		"p",
		"div",
		"li",
		"td",
		"th",
		"dd",
		"dt",
		"blockquote",
		"section",
		"article",
		"aside",
		"nav",
		"header",
		"footer",
		"main",
		"figure",
		"figcaption"
	]

	for (const element of blockElements) {
		// Regex to match both regular and self-closing tags with named capture groups
		// First, remove self-closing tags
		const selfClosingRegex = new RegExp(`<${element}(?<attributes>[^>]*?)(?<selfClosing>\\/)>`, "gi")
		simplifiedContent = simplifiedContent.replace(selfClosingRegex, "")

		// Then remove regular tags with content
		const elementRegex = new RegExp(`<${element}(?<attributes>[^>]*)>(?<content>[\\s\\S]*?)<\\/${element}>`, "gi")
		// Use a loop to handle nested elements of the same type
		let previousLength = 0
		while (previousLength !== simplifiedContent.length) {
			previousLength = simplifiedContent.length
			simplifiedContent = simplifiedContent.replace(elementRegex, "")
		}
	}

	// Now check if any qti-text-entry-interaction remains in the simplified content
	// If it does, it means it wasn't wrapped in a valid block element
	const interactionRegex = /<qti-text-entry-interaction(?<attributes>[^>]*?)(?<selfClosing>\/)?>(?<content>[^<]*)?/i
	const unwrappedInteractionMatch = simplifiedContent.match(interactionRegex)
	if (unwrappedInteractionMatch) {
		// Find the position in the original content for better error context
		const matchedText = unwrappedInteractionMatch[0]
		const position = itemBodyContent.indexOf(matchedText)
		const contextStart = Math.max(0, position - 100)
		const contextEnd = Math.min(itemBodyContent.length, position + 100)
		const errorContext = itemBodyContent.substring(contextStart, contextEnd).replace(/\s+/g, " ")
		logger.error("invalid qti-text-entry-interaction placement", { matchedText, position, errorContext })
		throw errors.new(
			`invalid qti-text-entry-interaction placement: qti-text-entry-interaction must be wrapped in a block-level element (e.g., <p>, <div>, <li>). It cannot be a direct child of qti-item-body. Context: "...${errorContext}..."`
		)
	}
}

export function validateHtmlEntities(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Check for unescaped angle brackets which are the most critical issue
	const angleValidationError = validateXmlAngleBrackets(xml, logger)
	if (angleValidationError) {
		logger.error("xml angle bracket validation failed", { error: angleValidationError })
		throw errors.new(angleValidationError)
	}
}

/**
 * Validates that no LaTeX content is present in the QTI XML.
 * LaTeX should be converted to MathML for proper QTI compliance and accessibility.
 * This check looks for any backslash followed by letters or LaTeX-like constructs,
 * and for expressions enclosed in dollar signs (e.g., `$x^2$`).
 */
export function validateNoLatex(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Check #1: Look for command-like LaTeX (e.g., \frac, \sqrt)
	const latexCommandMatch = xml.match(REGEX.LATEX_LIKE)
	if (latexCommandMatch) {
		const contextIndex = latexCommandMatch.index ?? 0
		const errorContext = xml.substring(Math.max(0, contextIndex - 50), Math.min(xml.length, contextIndex + 100))
		logger.error("found latex command-like content", { match: latexCommandMatch[0], context: errorContext })
		throw errors.new(
			`invalid content: LaTeX command-like content is not allowed in QTI. Use MathML instead. Found: "${latexCommandMatch[0]}". Context: "...${errorContext}..."`
		)
	}

	// First, check if dollar signs are properly tagged as currency - if so, skip LaTeX validation
	// This handles cases like <span class="currency">$</span>
	const currencyTaggedDollar = /<span\s+class\s*=\s*["']currency["']\s*>\s*\$\s*<\/span>/gi
	const xmlWithoutCurrencyTags = xml.replace(currencyTaggedDollar, "CURRENCY_PLACEHOLDER")

	// Also handle cases where $ appears right before a number or math tag (likely currency)
	// Examples: $50, $<math>, <mo>$</mo>
	const currencyPatterns = [
		// Dollar sign in MathML operator element (e.g., <mo>$</mo>)
		/<mo(?:\s+[^>]*)?>[\s]*\$[\s]*<\/mo>/gi,
		// Dollar sign immediately before a math tag or mn element
		/\$(?=\s*<(?:math|mn))/g,
		// Dollar sign immediately before a simple number (not followed by parentheses)
		/\$(?=\s*\d+(?:\.\d+)?(?:\s|$|[.,;:!?]|<))/g
	]

	let processedXml = xmlWithoutCurrencyTags
	for (const pattern of currencyPatterns) {
		processedXml = processedXml.replace(pattern, "CURRENCY_PLACEHOLDER")
	}

	// Check #2: Look for dollar-sign delimited LaTeX (e.g., $x^2$)
	// First find all potential dollar-sign pairs, then check if they contain math
	let match: RegExpExecArray | null
	const dollarPairRegex = /\$(?<content>[^$]+)\$/g

	match = dollarPairRegex.exec(processedXml)
	while (match !== null) {
		if (match.groups?.content) {
			const content = match.groups.content

			// Check for mathematical indicators
			const hasMathIndicators =
				// LaTeX commands
				/\\[a-zA-Z]+/.test(content) ||
				// Superscript or subscript notation
				/[a-zA-Z0-9][_^]/.test(content) ||
				// Variables with operators
				/[a-zA-Z]\s*[+\-*/=]\s*[a-zA-Z0-9]/.test(content) ||
				// Numbers followed by variables (like 2x, 3y)
				/\d+[a-zA-Z]/.test(content) ||
				// Mathematical functions
				/(?:sin|cos|tan|log|ln|sqrt|lim|sum|int)\s*\(/.test(content) ||
				// Fractions or mathematical structures
				/[a-zA-Z0-9]\s*\/\s*[a-zA-Z0-9]/.test(content) ||
				// Greek letters or special math symbols in the content
				/[αβγδεζηθικλμνξοπρστυφχψω]/.test(content) ||
				// Common math patterns
				/[xy]\s*=/.test(content) ||
				// Parentheses with mathematical content
				/\([^)]*[a-zA-Z+\-*/^][^)]*\)/.test(content) ||
				// Coordinate pairs or tuples (e.g., (2,3) or (x,y))
				/^\s*\(\s*[^)]+\s*,\s*[^)]+\s*\)\s*$/.test(content) ||
				// Expressions starting with number followed by parentheses (e.g., 3(x+2))
				/^\s*\d+\s*\(/.test(content)

			if (hasMathIndicators) {
				// Find the original position in the unprocessed XML
				const originalMatch = xml.match(new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
				if (originalMatch) {
					const contextIndex = originalMatch.index ?? 0
					const errorContext = xml.substring(Math.max(0, contextIndex - 50), Math.min(xml.length, contextIndex + 100))
					logger.error("found dollar-sign delimited latex content", {
						match: match[0],
						content: content,
						context: errorContext
					})
					throw errors.new(
						`invalid content: Dollar-sign delimited LaTeX ('$...$') is not allowed in QTI. All math must be converted to MathML. Found: "${match[0]}". Context: "...${errorContext}..."`
					)
				}
			}
		}

		match = dollarPairRegex.exec(processedXml)
	}

	logger.debug("validated no latex content")
}

export async function validateImageUrls(xml: string, context: ValidationContext): Promise<void> {
	const { logger } = context
	const uniqueUrls = [...new Set(Array.from(xml.matchAll(REGEX.IMAGE_URL), (m) => m.groups?.url ?? ""))]
	if (uniqueUrls.length === 0) {
		return
	}

	const invalidUrls: { url: string; status: number; error?: string; suggestion?: string }[] = []

	for (const url of uniqueUrls) {
		const res = await errors.try(fetch(url, { signal: AbortSignal.timeout(10000) }))
		if (res.error) {
			invalidUrls.push({ url, status: 0, error: `Failed to fetch: ${res.error.toString()}` })
			continue
		}

		// Check if this is an error response (403/404 or Khan Academy XML error)
		let isErrorResponse = false
		let effectiveStatus = res.data.status

		if (res.data.status === 403 || res.data.status === 404) {
			isErrorResponse = true
		} else if (res.data.status === 200) {
			// Khan Academy CDN returns 200 with XML error body for missing resources
			const textResult = await errors.try(res.data.text())
			if (!textResult.error) {
				const responseText = textResult.data
				if (
					responseText.includes("<?xml") &&
					responseText.includes("<Error>") &&
					responseText.includes("<Code>AccessDenied</Code>")
				) {
					isErrorResponse = true
					effectiveStatus = 403 // Treat as 403 for error reporting
				}
			}
		}

		if (isErrorResponse) {
			// Try alternative file extensions
			const lastDotIndex = url.lastIndexOf(".")
			const pathEnd = url.lastIndexOf("/")
			const hasExtension = lastDotIndex > pathEnd // Ensure the dot is after the last slash

			let baseUrl: string
			let alternativeExts: string[]

			if (hasExtension) {
				// URL has an extension - try other extensions
				baseUrl = url.substring(0, lastDotIndex)
				const originalExt = url.substring(lastDotIndex + 1).toLowerCase()
				alternativeExts = ["svg", "jpg", "jpeg", "png", "gif"].filter((ext) => ext !== originalExt)
			} else {
				// URL has no extension - try all supported extensions
				baseUrl = url
				alternativeExts = ["svg", "jpg", "jpeg", "png", "gif"]
			}

			let workingUrl: string | null = null
			for (const ext of alternativeExts) {
				const altUrl = `${baseUrl}.${ext}`
				const altRes = await errors.try(fetch(altUrl, { signal: AbortSignal.timeout(10000) }))
				if (!altRes.error && altRes.data.status === 200) {
					// Also check that the 200 response is not an XML error
					const altTextResult = await errors.try(altRes.data.text())
					if (!altTextResult.error) {
						const altResponseText = altTextResult.data
						if (!altResponseText.includes("<?xml") || !altResponseText.includes("<Error>")) {
							workingUrl = altUrl
							break
						}
					}
				}
			}

			if (workingUrl) {
				invalidUrls.push({ url, status: effectiveStatus, suggestion: workingUrl })
			} else {
				invalidUrls.push({ url, status: effectiveStatus })
			}
		}
	}

	if (invalidUrls.length > 0) {
		const errorDetails = invalidUrls
			.map((u) => {
				let detail = `${u.url} (status: ${u.status}${u.error ? `, error: ${u.error}` : ""}`
				if (u.suggestion) {
					detail += `, MUST be replaced with: ${u.suggestion} (confirmed working)`
				}
				detail += ")"
				return detail
			})
			.join("; ")
		const message = `invalid image urls: Found ${invalidUrls.length} inaccessible image URLs. They must be corrected or removed. Details: ${errorDetails}`
		logger.error("invalid image urls found", { count: invalidUrls.length, invalidUrls })
		throw errors.new(message)
	}
}

// --- API VALIDATION LOGIC ---

// Private helper to upsert an assessment item.
async function upsertItem(identifier: string, xml: string): Promise<void> {
	const updateResult = await errors.try(qti.updateAssessmentItem({ identifier, xml }))
	if (updateResult.error) {
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(qti.createAssessmentItem({ xml }))
			if (createResult.error) {
				logger.error("qti create after update 404 failed", { error: createResult.error, identifier })
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return
		}
		logger.error("qti update failed", { error: updateResult.error, identifier })
		throw updateResult.error
	}
}

// Private helper to upsert a stimulus.
async function upsertStimulus(identifier: string, title: string, content: string): Promise<void> {
	const payload = { identifier, title, content }
	const updateResult = await errors.try(qti.updateStimulus(identifier, payload))
	if (updateResult.error) {
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(qti.createStimulus(payload))
			if (createResult.error) {
				logger.error("qti create stimulus after update 404 failed", { error: createResult.error, identifier })
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return
		}
		logger.error("qti update stimulus failed", { error: updateResult.error, identifier })
		throw updateResult.error
	}
}

// Private helper for validating assessment items via the API.
async function upsertAndCleanupItem(identifier: string, xml: string, context: ValidationContext): Promise<void> {
	const { logger } = context
	const safeTitle = escapeXmlAttribute(context.title)

	const finalXml = xml.replace(/<qti-assessment-item([^>]*?)>/, (_match, group1) => {
		// Update identifier attribute
		let updatedAttrs = group1.replace(/identifier="[^"]*"/, `identifier="${identifier}"`)
		if (!/identifier="[^"]*"/.test(group1)) {
			updatedAttrs += ` identifier="${identifier}"`
		}

		// Update title attribute
		if (context.title) {
			updatedAttrs = updatedAttrs.replace(/title="[^"]*"/, `title="${safeTitle}"`)
			if (!/title="[^"]*"/.test(group1)) {
				updatedAttrs += ` title="${safeTitle}"`
			}
		}

		return `<qti-assessment-item${updatedAttrs}>`
	})

	// Debug log the exact XML being sent to the API
	logger.debug("final assessment item xml being sent to qti api", {
		identifier,
		title: context.title,
		xmlLength: finalXml.length,
		fullXml: finalXml,
		startsWithXmlDecl: finalXml.startsWith("<?xml"),
		firstCharCode: finalXml.charCodeAt(0),
		firstCharHex: finalXml.charCodeAt(0).toString(16)
	})

	const upsertResult = await errors.try(upsertItem(identifier, finalXml))
	if (upsertResult.error) {
		logger.error("qti api validation failed for item", { error: upsertResult.error, identifier })
		throw errors.wrap(upsertResult.error, "qti api validation failed for item")
	}

	const deleteResult = await errors.try(qti.deleteAssessmentItem(identifier))
	if (deleteResult.error) {
		// Log and continue. A failure to delete a temporary item should not fail the validation.
		logger.error("failed to delete temporary validation item", { identifier, error: deleteResult.error })
	}
}

// Private helper for validating stimuli via the API.
async function upsertAndCleanupStimulus(identifier: string, xml: string, context: ValidationContext): Promise<void> {
	const { logger } = context
	// For stimuli, title must not be empty
	if (!context.title) {
		logger.error("stimulus validation: title is required", { title: context.title })
		throw errors.new("stimulus validation: title is required for stimuli")
	}

	// Extract the content from the qti-stimulus-body element
	const contentResult = errors.trySync(() => extractQtiStimulusBodyContent(xml))
	if (contentResult.error) {
		logger.error("failed to extract qti-stimulus-body content for validation", { error: contentResult.error })
		throw errors.wrap(contentResult.error, "failed to extract qti-stimulus-body content for validation")
	}
	const content = contentResult.data

	// Debug log what we're sending to the API
	logger.debug("extracted stimulus content for qti api", {
		identifier,
		title: context.title,
		originalXmlLength: xml.length,
		extractedContentLength: content.length,
		contentPreview: content.substring(0, 200)
	})

	// The QTI API's content field expects only the inner HTML from qti-stimulus-body
	const upsertResult = await errors.try(upsertStimulus(identifier, context.title, content))
	if (upsertResult.error) {
		logger.error("qti api validation failed for stimulus", { error: upsertResult.error, identifier })
		throw errors.wrap(upsertResult.error, "qti api validation failed for stimulus")
	}

	const deleteResult = await errors.try(qti.deleteStimulus(identifier))
	if (deleteResult.error) {
		logger.error("failed to delete temporary validation stimulus", { identifier, error: deleteResult.error })
	}
}

/**
 * Validates the generated XML by performing an upsert-and-delete operation against the live QTI API.
 * This serves as the ultimate "ground truth" validation pass.
 */
export async function validateWithQtiApi(xml: string, context: ValidationContext): Promise<void> {
	const { logger, id, rootTag } = context

	if (rootTag === "qti-assessment-item") {
		const result = await ghettoValidateItem(xml, id)
		if (!result.success) {
			logger.error("qti api validation failed", { error: result.error, identifier: id })
			if (result.error instanceof Error) {
				throw errors.wrap(result.error, "qti api validation failed")
			}
			throw errors.new("qti api validation failed")
		}
	} else if (rootTag === "qti-assessment-test") {
		const result = await ghettoValidateTest(xml, id)
		if (!result.success) {
			logger.error("qti api validation failed", { error: result.error, identifier: id })
			if (result.error instanceof Error) {
				throw errors.wrap(result.error, "qti api validation failed")
			}
			throw errors.new("qti api validation failed")
		}
	} else if (rootTag === "qti-assessment-stimulus") {
		// Stimulus validation remains unchanged, using the existing upsertAndCleanupStimulus
		const tempIdentifier = `nice-tmp_${id}`
		await upsertAndCleanupStimulus(tempIdentifier, xml, context)
	} else {
		logger.error("unsupported root tag for api validation", { rootTag })
		throw errors.new(`unsupported root tag for api validation: ${rootTag}`)
	}
}

/**
 * Validates that qti-stimulus-body elements contain only HTML content, no QTI elements.
 * This ensures that stimulus items remain purely informational without interactions.
 */
export function validateStimulusBodyContent(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Only apply this validation to stimulus items
	if (context.rootTag !== "qti-assessment-stimulus") {
		return
	}

	// Extract the qti-stimulus-body content with robust named capture groups
	// This regex captures the opening tag with attributes and the complete content until the closing tag
	const stimulusBodyRegex =
		/<qti-stimulus-body(?<attributes>\s+[^>]*)?(?<closeBracket>>)(?<content>[\s\S]*?)<\/qti-stimulus-body>/i
	const stimulusBodyMatch = xml.match(stimulusBodyRegex)

	if (!stimulusBodyMatch || !stimulusBodyMatch.groups) {
		// If there's no stimulus body, other validators will catch this
		return
	}

	const bodyContent = stimulusBodyMatch.groups.content
	if (!bodyContent) {
		return
	}

	// Check for any QTI elements inside the stimulus body with robust named capture groups
	// This regex captures: opening bracket, tag name, optional attributes, and identifies self-closing tags
	const qtiElementRegex = /<(?<tagname>qti-(?:[a-z]+(?:-[a-z]+)*))(?<attributes>\s+[^>]*)?(?<closing>\/)?>/gi

	let match: RegExpExecArray | null
	match = qtiElementRegex.exec(bodyContent)

	if (match?.groups) {
		const tagName = match.groups.tagname
		const fullMatch = match[0]
		const position = match.index ?? 0
		const contextStart = Math.max(0, position - 100)
		const contextEnd = Math.min(bodyContent.length, position + fullMatch.length + 100)
		const errorContext = bodyContent.substring(contextStart, contextEnd).replace(/\s+/g, " ")

		// Check if it's an interaction element specifically
		const isInteraction = QTI_INTERACTION_TAGS.some((tag) => tag === tagName)

		if (isInteraction) {
			logger.error("invalid qti-stimulus-body content: interaction element found", { tagName, errorContext })
			throw errors.new(
				`invalid qti-stimulus-body content: QTI interaction elements are not allowed inside <qti-stimulus-body>. Found: <${tagName}>. Stimulus items must contain only HTML content for informational purposes. Context: "...${errorContext}..."`
			)
		}

		// Special case for qti-prompt to provide more helpful guidance
		if (tagName === "qti-prompt") {
			logger.error("invalid qti-stimulus-body content: qti-prompt found", { tagName, errorContext })
			throw errors.new(
				`invalid qti-stimulus-body content: <qti-prompt> is not allowed inside <qti-stimulus-body>. Use standard HTML elements like <p> or <h2> instead for headings or text. Context: "...${errorContext}..."`
			)
		}

		logger.error("invalid qti-stimulus-body content: qti element found", { tagName, errorContext })
		throw errors.new(
			`invalid qti-stimulus-body content: QTI elements are not allowed inside <qti-stimulus-body>. Found: <${tagName}>. Stimulus body must contain only standard HTML elements. Context: "...${errorContext}..."`
		)
	}

	logger.debug("validated stimulus body contains only HTML", {
		bodyLength: bodyContent.length
	})
}

/**
 * Validates that qti-stimulus-body elements do not contain any SVG elements.
 * SVG elements are not supported by the QTI API for stimulus content.
 */
export function validateNoSvgInStimulusBody(xml: string, context: ValidationContext): void {
	// Only apply this validation to stimulus items
	if (context.rootTag !== "qti-assessment-stimulus") {
		return
	}

	// Extract the qti-stimulus-body content
	const stimulusBodyRegex =
		/<qti-stimulus-body(?<attributes>\s+[^>]*)?(?<closeBracket>>)(?<content>[\s\S]*?)<\/qti-stimulus-body>/i
	const stimulusBodyMatch = xml.match(stimulusBodyRegex)

	if (!stimulusBodyMatch || !stimulusBodyMatch.groups) {
		return
	}

	const bodyContent = stimulusBodyMatch.groups.content
	if (!bodyContent) {
		return
	}

	// Check for SVG elements (both namespace and non-namespace variants)
	const svgRegex = /<svg(?:\s+[^>]*)?>/i
	const svgMatch = bodyContent.match(svgRegex)

	if (svgMatch) {
		const position = svgMatch.index ?? 0
		const contextStart = Math.max(0, position - 100)
		const contextEnd = Math.min(bodyContent.length, position + 100)
		const errorContext = bodyContent.substring(contextStart, contextEnd).replace(/\s+/g, " ")
		logger.error("invalid qti-stimulus-body content: svg element found", { position, errorContext })
		throw errors.new(
			`invalid qti-stimulus-body content: SVG elements are not allowed inside <qti-stimulus-body>. The QTI API does not support SVG content in stimulus items. Consider using a PNG or JPG image instead. Context: "...${errorContext}..."`
		)
	}

	logger.debug("validated no svg in stimulus body")
}

/**
 * NEW: A custom error to be thrown when the AI validator deems the content unsolvable.
 */
export const ErrContentUnsolvable = errors.new("qti content is not self-contained or solvable")

// NOTE: validateContentSufficiency has been removed as it's not needed for the new structured flow.
// The compiler ensures valid QTI output, and this AI validation was only used for assessment items.
// export async function validateContentSufficiency(xml: string, context: ValidationContext): Promise<void> {
// }

/**
 * Validates that decimal answers accept both leading zero and no leading zero formats.
 * For example, if the answer is 0.5, it should also accept .5
 */
export function validateDecimalAnswerFormats(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Find all text-entry interactions with numeric/decimal correct responses
	// This regex matches qti-response-declaration elements and captures:
	// - id: the identifier attribute value
	// - baseType: the base-type attribute value (only integer, float, or string)
	// - content: everything between the opening and closing tags
	const responseDeclarationRegex =
		/<qti-response-declaration(?=\s)(?=(?:[^>]*)identifier\s*=\s*["'](?<id>[^"']+)["'])(?=(?:[^>]*)base-type\s*=\s*["'](?<baseType>integer|float|string)["'])[^>]*>(?<content>[\s\S]*?)<\/qti-response-declaration>/gi

	let match: RegExpExecArray | null
	match = responseDeclarationRegex.exec(xml)
	while (match !== null) {
		if (!match.groups) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		const responseId = match.groups.id
		const baseType = match.groups.baseType
		const content = match.groups.content

		if (!content) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// Extract the correct response section first
		const correctResponseMatch = content.match(/<qti-correct-response>(?<values>[\s\S]*?)<\/qti-correct-response>/)
		if (!correctResponseMatch?.groups?.values) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// Extract all values within the correct response
		const valuesContent = correctResponseMatch.groups.values
		const firstValueMatch = valuesContent.match(/<qti-value>(?<value>[^<]+)<\/qti-value>/)
		if (!firstValueMatch?.groups?.value) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		const correctValue = firstValueMatch.groups.value.trim()

		// Check if this is a decimal value that starts with "0."
		if (correctValue.match(/^0\.\d+$/)) {
			// This is a decimal with leading zero (e.g., 0.5)
			// Check if there's a corresponding text-entry-interaction
			const hasTextEntry = new RegExp(
				`<qti-text-entry-interaction[^>]+response-identifier\\s*=\\s*["']${responseId}["']`
			).test(xml)

			if (hasTextEntry) {
				// Check if there's only one correct value defined
				const valueCount = (valuesContent.match(/<qti-value>/g) || []).length

				if (valueCount === 1) {
					// Only one format is accepted - this is problematic for decimal answers
					logger.error("decimal answer only accepts one format", {
						responseId,
						correctValue,
						baseType
					})
					throw errors.new(
						`invalid decimal answer format: Response "${responseId}" has decimal answer "${correctValue}" but only accepts one format. Both "0.2" and ".2" formats should be accepted to ensure students aren't marked incorrect for valid answers. Add multiple <qti-value> elements: <qti-value>0.2</qti-value> and <qti-value>.2</qti-value>`
					)
				}
			}
		}

		// Also check for decimals without leading zero
		if (correctValue.match(/^\.\d+$/)) {
			// This is a decimal without leading zero (e.g., .5)
			// Similar check but ensure "0.5" format is also accepted
			const hasTextEntry = new RegExp(
				`<qti-text-entry-interaction[^>]+response-identifier\\s*=\\s*["']${responseId}["']`
			).test(xml)

			if (hasTextEntry) {
				const valueCount = (valuesContent.match(/<qti-value>/g) || []).length

				if (valueCount === 1) {
					logger.error("decimal answer only accepts one format", {
						responseId,
						correctValue,
						baseType
					})
					throw errors.new(
						`invalid decimal answer format: Response "${responseId}" has decimal answer "${correctValue}" but only accepts one format. Both ".2" and "0.2" formats should be accepted to ensure students aren't marked incorrect for valid answers. Add multiple <qti-value> elements: <qti-value>.2</qti-value> and <qti-value>0.2</qti-value>`
					)
				}
			}
		}

		match = responseDeclarationRegex.exec(xml)
	}

	logger.debug("validated decimal answer formats")
}

/**
 * Validates that no deprecated <mfenced> elements are used in MathML.
 * The <mfenced> element is deprecated and non-standard. Use <mrow> with <mo> elements instead.
 *
 * For example, instead of:
 *   <mfenced><mi>x</mi></mfenced>
 * Use:
 *   <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
 */
export function validateNoMfencedElements(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Check for any <mfenced> elements
	const mfencedRegex = /<mfenced(?:\s+[^>]*)?>/i
	const mfencedMatch = xml.match(mfencedRegex)

	if (mfencedMatch) {
		const position = mfencedMatch.index ?? 0
		const contextStart = Math.max(0, position - 100)
		const contextEnd = Math.min(xml.length, position + 200)
		const errorContext = xml.substring(contextStart, contextEnd).replace(/\s+/g, " ")

		// Extract attributes if present to provide more specific guidance
		const openMatch = mfencedMatch[0].match(/\bopen\s*=\s*["']([^"']*)["']/)
		const closeMatch = mfencedMatch[0].match(/\bclose\s*=\s*["']([^"']*)["']/)
		const separatorsMatch = mfencedMatch[0].match(/\bseparators\s*=\s*["']([^"']*)["']/)

		const openDelim = openMatch ? openMatch[1] : "("
		const closeDelim = closeMatch ? closeMatch[1] : ")"

		let replacementExample = `<mrow><mo>${openDelim}</mo><!-- content --><mo>${closeDelim}</mo></mrow>`

		if (separatorsMatch?.[1]) {
			const firstSeparator = separatorsMatch[1][0] || ","
			replacementExample = `<mrow><mo>${openDelim}</mo><!-- content with <mo>${firstSeparator}</mo> as separators --><mo>${closeDelim}</mo></mrow>`
		}

		logger.error("found deprecated mfenced element", {
			match: mfencedMatch[0],
			context: errorContext,
			openDelimiter: openDelim,
			closeDelimiter: closeDelim,
			separators: separatorsMatch ? separatorsMatch[1] : undefined
		})

		throw errors.new(
			`invalid mathml: <mfenced> is a deprecated and non-standard element. Use <mrow> with <mo> elements instead. Replace ${mfencedMatch[0]} with: ${replacementExample}. Context: "...${errorContext}..."`
		)
	}

	logger.debug("validated no mfenced elements")
}

/**
 * Validates that SVG content embedded in img tags as data URIs is well-formed XML.
 * This catches malformed SVG issues like:
 * - Mismatched tags (e.g., `</ g>` instead of `</g>`)
 * - Extra closing tags (e.g., `</text></text>`)
 * - Unclosed elements
 * - Invalid tag structures
 */
export function validateSvgDataUris(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Find all img tags with SVG data URIs
	// This regex captures both URL-encoded and base64-encoded SVG data
	// Uses alternation to handle both double and single quoted attributes
	const imgSvgRegex =
		/<img[^>]+src\s*=\s*(?:"(data:image\/svg\+xml(?:;base64|;charset=[\w-]+)?,([^"]+))"|'(data:image\/svg\+xml(?:;base64|;charset=[\w-]+)?,([^']+))')([^>]*)>/gi

	let match: RegExpExecArray | null
	match = imgSvgRegex.exec(xml)

	while (match !== null) {
		// Extract SVG data from the appropriate capture group
		// match[2] for double quotes, match[4] for single quotes
		const svgData = match[2] || match[4]

		if (!svgData) {
			match = imgSvgRegex.exec(xml)
			continue
		}

		// Decode the SVG content (handle both URL-encoded and base64)
		let decodedSvg: string
		const isBase64 = match[0].includes(";base64")

		if (isBase64) {
			// Handle base64-encoded SVG
			const base64Result = errors.trySync(() => {
				// Decode base64 to string
				return Buffer.from(svgData, "base64").toString("utf-8")
			})
			if (base64Result.error) {
				logger.error("failed to decode base64 svg data uri", { error: base64Result.error })
				throw errors.new(
					"invalid svg data uri: Failed to decode base64 SVG content in img tag. The data URI may be malformed."
				)
			}
			decodedSvg = base64Result.data
		} else {
			// Handle URL-encoded SVG
			const svgDataResult = errors.trySync(() => decodeURIComponent(svgData))
			if (svgDataResult.error) {
				logger.error("failed to decode svg data uri", { error: svgDataResult.error })
				throw errors.new(
					"invalid svg data uri: Failed to decode SVG content in img tag. The data URI may be malformed or improperly encoded."
				)
			}
			decodedSvg = svgDataResult.data
		}

		// Parse the SVG as XML to check if it's well-formed
		const parseResult = errors.trySync(() => {
			// First, remove content that could cause false positives
			// 1. Remove CDATA sections (they can contain anything)
			let svgForParsing = decodedSvg.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "<!-- CDATA -->")

			// 2. Remove comments (they can contain example code)
			svgForParsing = svgForParsing.replace(/<!--[\s\S]*?-->/g, "<!-- comment -->")

			// 3. Remove processing instructions
			svgForParsing = svgForParsing.replace(/<\?[\s\S]*?\?>/g, "")

			// 4. Check for DOCTYPE (valid but we'll remove for parsing)
			svgForParsing = svgForParsing.replace(/<!DOCTYPE[^>]*>/gi, "")

			// Check for common SVG malformation patterns
			// 1. Space before tag name in closing tags (e.g., </ g>)
			const spacedClosingTagMatch = svgForParsing.match(/<\/\s+(\w+)/)
			if (spacedClosingTagMatch) {
				const tagName = spacedClosingTagMatch[1]
				const originalPosition = decodedSvg.indexOf(spacedClosingTagMatch[0])
				const contextStart = Math.max(0, originalPosition - 50)
				const contextEnd = Math.min(decodedSvg.length, originalPosition + 50)
				const errorContext = decodedSvg.substring(contextStart, contextEnd).replace(/\s+/g, " ")
				logger.error("malformed svg: invalid closing tag with space", { tagName, errorContext })
				throw errors.new(
					`malformed svg: Invalid closing tag '</ ${tagName}>' - remove the space to make it '</${tagName}>'. Context: "...${errorContext}..."`
				)
			}

			// 2. Extract all text content and attribute values to avoid false positives
			// We'll validate structure on a version with text/attributes replaced
			let structureOnlySvg = svgForParsing

			// Replace attribute values with placeholders (they might contain < or >)
			structureOnlySvg = structureOnlySvg.replace(/(\w+)\s*=\s*(["'])((?:(?!\2).)*)\2/g, '$1="ATTR_VALUE"')

			// Replace text content between tags with placeholder
			structureOnlySvg = structureOnlySvg.replace(/>([^<]+)</g, ">TEXT_CONTENT<")

			// 3. Check for duplicate closing tags by tracking tag balance
			const tagStack: Array<{ name: string; position: number }> = []
			// Enhanced regex to handle namespaced tags and capture position
			const tagRegex = /<\/?([a-zA-Z][\w:.-]*)((?:\s+[^>]*)?)>/g
			let tagMatch: RegExpExecArray | null
			tagMatch = tagRegex.exec(structureOnlySvg)

			while (tagMatch !== null) {
				const fullTag = tagMatch[0]
				const tagName = tagMatch[1]
				const attributes = tagMatch[2] || ""
				const tagPosition = tagMatch.index ?? 0

				// Skip XML declaration
				if (tagName === "?xml") {
					tagMatch = tagRegex.exec(structureOnlySvg)
					continue
				}

				if (fullTag.startsWith("</")) {
					// Closing tag

					if (tagStack.length === 0) {
						// Find position in original SVG
						const originalPos = decodedSvg.indexOf(fullTag)
						const contextStart = Math.max(0, originalPos - 100)
						const contextEnd = Math.min(decodedSvg.length, originalPos + 50)
						const errorContext = decodedSvg.substring(contextStart, contextEnd).replace(/\s+/g, " ")

						// Check if this might be in a string attribute or text content
						const beforeTag = decodedSvg.substring(0, originalPos)
						const inAttribute = (beforeTag.match(/"/g) || []).length % 2 === 1

						if (!inAttribute) {
							logger.error("malformed svg: extra closing tag", { tagName, errorContext })
							throw errors.new(
								`malformed svg: Extra closing tag '</${tagName}>' with no matching opening tag. Context: "...${errorContext}..."`
							)
						}
					} else {
						const expectedTag = tagStack[tagStack.length - 1]
						if (!expectedTag || expectedTag.name !== tagName) {
							// Find position in original SVG
							const originalPos = decodedSvg.indexOf(fullTag, tagPosition)
							const contextStart = Math.max(0, originalPos - 100)
							const contextEnd = Math.min(decodedSvg.length, originalPos + 50)
							const errorContext = decodedSvg.substring(contextStart, contextEnd).replace(/\s+/g, " ")

							if (!expectedTag) {
								logger.error("malformed svg: closing tag with empty stack", { tagName, errorContext })
								throw errors.new(
									`malformed svg: Closing tag '</${tagName}>' found but tag stack is empty. Context: "...${errorContext}..."`
								)
							}

							logger.error("malformed svg: mismatched closing tag", {
								tagName,
								expectedTag: expectedTag.name,
								errorContext
							})
							throw errors.new(
								`malformed svg: Mismatched closing tag '</${tagName}>' - expected '</${expectedTag.name}>' (opened at position ${expectedTag.position}). Context: "...${errorContext}..."`
							)
						}
						tagStack.pop()
					}
				} else if (!fullTag.endsWith("/>") && !attributes.includes("/")) {
					// Opening tag (not self-closing)
					// Skip void elements that don't need closing tags
					const voidElements = [
						"area",
						"base",
						"br",
						"col",
						"embed",
						"hr",
						"img",
						"input",
						"link",
						"meta",
						"param",
						"source",
						"track",
						"wbr"
					]
					if (tagName && !voidElements.includes(tagName.toLowerCase())) {
						tagStack.push({ name: tagName, position: tagPosition })
					}
				}

				tagMatch = tagRegex.exec(structureOnlySvg)
			}

			// 4. Check for unclosed tags
			if (tagStack.length > 0) {
				const unclosedInfo = tagStack
					.map((t) => {
						// Find the opening tag in original SVG for context
						const openingTagRegex = new RegExp(`<${t.name}[^>]*>`)
						const openingMatch = decodedSvg.match(openingTagRegex)
						if (openingMatch && openingMatch.index !== undefined) {
							const contextStart = Math.max(0, openingMatch.index - 20)
							const contextEnd = Math.min(decodedSvg.length, openingMatch.index + 80)
							const context = decodedSvg.substring(contextStart, contextEnd).replace(/\s+/g, " ")
							return `<${t.name}> at position ${t.position} - context: "...${context}..."`
						}
						return `<${t.name}> at position ${t.position}`
					})
					.join("; ")

				logger.error("malformed svg: unclosed tags found", { unclosedInfo })
				throw errors.new(`malformed svg: Unclosed tag(s) found: ${unclosedInfo}`)
			}

			// 5. Additional validation: Check for common SVG structure issues
			if (!decodedSvg.includes("<svg")) {
				logger.error("malformed svg: no svg root element found")
				throw errors.new("malformed svg: No <svg> root element found. SVG documents must have an <svg> root element.")
			}

			// Check for multiple root elements
			const rootElementCount = (decodedSvg.match(/<svg[^>]*>/gi) || []).length
			const rootCloseCount = (decodedSvg.match(/<\/svg>/gi) || []).length
			if (rootElementCount > 1 && rootElementCount > rootCloseCount) {
				logger.error("malformed svg: multiple svg root elements found", { rootElementCount, rootCloseCount })
				throw errors.new(
					"malformed svg: Multiple <svg> root elements found. SVG documents must have exactly one root element."
				)
			}

			return true
		})

		if (parseResult.error) {
			logger.error("svg validation failed", {
				error: parseResult.error,
				svgLength: decodedSvg.length,
				svgPreview: decodedSvg.substring(0, 200),
				isBase64
			})
			throw parseResult.error
		}

		match = imgSvgRegex.exec(xml)
	}

	logger.debug("validated svg data uris")
}

/**
 * Validates that equation answers accept both standard and reversed forms.
 * For example, if the answer is "2x=3", it should also accept "3=2x"
 *
 * This validation only applies to:
 * - String-based responses (not numeric types)
 * - Text-entry interactions (not multiple choice)
 * - Values that contain mathematical elements on both sides of "="
 *
 * It skips non-mathematical uses of "=" like:
 * - Programming statements: "x = 5"
 * - Text explanations: "The symbol = means equal"
 * - Chemical equations: "H2 + O2 = H2O"
 */
export function validateEquationAnswerReversibility(xml: string, context: ValidationContext): void {
	const { logger } = context
	// Find all text-entry interactions with equation answers (containing equals sign)
	const responseDeclarationRegex =
		/<qti-response-declaration(?=\s)(?=(?:[^>]*)identifier\s*=\s*["'](?<id>[^"']+)["'])(?=(?:[^>]*)base-type\s*=\s*["'](?<baseType>string)["'])[^>]*>(?<content>[\s\S]*?)<\/qti-response-declaration>/gi

	let match: RegExpExecArray | null
	match = responseDeclarationRegex.exec(xml)
	while (match !== null) {
		if (!match.groups) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		const responseId = match.groups.id
		const content = match.groups.content

		if (!content) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// Extract the correct response section
		const correctResponseMatch = content.match(/<qti-correct-response>(?<values>[\s\S]*?)<\/qti-correct-response>/)
		if (!correctResponseMatch?.groups?.values) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// Extract all values within the correct response
		const valuesContent = correctResponseMatch.groups.values
		const allValues: string[] = []
		const valueRegex = /<qti-value>(?<value>[^<]+)<\/qti-value>/g
		let valueMatch: RegExpExecArray | null
		valueMatch = valueRegex.exec(valuesContent)
		while (valueMatch !== null) {
			if (valueMatch.groups?.value) {
				allValues.push(valueMatch.groups.value.trim())
			}
			valueMatch = valueRegex.exec(valuesContent)
		}

		if (allValues.length === 0) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// Check if any value contains an equals sign (indicating an equation)
		// To avoid false positives, we look for mathematical patterns around the equals sign
		const mathPatterns = /[0-9x+\-*/()[\]{}^√π]|\\[a-zA-Z]+|sin|cos|tan|log|ln|sqrt/
		const equationValues = allValues.filter((val) => {
			if (!val.includes("=")) return false

			// Skip inequalities - they should not be reversible
			// Check for <, >, ≤, ≥ or their HTML entity equivalents
			if (
				val.includes("<") ||
				val.includes(">") ||
				val.includes("≤") ||
				val.includes("≥") ||
				val.includes("&lt;") ||
				val.includes("&gt;") ||
				val.includes("&le;") ||
				val.includes("&ge;")
			) {
				return false
			}

			// Check if there are mathematical elements on both sides of equals
			const parts = val.split("=")
			if (parts.length !== 2 || !parts[0] || !parts[1]) return false

			const leftHasMath = mathPatterns.test(parts[0])
			const rightHasMath = mathPatterns.test(parts[1])

			// Only consider it a mathematical equation if both sides have math elements
			return leftHasMath && rightHasMath
		})

		if (equationValues.length === 0) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// Check if there's a corresponding text-entry-interaction
		const hasTextEntry = new RegExp(
			`<qti-text-entry-interaction[^>]+response-identifier\\s*=\\s*["']${responseId}["']`
		).test(xml)

		if (!hasTextEntry) {
			match = responseDeclarationRegex.exec(xml)
			continue
		}

		// For each equation value, check if its reversed form is also accepted
		for (const equation of equationValues) {
			// Split by equals sign
			const parts = equation.split("=")
			if (parts.length !== 2 || !parts[0] || !parts[1]) {
				continue // Skip if not a simple equation
			}

			const leftSide = parts[0].trim()
			const rightSide = parts[1].trim()
			const reversedEquation = `${rightSide}=${leftSide}`

			// Check if the reversed form is in the accepted values
			// We need to check with various spacing patterns
			const hasReversed = allValues.some((val) => {
				const normalizedVal = val.replace(/\s+/g, "")
				const normalizedReversed = reversedEquation.replace(/\s+/g, "")
				return normalizedVal === normalizedReversed
			})

			if (!hasReversed) {
				logger.error("equation answer not reversible", {
					responseId,
					equation,
					reversedEquation,
					acceptedValues: allValues
				})
				throw errors.new(
					`invalid equation answer format: Response "${responseId}" has equation answer "${equation}" but doesn't accept the reversed form "${reversedEquation}". Mathematical equations should accept both forms for correctness. Consider adding both "<qti-value>${equation}</qti-value>" and "<qti-value>${reversedEquation}</qti-value>".`
				)
			}
		}

		match = responseDeclarationRegex.exec(xml)
	}

	logger.debug("validated equation answer reversibility")
}
