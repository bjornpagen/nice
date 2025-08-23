import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { compile, ErrDuplicateResponseIdentifier, ErrDuplicateChoiceIdentifier, ErrInvalidRowHeaderKey } from "./compiler"
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

describe("QTI Compiler Robustness Checks", () => {
	test("should throw for duplicate responseIdentifier across dataTable dropdowns and interactions", () => {
		const item: AssessmentItemInput = {
			identifier: "duplicate-response-id-table-dropdowns",
			title: "Duplicate Response ID in Data Table Dropdowns",
			responseDeclarations: [
				{ identifier: "dropdown_1", cardinality: "single", baseType: "identifier", correct: "A" }
			],
			widgets: {
				table_1: {
					type: "dataTable",
					title: null,
					columns: [{ key: "col1", label: [{ type: "text", content: "Col 1" }], isNumeric: false }],
					data: [
						[
							{
								type: "dropdown",
								responseIdentifier: "dropdown_1", // First usage
								shuffle: false,
								choices: [
									{ identifier: "A", content: [{ type: "text", content: "Opt A" }] },
									{ identifier: "B", content: [{ type: "text", content: "Opt B" }] }
								]
							}
						]
					],
					rowHeaderKey: null,
					footer: null
				}
			},
			body: [{ type: "blockSlot", slotId: "table_1" }, { type: "paragraph", content: [{ type: "inlineSlot", slotId: "dropdown_1" }] }], // Reference in body for a top-level inlineChoiceInteraction
			interactions: {
				dropdown_1: { // This interaction uses the same responseIdentifier
					type: "inlineChoiceInteraction",
					responseIdentifier: "dropdown_1",
					shuffle: true,
					choices: [
						{ identifier: "X", content: [{ type: "text", content: "Opt X" }] },
						{ identifier: "Y", content: [{ type: "text", content: "Opt Y" }] }
					]
				}
			},
			feedback: { correct: [], incorrect: [] }
		};

		const result = errors.trySync(() => compile(item));
		expect(result.error).toBeInstanceOf(Error);
		if (result.error) {
			expect(errors.is(result.error, ErrDuplicateResponseIdentifier)).toBe(true);
			expect(result.error.message).toContain("duplicate response identifier");
		}
	});

	test("should throw for non-unique choice.identifier (case-sensitive) within a single dataTable dropdown", () => {
		const item: AssessmentItemInput = {
			identifier: "non-unique-choice-id-table-dropdown",
			title: "Non-Unique Choice ID in Data Table Dropdown",
			responseDeclarations: [
				{ identifier: "dropdown_1", cardinality: "single", baseType: "identifier", correct: "A" }
			],
			widgets: {
				table_1: {
					type: "dataTable",
					title: null,
					columns: [{ key: "col1", label: [{ type: "text", content: "Col 1" }], isNumeric: false }],
					data: [
						[
							{
								type: "dropdown",
								responseIdentifier: "dropdown_1",
								shuffle: false,
								choices: [
									{ identifier: "A", content: [{ type: "text", content: "Option A" }] },
									{ identifier: "A", content: [{ type: "text", content: "Option A again" }] } // Duplicate (case-sensitive)
								]
							}
						]
					],
					rowHeaderKey: null,
					footer: null
				}
			},
			body: [{ type: "blockSlot", slotId: "table_1" }],
			interactions: {},
			feedback: { correct: [], incorrect: [] }
		};

		const result = errors.trySync(() => compile(item));
		expect(result.error).toBeInstanceOf(Error);
		if (result.error) {
			expect(errors.is(result.error, ErrDuplicateChoiceIdentifier)).toBe(true);
			expect(result.error.message).toContain("duplicate choice identifiers");
		}
	});

    test("should NOT throw for case-different but valid choice.identifier within a single dataTable dropdown", () => {
        const item: AssessmentItemInput = {
            identifier: "case-different-choice-id-table-dropdown",
            title: "Case-Different Choice ID in Data Table Dropdown",
            responseDeclarations: [
                { identifier: "dropdown_1", cardinality: "single", baseType: "identifier", correct: "A" }
            ],
            widgets: {
                table_1: {
                    type: "dataTable",
                    title: null,
                    columns: [{ key: "col1", label: [{ type: "text", content: "Col 1" }], isNumeric: false }],
                    data: [
                        [
                            {
                                type: "dropdown",
                                responseIdentifier: "dropdown_1",
                                shuffle: false,
                                choices: [
                                    { identifier: "A", content: [{ type: "text", content: "Option A" }] },
                                    { identifier: "a", content: [{ type: "text", content: "Option a" }] } // Valid - case-sensitive
                                ]
                            }
                        ]
                    ],
                    rowHeaderKey: null,
                    footer: null
                }
            },
            body: [{ type: "blockSlot", slotId: "table_1" }],
            interactions: {},
            feedback: { correct: [], incorrect: [] }
        };

        const result = errors.trySync(() => compile(item));
        expect(result.error).toBeUndefined(); // Should compile successfully
    });

	test("should throw for invalid rowHeaderKey in dataTable", () => {
		const item: AssessmentItemInput = {
			identifier: "invalid-row-header-key-table",
			title: "Invalid Row Header Key in Data Table",
			responseDeclarations: [{ identifier: "text_response", cardinality: "single", baseType: "string", correct: "test" }],
			widgets: {
				table_1: {
					type: "dataTable",
					title: null,
					columns: [
						{ key: "col1", label: [{ type: "text", content: "Column 1" }], isNumeric: false },
						{ key: "col2", label: [{ type: "text", content: "Column 2" }], isNumeric: false }
					],
					data: [[{ type: "inline", content: [{ type: "text", content: "data1" }] }, { type: "inline", content: [{ type: "text", content: "data2" }] }]],
					rowHeaderKey: "nonExistentKey", // References a key not in columns
					footer: null
				}
			},
			body: [{ type: "blockSlot", slotId: "table_1" }, { type: "paragraph", content: [{ type: "inlineSlot", slotId: "text_input" }] }],
			interactions: {
				text_input: {
					type: "textEntryInteraction",
					responseIdentifier: "text_response",
					expectedLength: null
				}
			},
			feedback: { correct: [], incorrect: [] }
		};

		const result = errors.trySync(() => compile(item));
		expect(result.error).toBeInstanceOf(Error);
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidRowHeaderKey)).toBe(true);
			expect(result.error.message).toContain("invalid dataTable rowHeaderKey");
		}
	});

	test("should not throw when rowHeaderKey is null in dataTable", () => {
		const item: AssessmentItemInput = {
			identifier: "null-row-header-key-table",
			title: "Null Row Header Key in Data Table",
			responseDeclarations: [{ identifier: "text_response", cardinality: "single", baseType: "string", correct: "test" }],
			widgets: {
				table_1: {
					type: "dataTable",
					title: null,
					columns: [
						{ key: "col1", label: [{ type: "text", content: "Column 1" }], isNumeric: false },
						{ key: "col2", label: [{ type: "text", content: "Column 2" }], isNumeric: false }
					],
					data: [[{ type: "inline", content: [{ type: "text", content: "data1" }] }, { type: "inline", content: [{ type: "text", content: "data2" }] }]],
					rowHeaderKey: null, // Null is allowed and should not throw
					footer: null
				}
			},
			body: [{ type: "blockSlot", slotId: "table_1" }, { type: "paragraph", content: [{ type: "inlineSlot", slotId: "text_input" }] }],
			interactions: {
				text_input: {
					type: "textEntryInteraction",
					responseIdentifier: "text_response",
					expectedLength: null
				}
			},
			feedback: { correct: [], incorrect: [] }
		};

		const result = errors.trySync(() => compile(item));
		expect(result.error).toBeUndefined(); // Should compile successfully
	});
})
