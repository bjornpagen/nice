import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"

type ValidationContext = {
	id: string
	rootTag: string
	title: string // Title is required
	logger: logger.Logger
}

// Centralized Regex Constants
const REGEX = {
	PERSEUS_ARTIFACT: /\[\[☃\s*[\s\S]*?\]\]/g,
	TRUNCATED_TAG: /<\/(?:_|\s*>|\.\.\.)/,
	DISALLOWED_ENTITIES: /&(?:nbsp|minus|ndash|mdash);/g,
	IMAGE_URL:
		/(?<attribute>src|href)\s*=\s*(?<quote>["'])(?<url>https?:\/\/(?:(?!k<quote>).)+?\.(?:svg|jpe?g|png))(?:k<quote>)/gi
} as const

export function validateRootElement(xml: string, context: ValidationContext): void {
	const rootTagRegex = new RegExp(
		`^<\\?xml[^>]*\\?>\\s*<${context.rootTag}[^>]*>[\\s\\S]*<\\/${context.rootTag}>\\s*$`,
		"s"
	)
	if (!rootTagRegex.test(xml.trim())) {
		throw errors.new(`invalid xml root: expected a complete document with a single <${context.rootTag}> root element.`)
	}
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

export function validateHtmlEntities(xml: string, _context: ValidationContext): void {
	const matches = xml.match(REGEX.DISALLOWED_ENTITIES)
	if (matches) {
		const uniqueEntities = [...new Set(matches)]
		throw errors.new(
			`invalid xml content: Disallowed HTML entities found: ${uniqueEntities.join(", ")}. Use actual characters or numeric entities instead.`
		)
	}
}

export async function validateImageUrls(xml: string, _context: ValidationContext): Promise<void> {
	const uniqueUrls = [...new Set(Array.from(xml.matchAll(REGEX.IMAGE_URL), (m) => m.groups?.url ?? ""))]
	if (uniqueUrls.length === 0) {
		return
	}

	const invalidUrls: { url: string; status: number; error?: string }[] = []

	for (const url of uniqueUrls) {
		const res = await errors.try(fetch(url, { signal: AbortSignal.timeout(10000) }))
		if (res.error) {
			invalidUrls.push({ url, status: 0, error: `Failed to fetch: ${res.error.toString()}` })
			continue
		}
		if (res.data.status === 403 || res.data.status === 404) {
			invalidUrls.push({ url, status: res.data.status })
		}
	}

	if (invalidUrls.length > 0) {
		const errorDetails = invalidUrls
			.map((u) => `${u.url} (status: ${u.status}${u.error ? `, error: ${u.error}` : ""})`)
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
	const safeTitle = context.title.replace(/"/g, "&quot;")

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
