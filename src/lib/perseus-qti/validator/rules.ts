import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import { validateXmlWithAi } from "@/lib/perseus-qti/client"
import { ErrQtiNotFound } from "@/lib/qti"
import { QTI_INTERACTION_TAGS } from "@/lib/qti-tags"
import { escapeXmlAttribute } from "@/lib/xml-utils"

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
		/(?<attribute>src|href)\s*=\s*(?<quote>["'])(?<url>https?:\/\/(?:(?!k<quote>).)+?\.(?:jpe?g|png))(?:k<quote>)/gi
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

export function validateHtmlEntities(xml: string, context: ValidationContext): void {
	// Check for unescaped angle brackets which are the most critical issue
	const angleValidationError = validateXmlAngleBrackets(xml, context.logger)
	if (angleValidationError) {
		throw errors.new(angleValidationError)
	}
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

	// The QTI API's content field expects the entire raw QTI XML document.
	// Do not extract the inner body.
	const upsertResult = await errors.try(upsertStimulus(identifier, context.title, xml))
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
	const tempIdentifier = `nice-tmp:${context.id}`

	if (context.rootTag === "qti-assessment-item") {
		await upsertAndCleanupItem(tempIdentifier, xml, context)
	} else if (context.rootTag === "qti-assessment-stimulus") {
		await upsertAndCleanupStimulus(tempIdentifier, xml, context)
	} else {
		throw errors.new(`unsupported root tag for api validation: ${context.rootTag}`)
	}
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

	// 2. Filter to only include supported image formats (PNG, JPG, JPEG) - SVG is not supported by multimodal AI
	const supportedImageUrls = allImageUrls.filter((url) => {
		const lowerUrl = url.toLowerCase()
		return lowerUrl.endsWith(".png") || lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")
	})

	if (supportedImageUrls.length > 0) {
		logger.debug("extracted supported image urls for ai validation", {
			count: supportedImageUrls.length,
			urls: supportedImageUrls,
			totalImageCount: allImageUrls.length,
			excludedSvgCount: allImageUrls.length - supportedImageUrls.length
		})
	} else if (allImageUrls.length > 0) {
		logger.debug("all extracted images were svg, skipping image analysis", {
			svgCount: allImageUrls.length
		})
	}

	// 3. Call the AI validator with the XML, source JSON, and extracted image URLs.
	const validationResult = await errors.try(validateXmlWithAi(logger, perseusContent, xml, supportedImageUrls))
	if (validationResult.error) {
		throw errors.wrap(validationResult.error, "ai content solvability validation")
	}

	const { is_solvable, reason } = validationResult.data
	if (!is_solvable) {
		throw errors.wrap(ErrContentUnsolvable, reason)
	}

	logger.info("ai content solvability validation passed")
}
