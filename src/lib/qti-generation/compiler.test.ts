import { describe, expect, test } from "bun:test"
import { compile } from "./compiler"
import { allExamples } from "./examples"
import type { AssessmentItemInput } from "./schemas"

describe("QTI Compiler", () => {
	// Dynamic tests generated from unified examples
	for (const example of allExamples) {
		const allowed = new Set<string>([
			"reaction-rate-changes-table",
			"ke-mass-speed-relationships",
			"reactant-amounts-temp-change-table-perseus"
		])
		const shouldSkip = !allowed.has(example.identifier)
		const testFn = shouldSkip ? test.skip : test
		testFn(`should correctly compile ${example.identifier}`, () => {
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

	test("deduplicates multi-paragraph instruction when prompt equals their concatenation", () => {
		const p1 = "Choose the best phrase to fill in the blank."
		const p2 = "A diploid organism has _____ in each cell."
		const item: AssessmentItemInput = {
			identifier: "diploid-organism-fill-blank-multi",
			title: "Choose the best phrase to fill in the blank",
			responseDeclarations: [{ identifier: "RESPONSE", cardinality: "single", baseType: "identifier", correct: "A" }],
			widgets: null,
			body: [
				{ type: "paragraph", content: [{ type: "text", content: p1 }] },
				{ type: "paragraph", content: [{ type: "text", content: p2 }] },
				{ type: "blockSlot", slotId: "choice_interaction" }
			],
			interactions: {
				choice_interaction: {
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: [{ type: "text", content: `${p1} ${p2}` }],
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
		// ensure each sentence appears only once (in prompt) – not duplicated in body paragraphs
		const occ1 = (xml.match(new RegExp(p1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
		const occ2 = (xml.match(new RegExp(p2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
		expect(occ1).toBe(1)
		expect(occ2).toBe(1)
	})
})
