import type { typedSchemas } from "@/lib/widgets/generators"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import { encodeDataUri, isValidWidgetType } from "./helpers"
import { compileInteraction } from "./interaction-compiler"
import { compileResponseDeclarations, compileResponseProcessing } from "./response-processor"
import type { AssessmentItem, AssessmentItemInput } from "./schemas"
import { createDynamicAssessmentItemSchema } from "./schemas"
import { processAndFillSlots } from "./slot-filler"
import { generateWidget } from "./widget-generator"

export function compile(itemData: AssessmentItemInput): string {
	// Step 1: Create a dynamic schema based on the widgets present
	const widgetMapping: Record<string, keyof typeof typedSchemas> = {}
	if (itemData.widgets) {
		for (const [slotName, widget] of Object.entries(itemData.widgets)) {
			if (widget && typeof widget === "object" && "type" in widget && typeof widget.type === "string") {
				if (isValidWidgetType(widget.type)) {
					widgetMapping[slotName] = widget.type
				}
			}
		}
	}
	const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(widgetMapping)
	const item: AssessmentItem = AssessmentItemSchema.parse(itemData)

	// Step 2: Prepare a unified map of all slot content (widgets and interactions)
	const slots = new Map<string, string>()

	if (item.widgets) {
		for (const [widgetId, widgetDef] of Object.entries(item.widgets)) {
			const widgetHtml = generateWidget(widgetDef)
			const isSvg = widgetHtml.trim().startsWith("<svg")
			if (isSvg) {
				const dataUri = encodeDataUri(widgetHtml)
				const altText = escapeXmlAttribute(`A visual element of type ${widgetDef.type}.`)
				slots.set(widgetId, `<p><img src="${escapeXmlAttribute(dataUri)}" alt="${altText}" /></p>`)
			} else {
				slots.set(widgetId, widgetHtml)
			}
		}
	}

	if (item.interactions) {
		for (const [interactionId, interactionDef] of Object.entries(item.interactions)) {
			const interactionXml = compileInteraction(interactionDef)
			slots.set(interactionId, interactionXml)
		}
	}

	// Step 3: Process the body, filling all slots at once
	const processedBody = processAndFillSlots(item.body, slots)

	// Step 4: Compile response declarations and processing rules
	const responseDeclarations = compileResponseDeclarations(item.responseDeclarations)
	const responseProcessing = compileResponseProcessing(item.responseDeclarations)

	const correctFeedback = item.feedback.correct
	const incorrectFeedback = item.feedback.incorrect

	// Step 5: Assemble the final XML document
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
        ${processedBody}
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>${correctFeedback}</qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>${incorrectFeedback}</qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
${responseProcessing}
</qti-assessment-item>`

	return finalXml
}
