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
	generateVerticalArithmeticSetup,
	typedSchemas
} from "@/lib/widgets/generators"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import type { AnyInteraction, AssessmentItem, AssessmentItemInput } from "./schemas"
import { createDynamicAssessmentItemSchema } from "./schemas"

function encodeDataUri(content: string): string {
	const encoded = encodeURIComponent(content)
		.replace(/'/g, "%27")
		.replace(/"/g, "%22")
		.replace(/</g, "%3C")
		.replace(/>/g, "%3E")
	const isSvg = content.trim().startsWith("<svg")
	return `${isSvg ? "data:image/svg+xml" : "data:text/html"},${encoded}`
}

/**
 * Processes a string containing <slot /> placeholders and replaces them with
 * the corresponding content from the provided slots map.
 * @param content The HTML content string with placeholders.
 * @param slots A map where keys are slot names and values are the HTML/XML to inject.
 * @returns The content string with all placeholders filled.
 */
function processAndFillSlots(content: string, slots: Map<string, string>): string {
	return content.replace(/<slot\s+name="([^"]+)"\s*\/>/g, (_match, slotName) => {
		const slotContent = slots.get(slotName)
		if (slotContent === undefined) {
			// CRITICAL: Fail loudly on missing slot content.
			throw errors.new(`missing content for slot: '${slotName}'`)
		}
		return slotContent
	})
}

function compileInteraction(interaction: AnyInteraction): string {
	switch (interaction.type) {
		case "choiceInteraction": {
			const processedPrompt = interaction.prompt
			const choices = interaction.choices
				.map((c) => {
					const processedContent = c.content
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${processedContent}`
					if (c.feedback) {
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
			const processedPrompt = interaction.prompt
			const choices = interaction.choices
				.map((c) => {
					const processedContent = c.content
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${processedContent}`
					if (c.feedback) {
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
					(c) => `<qti-inline-choice identifier="${escapeXmlAttribute(c.identifier)}">${c.content}</qti-inline-choice>`
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

// Helper function to check if a string is a valid widget type
function isValidWidgetType(type: string): type is keyof typeof typedSchemas {
	return type in typedSchemas
}

// Update the function signature to accept the raw INPUT type
export function compile(itemData: AssessmentItemInput): string {
	// First, analyze the widgets to create the appropriate schema
	const widgetMapping: Record<string, keyof typeof typedSchemas> = {}
	if (itemData.widgets) {
		for (const [slotName, widget] of Object.entries(itemData.widgets)) {
			if (widget && typeof widget === "object" && "type" in widget && typeof widget.type === "string") {
				const widgetType = widget.type
				// Use type guard function for type-safe check
				if (isValidWidgetType(widgetType)) {
					widgetMapping[slotName] = widgetType
				}
			}
		}
	}

	// Create a dynamic schema based on the widgets present
	const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(widgetMapping)
	const item: AssessmentItem = AssessmentItemSchema.parse(itemData)

	// Create a single map to hold all slot content (widgets and interactions).
	const slots = new Map<string, string>()

	// 1. Generate and add all widget content to the map.
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

	// 2. Compile and add all interaction XML to the map.
	if (item.interactions) {
		for (const [interactionId, interactionDef] of Object.entries(item.interactions)) {
			// The compileInteraction function now returns raw XML without processing internal slots.
			const interactionXml = compileInteraction(interactionDef)
			slots.set(interactionId, interactionXml)
		}
	}

	// 3. Process the entire body at once using the unified slot filler.
	const processedBody = processAndFillSlots(item.body, slots)

	const responseDeclarations = compileResponseDeclarations(item.responseDeclarations)
	const responseProcessing = compileResponseProcessing(item.responseDeclarations)

	// 3. Use pre-validated feedback content directly from the item data.
	// The content is now guaranteed by the schema to be well-formed HTML.
	const correctFeedback = item.feedback.correct
	const incorrectFeedback = item.feedback.incorrect

	return `<?xml version="1.0" encoding="UTF-8"?>
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
