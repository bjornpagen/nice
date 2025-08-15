import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { InlineContent } from "@/lib/qti-generation/schemas"
import { ErrUnsupportedInteraction } from "@/lib/qti-generation/structured/client"
import { typedSchemas } from "@/lib/widgets/generators"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import { renderBlockContent } from "./content-renderer"
import { encodeDataUri } from "./helpers"
import { compileInteraction } from "./interaction-compiler"
import { validateAssessmentItemInput } from "./pre-validator"
import { compileResponseDeclarations, compileResponseProcessing } from "./response-processor"
import type { AssessmentItem, AssessmentItemInput } from "./schemas"
import { createDynamicAssessmentItemSchema } from "./schemas"
import { generateWidget } from "./widget-generator"
import {
	convertHtmlEntities,
	fixInequalityOperators,
	fixMathMLOperators,
	removeDoubleNewlines,
	stripXmlComments
} from "./xml-fixes"

// QTI IdentifierDType-like validation
const VALID_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9._-]*$/

function normalizeIdentifier(raw: string, fallbackPrefix: string, index: number, used: Set<string>): string {
	// Basic sanitize: strip leading/trailing spaces
	let candidate = String(raw).trim()
	// Replace invalid chars with underscore
	candidate = candidate.replace(/[^A-Za-z0-9._-]/g, "_")
	// Must start with letter or underscore; otherwise prefix
	if (!/^[A-Za-z_]/.test(candidate)) {
		candidate = `${fallbackPrefix}${index + 1}`
	}
	// Empty after sanitize → fallback
	if (candidate === "") {
		candidate = `${fallbackPrefix}${index + 1}`
	}
	// Ensure matches regex; if not, fallback
	if (!VALID_IDENTIFIER_REGEX.test(candidate)) {
		candidate = `${fallbackPrefix}${index + 1}`
	}
	// Ensure uniqueness within the interaction
	let unique = candidate
	let suffix = 2
	while (used.has(unique)) {
		unique = `${candidate}_${suffix}`
		suffix += 1
	}
	used.add(unique)
	return unique
}

function normalizeChoiceIdentifiersInPlace(item: AssessmentItem): void {
	if (!item.interactions) return

	// responseIdentifier → mapping of original choice id to normalized id
	const responseIdToMap: Record<string, Record<string, string>> = {}
	// responseIdentifier → mapping of simple label text to normalized id (for inlineChoice string-based answers)
	const responseIdToLabelMap: Record<string, Record<string, string>> = {}

	for (const interaction of Object.values(item.interactions)) {
		// Only interactions with choices are relevant
		if (
			interaction.type !== "inlineChoiceInteraction" &&
			interaction.type !== "choiceInteraction" &&
			interaction.type !== "orderInteraction"
		) {
			continue
		}

		const used = new Set<string>()
		const mapping: Record<string, string> = {}

		const fallbackPrefix = interaction.type === "inlineChoiceInteraction" ? "IC" : "C"

		if (interaction.type === "inlineChoiceInteraction") {
			const responseId = interaction.responseIdentifier
			const labelMap: Record<string, string> = {}
			const extractInlineText = (inline: import("./schemas").InlineContent): string => {
				let text = ""
				for (const part of inline) {
					if (part.type === "text") {
						text += part.content
						continue
					}
					if (part.type === "math") {
						// Minimal extraction: prefer <mo> token content if present; otherwise strip tags
						const math = part.mathml
						// Collect all <mo>...</mo> contents
						const moMatches = Array.from(math.matchAll(/<mo[^>]*>([\s\S]*?)<\/mo>/g)).map((m) => m[1] ?? "")
						let extracted = ""
						if (moMatches.length > 0) {
							extracted = moMatches.join(" ")
						} else {
							// Fallback: strip tags and collapse whitespace
							extracted = math.replace(/<[^>]+>/g, " ")
						}
						// Decode common entities used for operators
						extracted = extracted
							.replace(/&lt;/g, "<")
							.replace(/&gt;/g, ">")
							.replace(/&amp;/g, "&")
							.replace(/&le;|&#8804;|&#x2264;/gi, "≤")
							.replace(/&ge;|&#8805;|&#x2265;/gi, "≥")
							.replace(/&equals;|&#61;/gi, "=")
						text += extracted
					}
					// intentionally ignore inlineSlot for label mapping
				}
				return text.replace(/\s+/g, " ").trim()
			}
			interaction.choices.forEach((choice, idx) => {
				const originalId = String(choice.identifier)
				const normalized = VALID_IDENTIFIER_REGEX.test(originalId)
					? normalizeIdentifier(originalId, fallbackPrefix, idx, used)
					: normalizeIdentifier(originalId, fallbackPrefix, idx, used)
				mapping[originalId] = normalized
				const labelText = extractInlineText(choice.content)
				if (labelText) labelMap[labelText] = normalized
				choice.identifier = normalized
			})
			responseIdToMap[responseId] = mapping
			responseIdToLabelMap[responseId] = labelMap
			continue
		}

		// choiceInteraction or orderInteraction
		const responseId = interaction.responseIdentifier
		interaction.choices.forEach((choice, idx) => {
			const originalId = String(choice.identifier)
			const normalized = VALID_IDENTIFIER_REGEX.test(originalId)
				? normalizeIdentifier(originalId, fallbackPrefix, idx, used)
				: normalizeIdentifier(originalId, fallbackPrefix, idx, used)
			mapping[originalId] = normalized
			choice.identifier = normalized
		})
		responseIdToMap[responseId] = mapping
	}

	for (const decl of item.responseDeclarations) {
		if (!decl || decl.baseType !== "identifier") continue
		const map = responseIdToMap[decl.identifier]
		if (!map) continue
		const rewriteString = (val: string): string => map[val] ?? val
		const current = decl.correct
		if (Array.isArray(current)) {
			if (current.every((v): v is string => typeof v === "string")) {
				const mapped = current.map((v) => rewriteString(v))
				decl.correct = mapped
			} else {
				// number[] or mixed (should not be mixed for identifier baseType); leave unchanged for safety
				decl.correct = current
			}
		} else {
			if (typeof current === "string") {
				decl.correct = rewriteString(current)
			} else {
				decl.correct = current
			}
		}
	}

	// Convert string-based inline choice declarations to identifier-based using label/id maps
	for (const decl of item.responseDeclarations) {
		if (!decl) continue
		const labelMap = responseIdToLabelMap[decl.identifier]
		const idMap = responseIdToMap[decl.identifier]
		if (!labelMap && !idMap) continue
		if (decl.baseType !== "string") continue

		const toIdentifier = (val: string): string => {
			// Prefer exact original-id mapping, then label mapping
			if (idMap?.[val]) return idMap[val]
			if (labelMap?.[val]) return labelMap[val]
			// not mappable → fail fast
			logger.error("string response value not mappable to choice identifier", {
				responseIdentifier: decl.identifier,
				value: val
			})
			throw errors.new("string response not mappable to identifier")
		}

		if (Array.isArray(decl.correct)) {
			const mapped = decl.correct.map((v) => {
				if (typeof v !== "string") {
					logger.error("non-string value in string-based response declaration", { value: v })
					throw errors.new("invalid response declaration value type")
				}
				return toIdentifier(v)
			})
			decl.correct = mapped
		} else {
			if (typeof decl.correct !== "string") {
				logger.error("non-string scalar in string-based response declaration", { value: decl.correct })
				throw errors.new("invalid response declaration scalar type")
			}
			decl.correct = toIdentifier(decl.correct)
		}
		decl.baseType = "identifier"
	}
}

// Type guard to check if a string is a valid widget type
function isValidWidgetType(type: string): type is keyof typeof typedSchemas {
	return Object.keys(typedSchemas).includes(type)
}

function dedupePromptTextFromBody(item: AssessmentItem): void {
	if (!item.interactions || !item.body) return

	// --- normalization helpers ---
	const collapseWhitespace = (s: string): string => s.replace(/\s+/g, " ").trim()
	const decodeEntities = (s: string): string =>
		s
			.replace(/&lt;/gi, "<")
			.replace(/&gt;/gi, ">")
			.replace(/&amp;/gi, "&")
			.replace(/&quot;/gi, '"')
			.replace(/&apos;/gi, "'")
	const stripPunct = (s: string): string =>
		s
			.replace(/\u200b/g, "")
			.replace(/\u200c/g, "")
			.replace(/\u200d/g, "")
			.replace(/\uFEFF/g, "")
			// Normalize quotes by stripping straight, smart, and backtick variants
			.replace(/['"‘’“”`´]/g, " ")
			// Remove common punctuation including parentheses and dashes
			.replace(/[.,;:!?()[\]{}]/g, " ")
			.replace(/[-–—]/g, " ")
	const toComparable = (s: string): string => collapseWhitespace(stripPunct(decodeEntities(s.toLowerCase())))

	// Tokenization helpers for fuzzy matching
	const STOPWORDS = new Set<string>([
		"a",
		"an",
		"the",
		"this",
		"that",
		"these",
		"those",
		"is",
		"are",
		"was",
		"were",
		"be",
		"been",
		"being",
		"am",
		"in",
		"on",
		"at",
		"of",
		"to",
		"for",
		"from",
		"by",
		"with",
		"and",
		"or",
		"as",
		"into",
		"which",
		"who",
		"whom",
		"whose",
		"where",
		"when",
		"why",
		"how",
		"would",
		"could",
		"should",
		"might",
		"select",
		"choose",
		"pick",
		"please"
	])
	const tokenizeForFuzzy = (s: string): string[] => {
		const base = toComparable(s)
		if (base === "") return []
		const parts = base.split(/\s+/g)
		const tokens: string[] = []
		for (const p of parts) {
			if (p === "") continue
			if (STOPWORDS.has(p)) continue
			// remove possessive 's that may survive after punctuation stripping
			const cleaned = p.endsWith("'s") ? p.slice(0, -2) : p
			if (cleaned) tokens.push(cleaned)
		}
		return tokens
	}
	const jaccardSimilarity = (aTokens: string[], bTokens: string[]): number => {
		if (aTokens.length === 0 || bTokens.length === 0) return 0
		const a = new Set(aTokens)
		const b = new Set(bTokens)
		let intersection = 0
		for (const t of a) if (b.has(t)) intersection += 1
		const union = a.size + b.size - intersection
		return union === 0 ? 0 : intersection / union
	}
	const lengthRatioOk = (aTokens: string[], bTokens: string[]): boolean => {
		const aLen = aTokens.length
		const bLen = bTokens.length
		if (aLen === 0 || bLen === 0) return false
		const ratio = Math.min(aLen, bLen) / Math.max(aLen, bLen)
		return ratio >= 0.75
	}
	const normalizeMath = (mathml: string): string => {
		// prefer <mo> text; otherwise strip tags
		const moMatches = Array.from(mathml.matchAll(/<mo[^>]*>([\s\S]*?)<\/mo>/g)).map((m) => m[1] ?? "")
		const raw = moMatches.length > 0 ? moMatches.join(" ") : mathml.replace(/<[^>]+>/g, " ")
		return toComparable(raw)
	}
	const normalizeInline = (inline: InlineContent): string => {
		let out = ""
		for (const part of inline) {
			if (part.type === "text") {
				out += ` ${toComparable(part.content)}`
				continue
			}
			if (part.type === "math") {
				out += ` ${normalizeMath(part.mathml)}`
				continue
			}
			if (part.type === "inlineSlot") {
				out += ` {slot:${part.slotId}}`
			}
		}
		return collapseWhitespace(out)
	}

	// collect prompts from interactions that support it, keyed by interaction id
	const interactionIdToPrompt: Record<string, string> = {}
	for (const [id, interaction] of Object.entries(item.interactions)) {
		if (interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") {
			if (interaction.prompt && interaction.prompt.length > 0) {
				interactionIdToPrompt[id] = normalizeInline(interaction.prompt)
			}
		}
	}
	const supportedInteractionIds = new Set<string>(Object.keys(interactionIdToPrompt))
	if (supportedInteractionIds.size === 0) return

	// Pre-bind non-null body reference for type narrowing within nested helpers
	const body = item.body

	// Precompute normalized strings for all paragraph blocks
	const paragraphNorms: string[] = body.map((b) => (b.type === "paragraph" ? normalizeInline(b.content) : ""))

	// Identify all indices in the body which are interaction blockSlots we care about
	const slotIndices: Array<{ index: number; interactionId: string }> = []
	for (let i = 0; i < body.length; i++) {
		const block = body[i]
		if (block?.type === "blockSlot" && supportedInteractionIds.has(block.slotId)) {
			slotIndices.push({ index: i, interactionId: block.slotId })
		}
	}

	if (slotIndices.length === 0) return

	// Helper to try to remove paragraphs in [start, end) that match the given prompt
	const markMatchingParagraphs = (start: number, end: number, prompt: string, toDelete: Set<number>): void => {
		const promptTokens = tokenizeForFuzzy(prompt)
		// strategy A: single paragraph equals prompt (exact comparable equality)
		for (let i = start; i < end; i++) {
			if (body[i]?.type !== "paragraph") continue
			const pStr = paragraphNorms[i] ?? ""
			if (pStr !== "" && pStr === prompt) {
				toDelete.add(i)
				continue
			}
			// fuzzy single-paragraph match using token Jaccard with length guard
			const paraTokens = tokenizeForFuzzy(pStr)
			const sim = jaccardSimilarity(paraTokens, promptTokens)
			if (sim >= 0.82 && lengthRatioOk(paraTokens, promptTokens)) {
				toDelete.add(i)
			}
		}
		// strategy B: concatenation of adjacent paragraphs equals prompt
		for (let i = start; i < end; i++) {
			if (body[i]?.type !== "paragraph") continue
			if (toDelete.has(i)) continue
			let acc = paragraphNorms[i] ?? ""
			let accTokens = tokenizeForFuzzy(acc)
			for (let j = i + 1; j < end; j++) {
				if (body[j]?.type !== "paragraph") break
				acc = collapseWhitespace(`${acc} ${paragraphNorms[j] ?? ""}`)
				accTokens = tokenizeForFuzzy(acc)
				if (acc === prompt) {
					for (let k = i; k <= j; k++) toDelete.add(k)
					i = j // advance outer loop
					break
				}
				const sim = jaccardSimilarity(accTokens, promptTokens)
				if (sim >= 0.86 && lengthRatioOk(accTokens, promptTokens)) {
					for (let k = i; k <= j; k++) toDelete.add(k)
					i = j
					break
				}
			}
		}
	}

	// For each interaction slot, look back to the preceding region and remove duplicated prompt text
	const toDelete = new Set<number>()
	let regionStart = 0
	for (const { index: slotIdx, interactionId } of slotIndices) {
		const prompt = interactionIdToPrompt[interactionId]
		if (prompt) {
			markMatchingParagraphs(regionStart, slotIdx, prompt, toDelete)
		}
		regionStart = slotIdx + 1
	}

	if (toDelete.size === 0) return

	const originalLength = body.length
	item.body = body.filter((_, idx) => !toDelete.has(idx))
	const removedCount = originalLength - item.body.length
	if (removedCount > 0) {
		logger.debug("deduplicated prompt text from body", { count: removedCount })
	}
}

export function compile(itemData: AssessmentItemInput): string {
	// Step 0: Build widget mapping prior to schema enforcement
	const widgetMapping: Record<string, string> = {}
	if (itemData.widgets) {
		for (const [key, value] of Object.entries(itemData.widgets)) {
			if (value?.type) widgetMapping[key] = value.type
		}
	}

	// FIX: Add strict validation for widget types before creating the schema.
	// Create a properly typed mapping object
	const validatedWidgetMapping: Record<string, keyof typeof typedSchemas> = {}

	for (const [key, type] of Object.entries(widgetMapping)) {
		if (!isValidWidgetType(type)) {
			logger.error("invalid widget type in mapping", { key, type, availableTypes: Object.keys(typedSchemas) })
			throw errors.new(`Invalid widget type "${type}" for slot "${key}" provided in mapping.`)
		}
		// Now TypeScript knows type is a valid keyof typeof typedSchemas
		validatedWidgetMapping[key] = type
	}

	const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(validatedWidgetMapping)
	const itemResult = AssessmentItemSchema.safeParse(itemData)
	if (!itemResult.success) {
		logger.error("schema enforcement failed", { error: itemResult.error })
		throw errors.wrap(itemResult.error, "schema enforcement")
	}
	const enforcedItem = itemResult.data

	// Pre-compile gate for unsupported interactions
	if (enforcedItem.interactions) {
		for (const interaction of Object.values(enforcedItem.interactions)) {
			if (interaction.type === "unsupportedInteraction") {
				// Access property safely using in operator
				const perseusType =
					"perseusType" in interaction && typeof interaction.perseusType === "string"
						? interaction.perseusType
						: "unknown"
				logger.error("unsupported interaction type detected, failing compilation", {
					identifier: enforcedItem.identifier,
					perseusType: perseusType
				})
				// Throw the specific, non-retriable error
				throw errors.wrap(ErrUnsupportedInteraction, `item contains unsupported Perseus interaction: ${perseusType}`)
			}
		}
	}

	// Step 1: Prevalidation on schema-enforced data to catch QTI content model violations
	// Manual deduplication of paragraphs that duplicate an interaction prompt
	dedupePromptTextFromBody(enforcedItem)
	validateAssessmentItemInput(enforcedItem, logger)

	// Normalize choice identifiers now that we have strong types
	normalizeChoiceIdentifiersInPlace(enforcedItem)

	const slots = new Map<string, string>()

	if (enforcedItem.widgets) {
		for (const [widgetId, widgetDef] of Object.entries(enforcedItem.widgets)) {
			// widgetDef is already typed correctly from the schema parse
			const widgetHtml = generateWidget(widgetDef)
			if (widgetHtml.trim().startsWith("<svg")) {
				slots.set(widgetId, `<img src="${encodeDataUri(widgetHtml)}" alt="Widget visualization" />`)
			} else {
				slots.set(widgetId, widgetHtml)
			}
		}
	}

	if (enforcedItem.interactions) {
		for (const [interactionId, interactionDef] of Object.entries(enforcedItem.interactions)) {
			slots.set(interactionId, compileInteraction(interactionDef, slots))
		}
	}

	const filledBody = enforcedItem.body ? renderBlockContent(enforcedItem.body, slots) : ""
	const correctFeedback = renderBlockContent(enforcedItem.feedback.correct, slots)
	const incorrectFeedback = renderBlockContent(enforcedItem.feedback.incorrect, slots)

	const responseDeclarations = compileResponseDeclarations(enforcedItem.responseDeclarations)
	const responseProcessing = compileResponseProcessing(enforcedItem.responseDeclarations)

	// Assemble the final XML document
	let finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="${escapeXmlAttribute(enforcedItem.identifier)}"
    title="${escapeXmlAttribute(enforcedItem.title)}"
    time-dependent="false"
    xml:lang="en-US">
${responseDeclarations}
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>
    <qti-item-body>
        ${filledBody}
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>${correctFeedback}</qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>${incorrectFeedback}</qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
${responseProcessing}
</qti-assessment-item>`
	// Global XML post-processing hardening
	finalXml = stripXmlComments(finalXml, logger)
	finalXml = removeDoubleNewlines(finalXml, logger)
	finalXml = fixMathMLOperators(finalXml, logger)
	finalXml = fixInequalityOperators(finalXml, logger)
	// Convert HTML entities to Unicode characters at the very end
	return convertHtmlEntities(finalXml, logger)
}
