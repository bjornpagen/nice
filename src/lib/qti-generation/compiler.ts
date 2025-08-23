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

// NEW: Custom error for duplicate response identifiers
export const ErrDuplicateResponseIdentifier = errors.new("duplicate response identifier")
// NEW: Custom error for duplicate choice identifiers within a single interaction/dropdown
export const ErrDuplicateChoiceIdentifier = errors.new("duplicate choice identifiers")
// NEW: Custom error for invalid rowHeaderKey in dataTable
export const ErrInvalidRowHeaderKey = errors.new("invalid dataTable rowHeaderKey")







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
		"following",
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
			// naive stemming for simple plural/3rd-person 's' endings to improve fuzzy match
			const stemmed =
				cleaned.length >= 4 && cleaned.endsWith("s") && !cleaned.endsWith("ss") ? cleaned.slice(0, -1) : cleaned
			if (stemmed) tokens.push(stemmed)
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
	const tokensNearlyEqual = (aTokens: string[], bTokens: string[], jaccardThreshold: number): boolean => {
		if (!lengthRatioOk(aTokens, bTokens)) return false
		const jac = jaccardSimilarity(aTokens, bTokens)
		if (jac >= jaccardThreshold) return true
		// One-token tolerance: allow removal if sets differ by at most one token
		const a = new Set(aTokens)
		const b = new Set(bTokens)
		let intersection = 0
		for (const t of a) if (b.has(t)) intersection += 1
		const minSize = Math.min(a.size, b.size)
		if (minSize >= 3 && intersection >= minSize - 1) return true
		return false
	}
	const tokensStrictlySimilar = (aTokens: string[], bTokens: string[], jaccardThreshold: number): boolean => {
		if (!lengthRatioOk(aTokens, bTokens)) return false
		return jaccardSimilarity(aTokens, bTokens) >= jaccardThreshold
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

	// Remove selection-guidance suffixes like "select all that apply" from prompts
	const stripSelectionGuidance = (s: string): string => {
		let out = s
		const patterns: RegExp[] = [
			// common guidance phrases
			/\b(?:select|choose|pick|check)\s+all\s+that\s+apply(?:\s+to\b)?/gi,
			/\b(?:select|choose|pick|check)\s+all\s+(?:correct\s+)?(?:answers|options)\b/gi,
			/\b(?:select|choose|pick|check)\s+all\s+that\s+are\s+correct\b/gi,
			/\b(?:select|choose|pick|check)\s+the\s+best\s+(?:answer|answers)\b/gi,
			/\b(?:select|choose|pick|check)\s+the\s+correct\s+(?:answer|answers)\b/gi,
			/\b(?:select|choose|pick|check)\s+(?:one|two|three|four)\s+(?:correct\s+)?(?:answer|answers|option|options)\b/gi,
			/\b(?:select|choose|pick|check)\s+the\s+answer\b/gi
		]
		for (const re of patterns) out = out.replace(re, " ")
		return collapseWhitespace(out)
	}

	// collect prompts from interactions that support it, keyed by interaction id
	const interactionIdToPrompt: Record<string, string> = {}
	for (const [id, interaction] of Object.entries(item.interactions)) {
		if (interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") {
			if (interaction.prompt && interaction.prompt.length > 0) {
				const normalizedPrompt = normalizeInline(interaction.prompt)
				interactionIdToPrompt[id] = stripSelectionGuidance(normalizedPrompt)
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
			// Strip selection guidance from body paragraph before comparison to align with prompt normalization
			const rawPara = paragraphNorms[i] ?? ""
			const pStr = rawPara === "" ? "" : stripSelectionGuidance(rawPara)
			if (pStr !== "" && pStr === prompt) {
				toDelete.add(i)
				continue
			}
			// fuzzy single-paragraph match using token similarity with one-token tolerance
			const paraTokens = tokenizeForFuzzy(pStr)
			if (tokensNearlyEqual(paraTokens, promptTokens, 0.82)) {
				toDelete.add(i)
			}
		}
		// strategy B: concatenation of adjacent paragraphs equals prompt
		for (let i = start; i < end; i++) {
			if (body[i]?.type !== "paragraph") continue
			if (toDelete.has(i)) continue
			let acc = stripSelectionGuidance(paragraphNorms[i] ?? "")
			let accTokens = tokenizeForFuzzy(acc)
			for (let j = i + 1; j < end; j++) {
				if (body[j]?.type !== "paragraph") break
				const nextSegment = stripSelectionGuidance(paragraphNorms[j] ?? "")
				acc = collapseWhitespace(`${acc} ${nextSegment}`)
				accTokens = tokenizeForFuzzy(acc)
				if (acc === prompt) {
					for (let k = i; k <= j; k++) toDelete.add(k)
					i = j // advance outer loop
					break
				}
				if (tokensNearlyEqual(accTokens, promptTokens, 0.86)) {
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

	// Sentence-level pass: handle paragraphs that mix context + question in a single block
	const promptByInteraction: Record<string, string> = {}
	for (const [id, p] of Object.entries(interactionIdToPrompt)) {
		promptByInteraction[id] = p
	}
	const extractTextWithSpans = (
		inline: InlineContent
	): { text: string; spans: Array<{ partIdx: number; start: number; end: number }> } => {
		let cursor = 0
		const spans: Array<{ partIdx: number; start: number; end: number }> = []
		let text = ""
		for (let i = 0; i < inline.length; i++) {
			const part = inline[i]
			if (!part) continue
			if (part.type === "text") {
				const content = String(part.content)
				const start = cursor
				text += content
				cursor += content.length
				spans.push({ partIdx: i, start, end: cursor })
			}
		}
		return { text, spans }
	}
	const splitSentences = (source: string): Array<{ start: number; end: number; text: string }> => {
		const results: Array<{ start: number; end: number; text: string }> = []
		let start = 0
		for (let i = 0; i < source.length; i++) {
			const ch = source.charAt(i)
			if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
				let end = i + 1
				while (end < source.length && /[)\]"'\s]/.test(source.charAt(end))) end += 1
				const raw = source.slice(start, end)
				if (raw.trim() !== "") results.push({ start, end, text: raw })
				start = end
			}
		}
		if (start < source.length) {
			const raw = source.slice(start)
			if (raw.trim() !== "") results.push({ start, end: source.length, text: raw })
		}
		return results
	}
	const isQuestionish = (s: string): boolean => {
		if (s.trim().endsWith("?")) return true
		const tokens = tokenizeForFuzzy(s)
		return tokens.some((t) => t === "which" || t === "what" || t === "why" || t === "how" || t === "where")
	}

	regionStart = 0
	for (const { index: slotIdx, interactionId } of slotIndices) {
		const promptSentence = promptByInteraction[interactionId]
		if (!promptSentence) {
			regionStart = slotIdx + 1
			continue
		}
		const promptTokens = tokenizeForFuzzy(promptSentence)
		for (let i = regionStart; i < slotIdx; i++) {
			if (toDelete.has(i)) continue
			const block = body[i]
			if (!block || block.type !== "paragraph") continue
			const { text: paraText, spans } = extractTextWithSpans(block.content)
			if (paraText.trim() === "") continue
			const sentences = splitSentences(paraText)
			if (sentences.length <= 1) continue
			let removedSentence = false
			for (const sent of sentences) {
				if (!isQuestionish(sent.text)) continue
				const sNorm = stripSelectionGuidance(toComparable(sent.text))
				if (sNorm === "") continue
				const sTokens = tokenizeForFuzzy(sNorm)
				if (!tokensStrictlySimilar(sTokens, promptTokens, 0.9)) continue
				const newInline: InlineContent = []
				for (let pIdx = 0; pIdx < block.content.length; pIdx++) {
					const part = block.content[pIdx]
					if (!part) continue
					if (part.type !== "text") {
						newInline.push(part)
						continue
					}
					const span = spans.find((sp) => sp.partIdx === pIdx)
					if (!span) {
						newInline.push(part)
						continue
					}
					const overlapStart = Math.max(span.start, sent.start)
					const overlapEnd = Math.min(span.end, sent.end)
					if (overlapStart >= overlapEnd) {
						newInline.push(part)
						continue
					}
					const relStart = overlapStart - span.start
					const relEnd = overlapEnd - span.start
					const originalText = String(part.content)
					const left = originalText.slice(0, relStart)
					const right = originalText.slice(relEnd)
					if (left !== "") newInline.push({ type: "text", content: left })
					if (right !== "") newInline.push({ type: "text", content: right })
				}
				const compacted = newInline.filter((p) => !(p.type === "text" && String(p.content).trim() === ""))
				if (compacted.length === 0) {
					toDelete.add(i)
				} else {
					block.content = compacted
					paragraphNorms[i] = normalizeInline(compacted)
				}
				removedSentence = true
				break
			}
			if (removedSentence) continue
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

function enforceNoPipesInBody(item: AssessmentItem): void {
	if (!item.body) return

	for (let i = 0; i < item.body.length; i++) {
		const block = item.body[i]
		if (!block || block.type !== "paragraph") continue
		const inline = block.content
		for (let j = 0; j < inline.length; j++) {
			const part = inline[j]
			if (!part || part.type !== "text") continue
			if (part.content.includes("|")) {
				logger.error("pipe characters in body text", { index: i, snippet: part.content })
				throw errors.new("pipe characters banned in body text")
			}
		}
	}
}

function enforceNoCaretsInBody(item: AssessmentItem): void {
	if (!item.body) return

	for (let i = 0; i < item.body.length; i++) {
		const block = item.body[i]
		if (!block || block.type !== "paragraph") continue
		const inline = block.content
		for (let j = 0; j < inline.length; j++) {
			const part = inline[j]
			if (!part || part.type !== "text") continue
			if (part.content.includes("^")) {
				logger.error("caret characters in body text", { index: i, snippet: part.content })
				throw errors.new("caret characters banned in body text")
			}
		}
	}
}

function enforceNoPipesInChoiceInteraction(item: AssessmentItem): void {
	if (!item.interactions) return

	for (const [interactionId, interaction] of Object.entries(item.interactions)) {
		if (!interaction || interaction.type !== "choiceInteraction") continue

		// Check prompt inline content
		if (interaction.prompt && interaction.prompt.length > 0) {
			for (let i = 0; i < interaction.prompt.length; i++) {
				const part = interaction.prompt[i]
				if (!part || part.type !== "text") continue
				if (part.content.includes("|")) {
					logger.error("pipe characters in choice prompt", { interactionId, snippet: part.content })
					throw errors.new("pipe characters banned in choice prompt")
				}
			}
		}

		// Check each choice block content and optional feedback
		for (let cIdx = 0; cIdx < interaction.choices.length; cIdx++) {
			const choice = interaction.choices[cIdx]
			if (!choice) continue
			// Scan block content for paragraphs with text parts
			for (let bIdx = 0; bIdx < choice.content.length; bIdx++) {
				const block = choice.content[bIdx]
				if (!block || block.type !== "paragraph") continue
				const inline = block.content
				for (let pIdx = 0; pIdx < inline.length; pIdx++) {
					const part = inline[pIdx]
					if (!part || part.type !== "text") continue
					if (part.content.includes("|")) {
						logger.error("pipe characters in choice content", {
							interactionId,
							choiceIndex: cIdx,
							snippet: part.content
						})
						throw errors.new("pipe characters banned in choice content")
					}
				}
			}

			// Scan optional per-choice feedback (inline content)
			if (choice.feedback) {
				for (let fIdx = 0; fIdx < choice.feedback.length; fIdx++) {
					const part = choice.feedback[fIdx]
					if (!part || part.type !== "text") continue
					if (part.content.includes("|")) {
						logger.error("pipe characters in choice feedback", {
							interactionId,
							choiceIndex: cIdx,
							snippet: part.content
						})
						throw errors.new("pipe characters banned in choice feedback")
					}
				}
			}
		}
	}
}

function enforceNoCaretsInChoiceInteraction(item: AssessmentItem): void {
	if (!item.interactions) return

	for (const [interactionId, interaction] of Object.entries(item.interactions)) {
		if (!interaction || interaction.type !== "choiceInteraction") continue

		// Check prompt inline content
		if (interaction.prompt && interaction.prompt.length > 0) {
			for (let i = 0; i < interaction.prompt.length; i++) {
				const part = interaction.prompt[i]
				if (!part || part.type !== "text") continue
				if (part.content.includes("^")) {
					logger.error("caret characters in choice prompt", { interactionId, snippet: part.content })
					throw errors.new("caret characters banned in choice prompt")
				}
			}
		}

		// Check each choice block content and optional feedback
		for (let cIdx = 0; cIdx < interaction.choices.length; cIdx++) {
			const choice = interaction.choices[cIdx]
			if (!choice) continue
			// Scan block content for paragraphs with text parts
			for (let bIdx = 0; bIdx < choice.content.length; bIdx++) {
				const block = choice.content[bIdx]
				if (!block || block.type !== "paragraph") continue
				const inline = block.content
				for (let pIdx = 0; pIdx < inline.length; pIdx++) {
					const part = inline[pIdx]
					if (!part || part.type !== "text") continue
					if (part.content.includes("^")) {
						logger.error("caret characters in choice content", {
							interactionId,
							choiceIndex: cIdx,
							snippet: part.content
						})
						throw errors.new("caret characters banned in choice content")
					}
				}
			}

			// Scan optional per-choice feedback (inline content)
			if (choice.feedback) {
				for (let fIdx = 0; fIdx < choice.feedback.length; fIdx++) {
					const part = choice.feedback[fIdx]
					if (!part || part.type !== "text") continue
					if (part.content.includes("^")) {
						logger.error("caret characters in choice feedback", {
							interactionId,
							choiceIndex: cIdx,
							snippet: part.content
						})
						throw errors.new("caret characters banned in choice feedback")
					}
				}
			}
		}
	}
}

function enforceNoCaretsInInlineChoiceInteraction(item: AssessmentItem): void {
	if (!item.interactions) return

	for (const [interactionId, interaction] of Object.entries(item.interactions)) {
		if (!interaction || interaction.type !== "inlineChoiceInteraction") continue

		// choice inline content
		for (let cIdx = 0; cIdx < interaction.choices.length; cIdx++) {
			const choice = interaction.choices[cIdx]
			if (!choice) continue
			for (let pIdx = 0; pIdx < choice.content.length; pIdx++) {
				const part = choice.content[pIdx]
				if (!part || part.type !== "text") continue
				if (part.content.includes("^")) {
					logger.error("caret characters in inline choice content", {
						interactionId,
						choiceIndex: cIdx,
						snippet: part.content
					})
					throw errors.new("caret characters banned in inline choice content")
				}
			}
		}
	}
}

function enforceNoCaretsInTopLevelFeedback(item: AssessmentItem): void {
	const checkBlocks = (blocks: NonNullable<AssessmentItem["feedback"]>["correct"]): void => {
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i]
			if (!block || block.type !== "paragraph") continue
			const inline = block.content
			for (let j = 0; j < inline.length; j++) {
				const part = inline[j]
				if (!part || part.type !== "text") continue
				if (part.content.includes("^")) {
					logger.error("caret characters in top-level feedback", { index: i, snippet: part.content })
					throw errors.new("caret characters banned in top-level feedback")
				}
			}
		}
	}
	if (item.feedback?.correct) checkBlocks(item.feedback.correct)
	if (item.feedback?.incorrect) checkBlocks(item.feedback.incorrect)
}

function enforceNoPipesInInlineChoiceInteraction(item: AssessmentItem): void {
	if (!item.interactions) return

	for (const [interactionId, interaction] of Object.entries(item.interactions)) {
		if (!interaction || interaction.type !== "inlineChoiceInteraction") continue

		// choice inline content
		for (let cIdx = 0; cIdx < interaction.choices.length; cIdx++) {
			const choice = interaction.choices[cIdx]
			if (!choice) continue
			for (let pIdx = 0; pIdx < choice.content.length; pIdx++) {
				const part = choice.content[pIdx]
				if (!part || part.type !== "text") continue
				if (part.content.includes("|")) {
					logger.error("pipe characters in inline choice content", {
						interactionId,
						choiceIndex: cIdx,
						snippet: part.content
					})
					throw errors.new("pipe characters banned in inline choice content")
				}
			}
		}
	}
}

function enforceNoPipesInTopLevelFeedback(item: AssessmentItem): void {
	const checkBlocks = (blocks: NonNullable<AssessmentItem["feedback"]>["correct"]): void => {
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i]
			if (!block || block.type !== "paragraph") continue
			const inline = block.content
			for (let j = 0; j < inline.length; j++) {
				const part = inline[j]
				if (!part || part.type !== "text") continue
				if (part.content.includes("|")) {
					logger.error("pipe characters in top-level feedback", { index: i, snippet: part.content })
					throw errors.new("pipe characters banned in top-level feedback")
				}
			}
		}
	}
	if (item.feedback?.correct) checkBlocks(item.feedback.correct)
	if (item.feedback?.incorrect) checkBlocks(item.feedback.incorrect)
}

function enforceIdentifierOnlyMatching(item: AssessmentItem): void {
    // Build allowed identifiers per responseIdentifier from interactions and dataTable dropdowns
    const allowed: Record<string, Set<string>> = {}
    // NEW: Map to track which interaction/widget owns each responseIdentifier
    const responseIdOwners = new Map<string, string>();

    const ensureSet = (id: string, ownerId: string): Set<string> => {
        // NEW: Check for duplicate responseIdentifier across different interactions/widgets
        const existingOwner = responseIdOwners.get(id);
        if (existingOwner && existingOwner !== ownerId) {
            logger.error("duplicate response identifier found across multiple interactions or widgets", { 
                responseIdentifier: id,
                firstOwner: existingOwner,
                secondOwner: ownerId
            });
            throw ErrDuplicateResponseIdentifier;
        }
        responseIdOwners.set(id, ownerId);
        return (allowed[id] ??= new Set<string>());
    }

    // Interactions: inlineChoice, choice, order
    if (item.interactions) {
        for (const [interactionId, interaction] of Object.entries(item.interactions)) {
            if (!interaction) continue
            if (
                interaction.type === "inlineChoiceInteraction" ||
                interaction.type === "choiceInteraction" ||
                interaction.type === "orderInteraction"
            ) {
                const responseId = (interaction as any).responseIdentifier
                const seenIdentifiers = new Set<string>() // NEW: Check for case-sensitive duplicates within THIS interaction's choices
                for (const choice of (interaction as any).choices ?? []) {
                    const ident = String((choice as any).identifier)
                    // REMOVED: .toLowerCase() - now case-sensitive
                    if (seenIdentifiers.has(ident)) {
                        logger.error("duplicate choice identifiers within interaction (case-sensitive)", { interactionId, identifier: ident })
                        throw ErrDuplicateChoiceIdentifier;
                    }
                    seenIdentifiers.add(ident)
                    ensureSet(responseId, interactionId).add(ident)
                }
            }
        }
    }

    // Widgets: dataTable dropdown cells
    if (item.widgets) {
        for (const [widgetId, widget] of Object.entries(item.widgets)) {
            if (!widget || (widget as any).type !== "dataTable") continue

            const dataTable = widget as any; // Cast for easier access to dataTable properties

            // NEW: Check rowHeaderKey referential integrity
            if (dataTable.rowHeaderKey !== null && typeof dataTable.rowHeaderKey === 'string') {
                const columnKeys = new Set(dataTable.columns.map((col: any) => col.key));
                if (!columnKeys.has(dataTable.rowHeaderKey)) {
                    logger.error("dataTable rowHeaderKey references non-existent column", {
                        widgetId,
                        rowHeaderKey: dataTable.rowHeaderKey,
                        availableColumnKeys: Array.from(columnKeys)
                    });
                    throw ErrInvalidRowHeaderKey;
                }
            }

            const rows: any[][] = Array.isArray(dataTable.data) ? (dataTable.data as any[][]) : []
            for (const row of rows) {
                if (!Array.isArray(row)) continue
                for (const cell of row) {
                    if (!cell || cell.type !== "dropdown") continue
                    const responseId: string = String(cell.responseIdentifier)
                    // NEW: Check for duplicate responseIdentifier *globally* for this dropdown cell
                    // This ensureSet call will throw if responseId is already used by another interaction/widget.
                    const choiceSetForResponseId = ensureSet(responseId, `${widgetId}_cell_${responseId}`); 
                    
                    const seenIdentifiers = new Set<string>() // NEW: Check for case-sensitive duplicates within THIS dropdown's choices
                    for (const ch of cell.choices ?? []) {
                        const ident = String(ch.identifier)
                        // REMOVED: .toLowerCase() - now case-sensitive
                        if (seenIdentifiers.has(ident)) {
                            logger.error("duplicate dropdown identifiers in dataTable cell (case-sensitive)", { widgetId, responseIdentifier: responseId, identifier: ident })
                            throw ErrDuplicateChoiceIdentifier;
                        }
                        seenIdentifiers.add(ident)
                        choiceSetForResponseId.add(ident)
                    }
                }
            }
        }
    }

    // Validate response declarations for any responseIdentifier with allowed set
    for (const decl of item.responseDeclarations) {
        if (!decl) continue
        const set = allowed[decl.identifier]
        if (!set) {
            // This case means a responseDeclaration exists but no interaction/widget
            // uses its responseIdentifier. This is caught earlier in pre-validator.ts.
            continue;
        }
        if (decl.baseType !== "identifier") {
            logger.error("dropdown responses must use identifier baseType", { responseIdentifier: decl.identifier })
            throw errors.new("identifier baseType required");
        }
        const inSet = (v: string): boolean => set.has(v)
        if (Array.isArray(decl.correct)) {
            for (const v of decl.correct) {
                if (typeof v !== "string" || !inSet(v)) {
                    logger.error("correct identifier not present in choices", { responseIdentifier: decl.identifier, value: v })
                    throw errors.new("correct identifier not present in choices");
                }
            }
        } else {
            const v: any = decl.correct
            if (typeof v !== "string" || !inSet(v)) {
                logger.error("correct identifier not present in choices", { responseIdentifier: decl.identifier, value: v })
                throw errors.new("correct identifier not present in choices");
            }
        }
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
	enforceNoPipesInBody(enforcedItem)
	enforceNoCaretsInBody(enforcedItem)
	enforceNoPipesInChoiceInteraction(enforcedItem)
	enforceNoCaretsInChoiceInteraction(enforcedItem)
	enforceNoPipesInInlineChoiceInteraction(enforcedItem)
	enforceNoCaretsInInlineChoiceInteraction(enforcedItem)
	enforceNoPipesInTopLevelFeedback(enforcedItem)
	enforceNoCaretsInTopLevelFeedback(enforcedItem)

	// Enforce identifier-only matching; no ad-hoc rewriting
	// This function now includes checks for duplicate responseIdentifiers and choice Identifiers,
	// as well as rowHeaderKey validation for dataTables.
	enforceIdentifierOnlyMatching(enforcedItem)

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
