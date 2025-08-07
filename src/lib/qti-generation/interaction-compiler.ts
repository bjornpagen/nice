import * as errors from "@superbuilders/errors"
import { escapeXmlAttribute } from "@/lib/xml-utils"
import { renderBlockContent, renderInlineContent } from "./content-renderer"
import type { AnyInteraction } from "./schemas"

export function compileInteraction(interaction: AnyInteraction, slots: Map<string, string>): string {
	let interactionXml: string

	switch (interaction.type) {
		case "choiceInteraction": {
			const promptXml = renderInlineContent(interaction.prompt, slots)
			const choicesXml = interaction.choices
				.map((c) => {
					const contentXml = renderBlockContent(c.content, slots)
					let choice = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${contentXml}`
					if (c.feedback) {
						choice += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${renderInlineContent(c.feedback, slots)}</qti-feedback-inline>`
					}
					choice += "</qti-simple-choice>"
					return choice
				})
				.join("\n            ")

			interactionXml = `<qti-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" min-choices="${interaction.minChoices}" max-choices="${interaction.maxChoices}">
            <qti-prompt>${promptXml}</qti-prompt>
            ${choicesXml}
        </qti-choice-interaction>`
			break
		}
		case "orderInteraction": {
			const promptXml = renderInlineContent(interaction.prompt, slots)
			const choicesXml = interaction.choices
				.map((c) => {
					const contentXml = renderBlockContent(c.content, slots)
					let choice = `<qti-simple-choice identifier="${escapeXmlAttribute(c.identifier)}">${contentXml}`
					if (c.feedback) {
						choice += `<qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="${escapeXmlAttribute(c.identifier)}">${renderInlineContent(c.feedback, slots)}</qti-feedback-inline>`
					}
					choice += "</qti-simple-choice>"
					return choice
				})
				.join("\n            ")

			interactionXml = `<qti-order-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}" orientation="${escapeXmlAttribute(interaction.orientation)}">
            <qti-prompt>${promptXml}</qti-prompt>
            ${choicesXml}
        </qti-order-interaction>`
			break
		}
		case "textEntryInteraction": {
			interactionXml = `<qti-text-entry-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}"${
				interaction.expectedLength ? ` expected-length="${interaction.expectedLength}"` : ""
			}/>`
			break
		}
		case "inlineChoiceInteraction": {
			const choicesXml = interaction.choices
				.map(
					(c) =>
						`<qti-inline-choice identifier="${escapeXmlAttribute(c.identifier)}">${renderInlineContent(c.content, slots)}</qti-inline-choice>`
				)
				.join("\n                ")

			interactionXml = `<qti-inline-choice-interaction response-identifier="${escapeXmlAttribute(interaction.responseIdentifier)}" shuffle="${interaction.shuffle}">
                ${choicesXml}
            </qti-inline-choice-interaction>`
			break
		}
		default: {
			// This should never happen if all interaction types are handled
			// We can't access properties on 'never', so we throw a generic error
			throw errors.new("Unhandled interaction type in switch statement")
		}
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
