import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
// New imports for XML cleanup
import {
	convertHtmlEntities,
	fixInequalityOperators,
	fixKhanGraphieUrls,
	fixMathMLOperators
} from "@/lib/qti-generation/xml-fixes"
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

/**
 * Calculates the greatest common divisor (GCD) of two numbers using the Euclidean algorithm.
 * @param a The first number.
 * @param b The second number.
 * @returns The GCD of a and b.
 */
function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b)
}

/**
 * Determines if a fraction results in a terminating decimal.
 * A fraction terminates if and only if the prime factors of its simplified denominator are only 2s and 5s.
 * @param numerator The numerator of the fraction.
 * @param denominator The denominator of the fraction.
 * @returns True if the fraction terminates, false otherwise.
 */
function isTerminatingFraction(numerator: number, denominator: number): boolean {
	if (denominator === 0) {
		return false
	}
	// Simplify the fraction by dividing by the GCD.
	const commonDivisor = gcd(Math.abs(numerator), Math.abs(denominator))
	let simplifiedDen = Math.abs(denominator) / commonDivisor

	// The fraction terminates if the simplified denominator's prime factors are only 2 and 5.
	// We can check this by repeatedly dividing by 2 and 5 until we can't anymore.
	// If the result is 1, it has no other prime factors.
	while (simplifiedDen % 2 === 0) {
		simplifiedDen /= 2
	}
	while (simplifiedDen % 5 === 0) {
		simplifiedDen /= 5
	}

	return simplifiedDen === 1
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

/**
 * Processes a string containing <slot /> placeholders and replaces them with
 * the corresponding content from the provided slots map.
 *
 * Supports multiple slot tag formats:
 * - Self-closing: <slot name="example" />
 * - Self-closing without space: <slot name="example"/>
 * - With attributes: <slot name="example" class="widget" data-type="graph" />
 * - Various whitespace: <slot   name="example"   />
 *
 * The function performs recursive replacement to handle nested slot references,
 * where slot content may itself contain slot tags.
 *
 * @param content The HTML content string with placeholders.
 * @param slots A map where keys are slot names and values are the HTML/XML to inject.
 * @returns The content string with all placeholders filled.
 */
function processAndFillSlots(content: string, slots: Map<string, string>): string {
	// Enhanced regex with named capture groups for robust slot matching
	// This regex matches:
	// - Opening <slot tag
	// - Any attributes (captured in named group)
	// - Self-closing /> or just > (captured in named group)
	const slotRegex = /<slot(?<attributes>(?:\s+(?:[\w-]+(?:\s*=\s*"[^"]*")?))*)(?<whitespace>\s*)(?<selfClose>\/?)>/g

	// Track processed slots to detect circular references
	const processedSlots = new Set<string>()

	// Recursive function to process content
	function processContent(text: string, depth = 0): string {
		// Prevent infinite recursion
		if (depth > 10) {
			throw errors.new("maximum slot nesting depth exceeded (10 levels)")
		}

		// Find all slot matches in current content
		const matches = Array.from(text.matchAll(slotRegex))

		// If no slots found, return content as-is
		if (matches.length === 0) {
			return text
		}

		// Process slots from end to beginning to maintain correct indices
		let result = text
		for (let i = matches.length - 1; i >= 0; i--) {
			const match = matches[i]
			if (!match || match.index === undefined) {
				continue
			}

			const fullMatch = match[0]
			const attributes = match.groups?.attributes || ""

			// Extract name attribute using a more specific regex
			const nameMatch = attributes.match(/\bname\s*=\s*"(?<name>[^"]+)"/i)

			if (!nameMatch || !nameMatch.groups?.name) {
				throw errors.new(`slot tag missing required 'name' attribute: ${fullMatch}`)
			}

			const slotName = nameMatch.groups.name.trim()

			if (slotName === "") {
				throw errors.new(`slot tag has empty name attribute: ${fullMatch}`)
			}

			// Check for circular reference
			const slotKey = `${slotName}_${depth}`
			if (processedSlots.has(slotKey)) {
				throw errors.new(`circular slot reference detected: '${slotName}'`)
			}

			// Get slot content
			const slotContent = slots.get(slotName)
			if (slotContent === undefined) {
				// CRITICAL: Fail loudly on missing slot content.
				throw errors.new(`missing content for slot: '${slotName}'`)
			}

			// Mark slot as being processed
			processedSlots.add(slotKey)

			// Recursively process the slot content
			const processedSlotContent = processContent(slotContent, depth + 1)

			// Replace the slot tag with processed content
			const startIndex = match.index
			const endIndex = startIndex + fullMatch.length
			result = result.slice(0, startIndex) + processedSlotContent + result.slice(endIndex)

			// Unmark slot after processing
			processedSlots.delete(slotKey)
		}

		return result
	}

	// Process the content
	const processedContent = processContent(content)

	// Final validation: Ensure no slot tags remain
	const remainingSlots = processedContent.match(/<slot\s+[^>]*>/g)
	if (remainingSlots) {
		// Extract slot names for better error message
		const remainingNames = remainingSlots.map((tag) => {
			const nameMatch = tag.match(/name\s*=\s*"([^"]+)"/i)
			return nameMatch ? nameMatch[1] : "unknown"
		})
		throw errors.new(`unprocessed slot tags remain after replacement: ${remainingNames.join(", ")}`)
	}

	return processedContent
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
	// Pre-process declarations to add equivalent numeric mappings.
	const processedDecls = decls.map((decl) => {
		const newMapping: Record<string, number | string> = { ...(decl.mapping || {}) }
		const correctValues = Array.isArray(decl.correct) ? decl.correct : [decl.correct]
		const mappedValue = 1.0 // By default, equivalent answers are worth full points.

		for (const val of correctValues) {
			if (typeof val !== "string") {
				continue
			}

			// Rule 1: Handle leading zero decimals (e.g., .5 vs 0.5)
			if (val.startsWith(".")) {
				const withLeadingZero = `0${val}`
				if (!(withLeadingZero in newMapping)) {
					newMapping[withLeadingZero] = mappedValue
				}
			} else if (val.startsWith("0.")) {
				const withoutLeadingZero = val.substring(1)
				if (!(withoutLeadingZero in newMapping)) {
					newMapping[withoutLeadingZero] = mappedValue
				}
			}

			// Rule 2: Handle fractions that convert to terminating decimals
			if (val.includes("/") && !val.startsWith(".")) {
				const parts = val.split("/")
				if (parts.length === 2 && parts[0] && parts[1]) {
					const num = Number.parseInt(parts[0], 10)
					const den = Number.parseInt(parts[1], 10)

					if (!Number.isNaN(num) && !Number.isNaN(den) && isTerminatingFraction(num, den)) {
						const decimalValue = (num / den).toString()
						if (!(decimalValue in newMapping)) {
							newMapping[decimalValue] = mappedValue

							// Also handle the leading-zero case for the newly generated decimal
							if (decimalValue.startsWith("0.")) {
								const withoutLeadingZero = decimalValue.substring(1)
								if (!(withoutLeadingZero in newMapping)) {
									newMapping[withoutLeadingZero] = mappedValue
								}
							}
						}
					}
				}
			}
		}

		return { ...decl, mapping: newMapping }
	})

	return processedDecls
		.map((decl) => {
			const correctValues = Array.isArray(decl.correct) ? decl.correct : [decl.correct]
			const correctXml = correctValues.map((v) => `<qti-value>${String(v)}</qti-value>`).join("\n            ")

			let xml = `\n    <qti-response-declaration identifier="${escapeXmlAttribute(decl.identifier)}" cardinality="${escapeXmlAttribute(
				decl.cardinality
			)}" base-type="${escapeXmlAttribute(decl.baseType)}">
        <qti-correct-response>
            ${correctXml}
        </qti-correct-response>`

			// Only add the mapping block if there are entries to add.
			if (decl.mapping && Object.keys(decl.mapping).length > 0) {
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

	// Generate the initial XML string
	let finalXml = `<?xml version="1.0" encoding="UTF-8"?>
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

	// Apply standard XML cleanup and fixes to ensure API compliance
	finalXml = convertHtmlEntities(finalXml, logger)
	finalXml = fixMathMLOperators(finalXml, logger)
	finalXml = fixInequalityOperators(finalXml, logger)
	finalXml = fixKhanGraphieUrls(finalXml, logger)

	return finalXml
}
