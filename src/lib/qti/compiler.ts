import * as errors from "@superbuilders/errors"
import type { Widget } from "@/lib/widgets/generators"
import {
	generateAbsoluteValueNumberLine,
	generateBarChart,
	generateBoxPlot,
	generateCompositeShapeDiagram,
	generateCoordinatePlane,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDotPlot,
	generateDoubleNumberLine,
	generateGeometricSolidDiagram,
	generateHangerDiagram,
	generateHistogram,
	generateInequalityNumberLine,
	generateNumberLine,
	generateNumberLineForOpposites,
	generateNumberLineWithAction,
	generateNumberLineWithFractionGroups,
	generateNumberSetDiagram,
	generateParallelLinesTransversal,
	generatePartitionedShape,
	generatePictograph,
	generatePolyhedronDiagram,
	generatePolyhedronNetDiagram,
	generatePythagoreanProofDiagram,
	generateScatterPlot,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateUnitBlockDiagram,
	generateVennDiagram,
	generateVerticalArithmeticSetup
} from "@/lib/widgets/generators"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import type { AnyInteraction, AssessmentItem, AssessmentItemInput } from "./schemas"
import { AssessmentItemSchema } from "./schemas"

// This helper must be added to fix the feedback compilation regression.
const createFeedbackHtml = (content: string) => {
	// This restores the required wrapper for feedback blocks.
	return `<p><span class="qti-keyword-emphasis">Feedback</span>: ${content}</p>`
}

function validateHtmlContent(content: string, context: string): void {
	// Basic validation to ensure the content looks like HTML
	// Check if it contains HTML tags or is wrapped in tags
	const trimmed = content.trim()

	// Check for common HTML patterns
	const hasHtmlTags = /<[^>]+>/.test(trimmed)

	if (!hasHtmlTags) {
		throw errors.new(`Content in ${context} must be well-formed HTML but got plain text: "${content}"`)
	}

	// For partial content (starts with opening tag but no closing, or vice versa)
	// This is valid in QTI when content is split across multiple elements
	const startsWithOpeningTag = /^<p[^>]*>/.test(trimmed)
	const endsWithClosingTag = /<\/p>$/.test(trimmed)

	// If it's a partial fragment (starts OR ends with tag but not both), it's valid
	if ((startsWithOpeningTag && !endsWithClosingTag) || (!startsWithOpeningTag && endsWithClosingTag)) {
		return // Valid partial content
	}

	// Basic check for unclosed tags (only for complete content)
	const openTags = trimmed.match(/<([^/\s>]+)[^>]*>/g) || []
	const closeTags = trimmed.match(/<\/([^>]+)>/g) || []

	// Simple validation - this won't catch all cases but will catch obvious issues
	const openTagNames = openTags
		.map((tag) => {
			const match = tag.match(/<([^/\s>]+)/)
			return match ? match[1] : null
		})
		.filter((tag): tag is string => tag !== null)

	const closeTagNames = closeTags
		.map((tag) => {
			const match = tag.match(/<\/([^>]+)>/)
			return match ? match[1] : null
		})
		.filter((tag): tag is string => tag !== null)

	// Check for self-closing tags and void elements
	const selfClosingTags = [
		"img",
		"br",
		"hr",
		"input",
		"meta",
		"link",
		"area",
		"base",
		"col",
		"embed",
		"source",
		"track",
		"wbr"
	]
	const nonSelfClosingOpenTags = openTagNames.filter((tag) => !selfClosingTags.includes(tag))

	// Special handling for MathML elements like mroot which has different validation rules
	const hasMathML = content.includes('xmlns="http://www.w3.org/1998/Math/MathML"')
	if (hasMathML) {
		// Skip strict tag matching for MathML content as it has complex nesting rules
		return
	}

	if (nonSelfClosingOpenTags.length !== closeTagNames.length) {
		throw errors.new(`Content in ${context} has mismatched HTML tags: "${content}"`)
	}
}

function encodeDataUri(content: string): string {
	const encoded = encodeURIComponent(content)
		.replace(/'/g, "%27")
		.replace(/"/g, "%22")
		.replace(/</g, "%3C")
		.replace(/>/g, "%3E")
	const isSvg = content.trim().startsWith("<svg")
	return `${isSvg ? "data:image/svg+xml" : "data:text/html"},${encoded}`
}

function processSlots(content: string, widgets?: AssessmentItem["widgets"]): string {
	if (!widgets && content.includes("<slot")) {
		throw errors.new(`content contains a <slot> but no widgets map was provided: "${content.substring(0, 50)}..."`)
	}
	if (!widgets) {
		return content
	}

	return content.replace(/<slot\s+name="([^"]+)"\s*\/>/g, (_match, widgetName) => {
		const widget = widgets[widgetName]
		if (!widget) {
			// CRITICAL: Fail loudly on missing widget as per no-fallbacks-save-human-lives.mdc
			throw errors.new(`missing widget definition for slot: '${widgetName}'`)
		}

		const generatedHtml = generateWidget(widget)
		const isSvg = generatedHtml.trim().startsWith("<svg")

		if (isSvg) {
			const dataUri = encodeDataUri(generatedHtml)
			const altText = escapeXmlAttribute(`A visual element of type ${widget.type}.`)
			return `<p><img src="${escapeXmlAttribute(dataUri)}" alt="${altText}" /></p>`
		}
		return generatedHtml
	})
}

function compileInteraction(interaction: AnyInteraction, widgets?: AssessmentItem["widgets"]): string {
	switch (interaction.type) {
		case "choiceInteraction": {
			// Validate prompt HTML
			validateHtmlContent(interaction.prompt, "choiceInteraction prompt")

			const processedPrompt = processSlots(interaction.prompt, widgets)
			const choices = interaction.choices
				.map((c) => {
					const processedContent = processSlots(c.content, widgets)
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${processedContent}`
					if (c.feedback) {
						validateHtmlContent(c.feedback, `choiceInteraction feedback for choice ${c.identifier}`)
						choiceXml += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${c.feedback}</qti-feedback-inline>`
					}
					choiceXml += "</qti-simple-choice>"
					return choiceXml
				})
				.join("\n            ")

			return `<qti-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" min-choices="${interaction.minChoices}" max-choices="${interaction.maxChoices}">
            <qti-prompt>${processedPrompt}</qti-prompt>
            ${choices}
        </qti-choice-interaction>`
		}
		case "orderInteraction": {
			// Validate prompt HTML
			validateHtmlContent(interaction.prompt, "orderInteraction prompt")

			const processedPrompt = processSlots(interaction.prompt, widgets)
			const choices = interaction.choices
				.map((c) => {
					const processedContent = processSlots(c.content, widgets)
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${processedContent}`
					if (c.feedback) {
						validateHtmlContent(c.feedback, `orderInteraction feedback for choice ${c.identifier}`)
						choiceXml += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${c.feedback}</qti-feedback-inline>`
					}
					choiceXml += "</qti-simple-choice>"
					return choiceXml
				})
				.join("\n            ")

			return `<qti-order-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" orientation="${escapeXmlAttribute(interaction.orientation)}">
            <qti-prompt>${processedPrompt}</qti-prompt>
            ${choices}
        </qti-order-interaction>`
		}
		case "textEntryInteraction": {
			let xml = `<qti-text-entry-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}"`
			if (interaction.expectedLength) {
				xml += ` expected-length="${interaction.expectedLength}"`
			}
			xml += "/>"
			return xml
		}
		case "inlineChoiceInteraction": {
			const choices = interaction.choices
				.map(
					(c) =>
						`<qti-inline-choice identifier="${escapeXmlAttribute(c.identifier)}">${processSlots(c.content, widgets)}</qti-inline-choice>`
				)
				.join("\n                ")

			return `<qti-inline-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}">
                ${choices}
            </qti-inline-choice-interaction>`
		}
		default:
			throw errors.new("Unknown interaction type")
	}
}

function generateWidget(widget: Widget): string {
	switch (widget.type) {
		case "absoluteValueNumberLine":
			return generateAbsoluteValueNumberLine(widget)
		case "barChart":
			return generateBarChart(widget)
		case "boxPlot":
			return generateBoxPlot(widget)
		case "compositeShapeDiagram":
			return generateCompositeShapeDiagram(widget)
		case "coordinatePlane":
			return generateCoordinatePlane(widget)
		case "dataTable":
			return generateDataTable(widget)
		case "discreteObjectRatioDiagram":
			return generateDiscreteObjectRatioDiagram(widget)
		case "dotPlot":
			return generateDotPlot(widget)
		case "doubleNumberLine":
			return generateDoubleNumberLine(widget)
		case "geometricSolidDiagram":
			return generateGeometricSolidDiagram(widget)
		case "hangerDiagram":
			return generateHangerDiagram(widget)
		case "histogram":
			return generateHistogram(widget)
		case "inequalityNumberLine":
			return generateInequalityNumberLine(widget)
		case "numberLine":
			return generateNumberLine(widget)
		case "numberLineForOpposites":
			return generateNumberLineForOpposites(widget)
		case "numberLineWithAction":
			return generateNumberLineWithAction(widget)
		case "numberLineWithFractionGroups":
			return generateNumberLineWithFractionGroups(widget)
		case "numberSetDiagram":
			return generateNumberSetDiagram(widget)
		case "parallelLinesTransversal":
			return generateParallelLinesTransversal(widget)
		case "partitionedShape":
			return generatePartitionedShape(widget)
		case "pictograph":
			return generatePictograph(widget)
		case "polyhedronDiagram":
			return generatePolyhedronDiagram(widget)
		case "polyhedronNetDiagram":
			return generatePolyhedronNetDiagram(widget)
		case "pythagoreanProofDiagram":
			return generatePythagoreanProofDiagram(widget)
		case "scatterPlot":
			return generateScatterPlot(widget)
		case "stackedItemsDiagram":
			return generateStackedItemsDiagram(widget)
		case "tapeDiagram":
			return generateTapeDiagram(widget)
		case "unitBlockDiagram":
			return generateUnitBlockDiagram(widget)
		case "vennDiagram":
			return generateVennDiagram(widget)
		case "verticalArithmeticSetup":
			return generateVerticalArithmeticSetup(widget)
	}
}

function compileResponseDeclarations(decls: AssessmentItem["responseDeclarations"]): string {
	return decls
		.map((decl) => {
			const correctValues = Array.isArray(decl.correct) ? decl.correct : [decl.correct]
			const correctXml = correctValues.map((v) => `<qti-value>${String(v)}</qti-value>`).join("\n            ")

			let xml = `\n    <qti-response-declaration identifier="${escapeXmlAttribute(decl.identifier)}" cardinality="${escapeXmlAttribute(decl.cardinality)}" base-type="${escapeXmlAttribute(decl.baseType)}">
        <qti-correct-response>
            ${correctXml}
        </qti-correct-response>`

			if (decl.mapping) {
				const mapEntries = Object.entries(decl.mapping)
					.map(
						([key, val]) =>
							`<qti-map-entry map-key="${escapeXmlAttribute(key)}" mapped-value="${escapeXmlAttribute(String(val))}"/>`
					)
					.join("\n            ")
				xml += `
        <qti-mapping>
            ${mapEntries}
        </qti-mapping>`
			}

			xml += "\n    </qti-response-declaration>"
			return xml
		})
		.join("")
}

function compileResponseProcessing(decls: AssessmentItem["responseDeclarations"]): string {
	const conditions = decls
		.map(
			(decl) =>
				`<qti-match><qti-variable identifier="${escapeXmlAttribute(decl.identifier)}"/><qti-correct identifier="${escapeXmlAttribute(decl.identifier)}"/></qti-match>`
		)
		.join("\n                    ")

	return `
    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-and>
                    ${conditions}
                </qti-and>
                <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">1</qti-base-value></qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">CORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">0</qti-base-value></qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">INCORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>`
}

// Update the function signature to accept the raw INPUT type
export function compile(itemData: AssessmentItemInput): string {
	const item: AssessmentItem = AssessmentItemSchema.parse(itemData)

	// Start with the body string containing placeholders.
	let processedBody = item.body

	// 1. Replace widget placeholders
	if (item.widgets) {
		for (const [widgetId, widgetDef] of Object.entries(item.widgets)) {
			const placeholder = `<slot name="${widgetId}" />`
			const widgetHtml = generateWidget(widgetDef)
			const isSvg = widgetHtml.trim().startsWith("<svg")

			let finalHtml: string
			if (isSvg) {
				// For SVG content, embed it in an img tag with a data URI.
				// This restores the original, correct behavior.
				const dataUri = encodeDataUri(widgetHtml)
				const altText = escapeXmlAttribute(`A visual element of type ${widgetDef.type}.`)
				finalHtml = `<p><img src="${escapeXmlAttribute(dataUri)}" alt="${altText}" /></p>`
			} else {
				// For non-SVG widgets (like dataTable), insert the HTML directly.
				finalHtml = widgetHtml
			}
			processedBody = processedBody.replaceAll(placeholder, finalHtml)
		}
	}

	// 2. Replace interaction placeholders
	if (item.interactions) {
		for (const [interactionId, interactionDef] of Object.entries(item.interactions)) {
			const placeholder = `<slot name="${interactionId}" />`
			// compileInteraction MUST return raw, unwrapped XML to preserve inline/block context.
			const interactionXml = compileInteraction(interactionDef, item.widgets)
			processedBody = processedBody.replaceAll(placeholder, interactionXml)
		}
	}

	const responseDeclarations = compileResponseDeclarations(item.responseDeclarations)
	const responseProcessing = compileResponseProcessing(item.responseDeclarations)

	// 3. Fix feedback compilation by using the new helper.
	const correctFeedback = createFeedbackHtml(item.feedback.correct)
	const incorrectFeedback = createFeedbackHtml(item.feedback.incorrect)

	return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
    identifier="${escapeXmlAttribute(item.identifier)}"
    title="${escapeXmlAttribute(item.title)}"
    time-dependent="false">
${responseDeclarations}
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value><qti-value>0</qti-value></qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
    <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="multiple" base-type="identifier"/>

    <qti-item-body>
        ${processedBody.trim()}
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body>${correctFeedback}</qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body>${incorrectFeedback}</qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
${responseProcessing}
</qti-assessment-item>`
}
