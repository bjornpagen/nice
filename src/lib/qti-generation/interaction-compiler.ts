import * as errors from "@superbuilders/errors"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import type { AnyInteraction } from "./schemas"

export function compileInteraction(interaction: AnyInteraction): string {
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
