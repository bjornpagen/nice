import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import { validateXmlWithAi } from "@/lib/perseus-qti/client"
import { ErrQtiNotFound } from "@/lib/qti"
import { QTI_INTERACTION_TAGS } from "@/lib/qti-tags"
import { escapeXmlAttribute, extractQtiStimulusBodyContent } from "@/lib/xml-utils"

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
	IMAGE_URL:
		/(?<attribute>src|href)\s*=\s*(?<quote>["'])(?<url>https?:\/\/(?:(?!k<quote>).)+?\.(?:svg|jpe?g|png))(?:k<quote>)/gi,
	SUPPORTED_IMAGE_URL:
		/(?<attribute>src|href)\s*=\s*(?<quote>["'])(?<url>https?:\/\/(?:(?!k<quote>).)+?\.(?:jpe?g|png))(?:k<quote>)/gi,
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
	const rootTagRegex = new RegExp(
		`^<\\?xml[^>]*\\?>\\s*<${context.rootTag}[^>]*>[\\s\\S]*<\\/${context.rootTag}>\\s*$`,
		"s"
	)
	if (!rootTagRegex.test(xml.trim())) {
		throw errors.new(`invalid xml root: expected a complete document with a single <${context.rootTag}> root element.`)
	}
}

export function validateTitleAttribute(xml: string, context: ValidationContext): void {
	// Extract the root element opening tag
	const rootTagMatch = xml.match(new RegExp(`<${context.rootTag}([^>]*)>`, "s"))
	if (!rootTagMatch) {
		throw errors.new(`invalid xml: could not find ${context.rootTag} opening tag`)
	}

	const attributes = rootTagMatch[1]
	if (!attributes) {
		throw errors.new(`invalid xml: missing attributes in <${context.rootTag}> element`)
	}

	// Check if title attribute exists
	const titleMatch = attributes.match(/\btitle\s*=\s*["']([^"']*?)["']/)
	if (!titleMatch) {
		throw errors.new(`invalid xml: missing required 'title' attribute in <${context.rootTag}> element`)
	}

	// Check if title is empty
	const titleValue = titleMatch[1]
	if (!titleValue || !titleValue.trim()) {
		throw errors.new(`invalid xml: 'title' attribute in <${context.rootTag}> element cannot be empty`)
	}

	context.logger.debug("validated title attribute", { title: titleValue.trim() })
}

export function validateTruncatedTags(xml: string, _context: ValidationContext): void {
	const match = xml.match(REGEX.TRUNCATED_TAG)
	if (match) {
		const context = xml.substring(Math.max(0, (match.index ?? 0) - 50), (match.index ?? 0) + 50)
		throw errors.new(
			`invalid xml closing tag: detected a truncated or malformed closing tag '${match[0]}'. Context: "...${context}..."`
		)
	}
}

export function validatePerseusArtifacts(xml: string, _context: ValidationContext): void {
	const match = xml.match(REGEX.PERSEUS_ARTIFACT)
	if (match) {
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
export function validatePromptPlacement(xml: string, _context: ValidationContext): void {
	// Create a regex that matches any valid interaction tag and its entire content.
	const interactionTagsPattern = QTI_INTERACTION_TAGS.join("|")
	const interactionBlockRegex = new RegExp(`<(${interactionTagsPattern})[\\s\\S]*?<\\/\\1>`, "g")

	const xmlWithoutInteractions = xml.replace(interactionBlockRegex, "")

	// Now, check if any <qti-prompt> tags are left.
	const promptMatch = xmlWithoutInteractions.match(/<qti-prompt/)
	if (promptMatch) {
		if (promptMatch.index === undefined) {
			throw errors.new("regex engine failure: prompt match found but index is undefined")
		}
		const contextIndex = promptMatch.index
		const context = xml.substring(Math.max(0, contextIndex - 70), Math.min(xml.length, contextIndex + 70))

		// Check if there are any interaction tags in the original XML to provide specific guidance
		const hasInteractionTag = new RegExp(`<(?:${interactionTagsPattern})`).test(xml)

		if (hasInteractionTag) {
			throw errors.new(
				`invalid qti-prompt placement: <qti-prompt> must be a direct child of an interaction element (e.g., qti-choice-interaction), not qti-item-body. Move the <qti-prompt> inside the interaction tag. Context: "...${context}..."`
			)
		}
		throw errors.new(
			`invalid qti-prompt placement: <qti-prompt> is not allowed without an interaction element. Convert the <qti-prompt> to a <p> tag instead. Context: "...${context}..."`
		)
	}
}

/**
 * Validates that min-choices and max-choices attributes are ALWAYS present on interactions that support them.
 * These attributes are required for safety and explicit behavior definition.
 */
export function validateInteractionAttributes(xml: string, _context: ValidationContext): void {
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
				throw errors.new(
					`invalid interaction attributes: Both min-choices and max-choices attributes are required on <${tagName}>. Neither attribute was found. Found: <${tagName}${attributes}>`
				)
			}
			if (!hasMinChoices) {
				throw errors.new(
					`invalid interaction attributes: min-choices attribute is required on <${tagName}>. Found: <${tagName}${attributes}>`
				)
			}
			if (!hasMaxChoices) {
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
export function validateTextEntryInteractionPlacement(xml: string, _context: ValidationContext): void {
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
		const context = itemBodyContent.substring(contextStart, contextEnd).replace(/\s+/g, " ")

		throw errors.new(
			`invalid qti-text-entry-interaction placement: qti-text-entry-interaction must be wrapped in a block-level element (e.g., <p>, <div>, <li>). It cannot be a direct child of qti-item-body. Context: "...${context}..."`
		)
	}
}

export function validateHtmlEntities(xml: string, context: ValidationContext): void {
	// Check for unescaped angle brackets which are the most critical issue
	const angleValidationError = validateXmlAngleBrackets(xml, context.logger)
	if (angleValidationError) {
		throw errors.new(angleValidationError)
	}
}

/**
 * Validates that no LaTeX content is present in the QTI XML.
 * LaTeX should be converted to MathML for proper QTI compliance and accessibility.
 * This check looks for any backslash followed by letters or LaTeX-like constructs.
 */
export function validateNoLatex(xml: string, context: ValidationContext): void {
	// Check for any LaTeX-like content: backslash followed by letters or brackets/parens
	const latexMatch = xml.match(REGEX.LATEX_LIKE)
	if (latexMatch) {
		const contextIndex = latexMatch.index ?? 0
		const errorContext = xml.substring(Math.max(0, contextIndex - 50), Math.min(xml.length, contextIndex + 100))
		context.logger.error("found latex-like content", {
			match: latexMatch[0],
			context: errorContext
		})
		throw errors.new(
			`invalid content: LaTeX-like content is not allowed in QTI. Use MathML instead. Found: "${latexMatch[0]}". Context: "...${errorContext}..."`
		)
	}

	context.logger.debug("validated no latex content")
}

export async function validateImageUrls(xml: string, _context: ValidationContext): Promise<void> {
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
		if (res.data.status === 403 || res.data.status === 404) {
			// Try alternative file extensions
			const lastDotIndex = url.lastIndexOf(".")
			if (lastDotIndex !== -1) {
				const baseUrl = url.substring(0, lastDotIndex)
				const originalExt = url.substring(lastDotIndex + 1).toLowerCase()
				const alternativeExts = ["svg", "jpg", "png"].filter((ext) => ext !== originalExt)

				let workingUrl: string | null = null
				for (const ext of alternativeExts) {
					const altUrl = `${baseUrl}.${ext}`
					const altRes = await errors.try(fetch(altUrl, { signal: AbortSignal.timeout(10000) }))
					if (!altRes.error && altRes.data.status === 200) {
						workingUrl = altUrl
						break
					}
				}

				if (workingUrl) {
					invalidUrls.push({ url, status: res.data.status, suggestion: workingUrl })
				} else {
					invalidUrls.push({ url, status: res.data.status })
				}
			} else {
				invalidUrls.push({ url, status: res.data.status })
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
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return
		}
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
				throw errors.wrap(createResult.error, "qti create after update 404")
			}
			return
		}
		throw updateResult.error
	}
}

// Private helper for validating assessment items via the API.
async function upsertAndCleanupItem(identifier: string, xml: string, context: ValidationContext): Promise<void> {
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
	context.logger.debug("final assessment item xml being sent to qti api", {
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
		throw errors.wrap(upsertResult.error, "qti api validation failed for item")
	}

	const deleteResult = await errors.try(qti.deleteAssessmentItem(identifier))
	if (deleteResult.error) {
		// Log and continue. A failure to delete a temporary item should not fail the validation.
		context.logger.error("failed to delete temporary validation item", { identifier, error: deleteResult.error })
	}
}

// Private helper for validating stimuli via the API.
async function upsertAndCleanupStimulus(identifier: string, xml: string, context: ValidationContext): Promise<void> {
	// For stimuli, title must not be empty
	if (!context.title) {
		throw errors.new("stimulus validation: title is required for stimuli")
	}

	// Extract the content from the qti-stimulus-body element
	const contentResult = errors.trySync(() => extractQtiStimulusBodyContent(xml))
	if (contentResult.error) {
		throw errors.wrap(contentResult.error, "failed to extract qti-stimulus-body content for validation")
	}
	const content = contentResult.data

	// Debug log what we're sending to the API
	context.logger.debug("extracted stimulus content for qti api", {
		identifier,
		title: context.title,
		originalXmlLength: xml.length,
		extractedContentLength: content.length,
		contentPreview: content.substring(0, 200)
	})

	// The QTI API's content field expects only the inner HTML from qti-stimulus-body
	const upsertResult = await errors.try(upsertStimulus(identifier, context.title, content))
	if (upsertResult.error) {
		throw errors.wrap(upsertResult.error, "qti api validation failed for stimulus")
	}

	const deleteResult = await errors.try(qti.deleteStimulus(identifier))
	if (deleteResult.error) {
		context.logger.error("failed to delete temporary validation stimulus", { identifier, error: deleteResult.error })
	}
}

/**
 * Validates the generated XML by performing an upsert-and-delete operation against the live QTI API.
 * This serves as the ultimate "ground truth" validation pass.
 */
export async function validateWithQtiApi(xml: string, context: ValidationContext): Promise<void> {
	const tempIdentifier = `nice-tmp_${context.id}`

	if (context.rootTag === "qti-assessment-item") {
		await upsertAndCleanupItem(tempIdentifier, xml, context)
	} else if (context.rootTag === "qti-assessment-stimulus") {
		await upsertAndCleanupStimulus(tempIdentifier, xml, context)
	} else {
		throw errors.new(`unsupported root tag for api validation: ${context.rootTag}`)
	}
}

/**
 * Validates that qti-stimulus-body elements contain only HTML content, no QTI elements.
 * This ensures that stimulus items remain purely informational without interactions.
 */
export function validateStimulusBodyContent(xml: string, context: ValidationContext): void {
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
			throw errors.new(
				`invalid qti-stimulus-body content: QTI interaction elements are not allowed inside <qti-stimulus-body>. Found: <${tagName}>. Stimulus items must contain only HTML content for informational purposes. Context: "...${errorContext}..."`
			)
		}

		// Special case for qti-prompt to provide more helpful guidance
		if (tagName === "qti-prompt") {
			throw errors.new(
				`invalid qti-stimulus-body content: <qti-prompt> is not allowed inside <qti-stimulus-body>. Use standard HTML elements like <p> or <h2> instead for headings or text. Context: "...${errorContext}..."`
			)
		}

		throw errors.new(
			`invalid qti-stimulus-body content: QTI elements are not allowed inside <qti-stimulus-body>. Found: <${tagName}>. Stimulus body must contain only standard HTML elements. Context: "...${errorContext}..."`
		)
	}

	context.logger.debug("validated stimulus body contains only HTML", {
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

		throw errors.new(
			`invalid qti-stimulus-body content: SVG elements are not allowed inside <qti-stimulus-body>. The QTI API does not support SVG content in stimulus items. Consider using a PNG or JPG image instead. Context: "...${errorContext}..."`
		)
	}

	context.logger.debug("validated no svg in stimulus body")
}

/**
 * NEW: A custom error to be thrown when the AI validator deems the content unsolvable.
 */
export const ErrContentUnsolvable = errors.new("qti content is not self-contained or solvable")

/**
 * NEW: Validates that the generated QTI XML is self-contained and solvable using an AI model.
 */
export async function validateContentSufficiency(xml: string, context: ValidationContext): Promise<void> {
	const { logger, perseusContent } = context
	// ADD: Guard clause to skip this rule if perseusContent is not available.
	if (!perseusContent) {
		logger.info("skipping content sufficiency validation: no perseus content provided")
		return
	}
	logger.info("running ai content solvability validation")

	// 1. Extract all image URLs from the XML to provide them as context to the AI.
	const allImageUrls = [...new Set(Array.from(xml.matchAll(REGEX.IMAGE_URL), (m) => m.groups?.url ?? ""))]

	// 2. Separate SVGs from supported image formats
	const svgUrls = allImageUrls.filter((url) => url.toLowerCase().endsWith(".svg"))
	const supportedImageUrls = allImageUrls.filter((url) => {
		const lowerUrl = url.toLowerCase()
		return lowerUrl.endsWith(".png") || lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")
	})

	logger.debug("extracted image urls for ai validation", {
		totalImageCount: allImageUrls.length,
		supportedImageCount: supportedImageUrls.length,
		svgCount: svgUrls.length,
		urls: allImageUrls
	})

	// 3. Fetch SVG content as text
	const svgContents: { url: string; content: string }[] = []
	for (const svgUrl of svgUrls) {
		logger.debug("fetching svg content", { url: svgUrl })

		const fetchResult = await errors.try(fetch(svgUrl))
		if (fetchResult.error) {
			logger.warn("failed to fetch svg content", { url: svgUrl, error: fetchResult.error })
			continue
		}

		const textResult = await errors.try(fetchResult.data.text())
		if (textResult.error) {
			logger.warn("failed to read svg as text", { url: svgUrl, error: textResult.error })
			continue
		}

		svgContents.push({ url: svgUrl, content: textResult.data })
		logger.debug("successfully fetched svg content", { url: svgUrl, contentLength: textResult.data.length })
	}

	// 4. Call the AI validator with the XML, source JSON, image URLs, and SVG content.
	const validationResult = await errors.try(
		validateXmlWithAi(logger, perseusContent, xml, supportedImageUrls, svgContents)
	)
	if (validationResult.error) {
		throw errors.wrap(validationResult.error, "ai content solvability validation")
	}

	const { is_solvable, reason } = validationResult.data
	if (!is_solvable) {
		throw errors.wrap(ErrContentUnsolvable, reason)
	}

	logger.info("ai content solvability validation passed")
}

/**
 * Validates that decimal answers accept both leading zero and no leading zero formats.
 * For example, if the answer is 0.5, it should also accept .5
 */
export function validateDecimalAnswerFormats(xml: string, context: ValidationContext): void {
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
					context.logger.error("decimal answer only accepts one format", {
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
					context.logger.error("decimal answer only accepts one format", {
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

	context.logger.debug("validated decimal answer formats")
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
				context.logger.error("equation answer not reversible", {
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

	context.logger.debug("validated equation answer reversibility")
}
