import * as errors from "@superbuilders/errors"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import type { AnyInteraction } from "./schemas"

export function compileInteraction(interaction: AnyInteraction): string {
	let interactionXml: string

	switch (interaction.type) {
		case "choiceInteraction": {
			const processedPrompt = interaction.prompt
			const choices = interaction.choices
				.map((c) => {
					const processedContent = c.content
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${processedContent}`
					if (c.feedback) {
						const processedFeedback = c.feedback
						choiceXml += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${processedFeedback}</qti-feedback-inline>`
					}
					choiceXml += "</qti-simple-choice>"
					return choiceXml
				})
				.join("\n            ")

			interactionXml = `<qti-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" min-choices="${interaction.minChoices}" max-choices="${interaction.maxChoices}">
            <qti-prompt>${processedPrompt}</qti-prompt>
            ${choices}
        </qti-choice-interaction>`
			break
		}
		case "orderInteraction": {
			const processedPrompt = interaction.prompt
			const choices = interaction.choices
				.map((c) => {
					const processedContent = c.content
					let choiceXml = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${processedContent}`
					if (c.feedback) {
						const processedFeedback = c.feedback
						choiceXml += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${processedFeedback}</qti-feedback-inline>`
					}
					choiceXml += "</qti-simple-choice>"
					return choiceXml
				})
				.join("\n            ")

			interactionXml = `<qti-order-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" orientation="${escapeXmlAttribute(interaction.orientation)}">
            <qti-prompt>${processedPrompt}</qti-prompt>
            ${choices}
        </qti-order-interaction>`
			break
		}
		case "textEntryInteraction": {
			let xml = `<qti-text-entry-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}"`
			if (interaction.expectedLength) {
				xml += ` expected-length="${interaction.expectedLength}"`
			}
			xml += "/>"
			interactionXml = xml
			break
		}
		case "inlineChoiceInteraction": {
			const choices = interaction.choices
				.map(
					(c) => `<qti-inline-choice identifier="${escapeXmlAttribute(c.identifier)}">${c.content}</qti-inline-choice>`
				)
				.join("\n                ")

			interactionXml = `<qti-inline-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}">
                ${choices}
            </qti-inline-choice-interaction>`
			break
		}
		default:
			throw errors.new("Unknown interaction type")
	}

	// Wrap block-level interactions in div to comply with QTI content model
	// Inline interactions (textEntryInteraction, inlineChoiceInteraction) must remain unwrapped
	// as they need to be placed inside text containers like <p> tags
	if (interaction.type === "textEntryInteraction" || interaction.type === "inlineChoiceInteraction") {
		// Inline interactions: return unwrapped for placement inside text containers
		return interactionXml
	}
	// Block interactions: wrap in div to satisfy QTI content model when mixed with other block elements
	return `<div>${interactionXml}</div>`
}
