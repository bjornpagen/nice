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
import { convertHtmlEntities } from "./xml-fixes"

// Type guard to check if a string is a valid widget type
function isValidWidgetType(type: string): type is keyof typeof typedSchemas {
	return Object.keys(typedSchemas).includes(type)
}

export function compile(itemData: AssessmentItemInput): string {
	// Step 0: Prevalidation to catch QTI content model violations early
	validateAssessmentItemInput(itemData, logger)

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
	const item: AssessmentItem = AssessmentItemSchema.parse(itemData)

	const slots = new Map<string, string>()

	if (item.widgets) {
		for (const [widgetId, widgetDef] of Object.entries(item.widgets)) {
			// widgetDef is already typed correctly from the schema parse
			const widgetHtml = generateWidget(widgetDef)
			if (widgetHtml.trim().startsWith("<svg")) {
				slots.set(widgetId, `<img src="${encodeDataUri(widgetHtml)}" alt="Widget visualization" />`)
			} else {
				slots.set(widgetId, widgetHtml)
			}
		}
	}

	if (item.interactions) {
		for (const [interactionId, interactionDef] of Object.entries(item.interactions)) {
			slots.set(interactionId, compileInteraction(interactionDef, slots))
		}
	}

	const filledBody = item.body ? renderBlockContent(item.body, slots) : ""
	const correctFeedback = renderBlockContent(item.feedback.correct, slots)
	const incorrectFeedback = renderBlockContent(item.feedback.incorrect, slots)

	const responseDeclarations = compileResponseDeclarations(item.responseDeclarations)
	const responseProcessing = compileResponseProcessing(item.responseDeclarations)

	// Assemble the final XML document
	const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="${escapeXmlAttribute(item.identifier)}"
    title="${escapeXmlAttribute(item.title)}"
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

	// Convert HTML entities to Unicode characters at the very end
	return convertHtmlEntities(finalXml, logger)
}
