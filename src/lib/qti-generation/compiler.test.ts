import { describe, expect, test } from "bun:test"
import { compile } from "./compiler"
import { allExamples } from "./examples"
import type { AssessmentItemInput } from "./schemas"

describe("QTI Compiler", () => {
	// Dynamic tests generated from unified examples
	for (const example of allExamples) {
		test(`should correctly compile ${example.identifier}`, () => {
			const compiledXml = compile(example)
			expect(compiledXml).toMatchSnapshot()
			expect(compiledXml).toContain(`identifier="${example.identifier}"`)
		})
	}

	test("deduplicates identical prompt text paragraph from body", () => {
		const promptText = "Which is the smallest truck that they can use?"
		const item: AssessmentItemInput = {
			identifier: "moving-truck-volume-choice",
			title: "Choose the smallest moving truck that meets a volume requirement",
			responseDeclarations: [{ identifier: "RESPONSE", cardinality: "single", baseType: "identifier", correct: "A" }],
			widgets: null,
			body: [
				{
					type: "paragraph",
					content: [{ type: "text", content: promptText }]
				},
				{ type: "blockSlot", slotId: "choice_interaction" }
			],
			interactions: {
				choice_interaction: {
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: [{ type: "text", content: promptText }],
					choices: [
						{
							identifier: "A",
							content: [{ type: "paragraph", content: [{ type: "text", content: "A" }] }],
							feedback: null
						},
						{
							identifier: "B",
							content: [{ type: "paragraph", content: [{ type: "text", content: "B" }] }],
							feedback: null
						}
					]
				}
			},
			feedback: {
				correct: [{ type: "paragraph", content: [{ type: "text", content: "ok" }] }],
				incorrect: [{ type: "paragraph", content: [{ type: "text", content: "no" }] }]
			}
		}

		const xml = compile(item)
		const occurrences = (xml.match(new RegExp(promptText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
		expect(occurrences).toBe(1)
	})
})
