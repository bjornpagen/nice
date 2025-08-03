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
	WidgetSchema
} from "@/lib/widgets/generators"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import type { AnyInteraction, AssessmentItem } from "./schemas"
import { AnyInteractionSchema, AssessmentItemSchema } from "./schemas"

function encodeDataUri(content: string): string {
	const encoded = encodeURIComponent(content)
		.replace(/'/g, "%27")
		.replace(/"/g, "%22")
		.replace(/</g, "%3C")
		.replace(/>/g, "%3E")
	const isSvg = content.trim().startsWith("<svg")
	return `${isSvg ? "data:image/svg+xml" : "data:text/html"},${encoded}`
}

function escapeTextContent(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function renderContent(content: unknown): string {
	if (typeof content === "string") {
		// If it contains MathML, return as-is (it's already XML)
		if (content.includes("<math")) {
			return content
		}
		// Otherwise wrap in paragraph and escape
		return `<p>${escapeTextContent(content)}</p>`
	}

	if (typeof content === "object" && content !== null && "type" in content) {
		if (content.type === "mathml" && "xml" in content && typeof content.xml === "string") {
			return content.xml
		}

		const parseResult = WidgetSchema.safeParse(content)
		if (parseResult.success) {
			const widget = parseResult.data
			const generatedHtml = generateWidget(widget)
			const dataUri = encodeDataUri(generatedHtml)
			const altText = escapeXmlAttribute(`A visual element of type ${widget.type}.`)
			return `<img src="${escapeXmlAttribute(dataUri)}" alt="${altText}" />`
		}
	}
	throw errors.new(`Invalid content block provided: ${JSON.stringify(content)}`)
}

function compileInteraction(interaction: AnyInteraction): string {
	switch (interaction.type) {
		case "choiceInteraction": {
			const choices = interaction.choices
				.map((c) => {
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${renderContent(c.content)}`
					if (c.feedback) {
						choiceXml += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${escapeTextContent(c.feedback)}</qti-feedback-inline>`
					}
					choiceXml += "</qti-simple-choice>"
					return choiceXml
				})
				.join("\n            ")

			return `<qti-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" min-choices="${interaction.minChoices}" max-choices="${interaction.maxChoices}">
            <qti-prompt>${escapeTextContent(interaction.prompt)}</qti-prompt>
            ${choices}
        </qti-choice-interaction>`
		}
		case "orderInteraction": {
			const choices = interaction.choices
				.map((c) => {
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${renderContent(c.content)}`
					if (c.feedback) {
						choiceXml += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${escapeTextContent(c.feedback)}</qti-feedback-inline>`
					}
					choiceXml += "</qti-simple-choice>"
					return choiceXml
				})
				.join("\n            ")

			return `<qti-order-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" orientation="${escapeXmlAttribute(interaction.orientation)}">
            <qti-prompt>${escapeTextContent(interaction.prompt)}</qti-prompt>
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
						`<qti-inline-choice identifier="${escapeXmlAttribute(c.identifier)}">${renderContent(c.content)}</qti-inline-choice>`
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

function compileItemBody(body: AssessmentItem["body"]): string {
	return body
		.map((element) => {
			// Use Zod to determine if it's an interaction
			const interactionResult = AnyInteractionSchema.safeParse(element)
			if (interactionResult.success) {
				return compileInteraction(interactionResult.data)
			}
			// Otherwise it's content
			return renderContent(element)
		})
		.join("\n        ")
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
			const correctXml = correctValues
				.map((v) => `<qti-value>${escapeTextContent(String(v))}</qti-value>`)
				.join("\n            ")

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

export function compile(itemData: AssessmentItem): string {
	const item = AssessmentItemSchema.parse(itemData)

	const responseDeclarations = compileResponseDeclarations(item.responseDeclarations)
	const itemBody = compileItemBody(item.body)
	const responseProcessing = compileResponseProcessing(item.responseDeclarations)

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
        ${itemBody}
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <qti-content-body><p><span class="qti-keyword-emphasis">Correct!</span> ${escapeTextContent(item.feedback.correct)}</p></qti-content-body>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <qti-content-body><p><span class="qti-keyword-emphasis">Not quite.</span> ${escapeTextContent(item.feedback.incorrect)}</p></qti-content-body>
        </qti-feedback-block>
    </qti-item-body>
${responseProcessing}
</qti-assessment-item>`
}
