import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
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
			interaction.choices.forEach((choice, idx) => {
				const originalId = String(choice.identifier)
				const normalized = VALID_IDENTIFIER_REGEX.test(originalId)
					? normalizeIdentifier(originalId, fallbackPrefix, idx, used)
					: normalizeIdentifier(originalId, fallbackPrefix, idx, used)
				mapping[originalId] = normalized
				choice.identifier = normalized
			})
			responseIdToMap[responseId] = mapping
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
}

// Type guard to check if a string is a valid widget type
function isValidWidgetType(type: string): type is keyof typeof typedSchemas {
	return Object.keys(typedSchemas).includes(type)
}

function dedupePromptTextFromBody(item: AssessmentItem): void {
	if (!item.interactions || !item.body) return

	const promptTexts = new Set<string>()
	for (const interaction of Object.values(item.interactions)) {
		if (interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") {
			const prompt = interaction.prompt
			if (prompt.length === 1 && prompt[0]?.type === "text") {
				promptTexts.add(prompt[0].content)
			}
		}
	}
	if (promptTexts.size === 0) return

	const originalLength = item.body.length
	item.body = item.body.filter((block) => {
		if (block.type !== "paragraph") return true
		if (block.content.length !== 1) return true
		const only = block.content[0]
		if (only?.type !== "text") return true
		return !promptTexts.has(only.content)
	})
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
