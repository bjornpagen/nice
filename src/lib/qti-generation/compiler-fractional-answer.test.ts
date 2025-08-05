import { describe, expect, it } from "bun:test"
import { compile } from "./compiler"
import type { AssessmentItemInput } from "./schemas"

describe("QTI Compiler - Fractional Answer Equivalency", () => {
	it("should include decimal equivalents of fractional answers in correct-response block", () => {
		const assessmentItem: AssessmentItemInput = {
			identifier: "mean-from-bar-chart",
			title: "Mean from Bar Chart",
			body: '<p>What is the mean of the values shown in the bar chart?</p><slot name="text_entry" />',
			interactions: {
				text_entry: {
					type: "textEntryInteraction",
					responseIdentifier: "answer",
					expectedLength: 10
				}
			},
			responseDeclarations: [
				{
					identifier: "answer",
					cardinality: "single",
					baseType: "string",
					correct: "21/2",
					mapping: null
				}
			],
			widgets: null,
			feedback: {
				correct: "<p>Correct!</p>",
				incorrect: "<p>Incorrect.</p>"
			}
		}

		const result = compile(assessmentItem)

		// Verify the XML contains all expected values in qti-correct-response
		expect(result).toContain("<qti-value>21/2</qti-value>")
		expect(result).toContain("<qti-value>10.5</qti-value>")

		// Verify the mapping also contains these values
		expect(result).toContain('map-key="10.5"')

		// Verify the structure is correct (order might vary due to Set iteration)
		expect(result).toMatch(/<qti-correct-response>[\s\S]*<qti-value>21\/2<\/qti-value>[\s\S]*<\/qti-correct-response>/)
		expect(result).toMatch(/<qti-correct-response>[\s\S]*<qti-value>10\.5<\/qti-value>[\s\S]*<\/qti-correct-response>/)
	})

	it("should include leading zero variations for fractions that produce decimals starting with 0", () => {
		const assessmentItem: AssessmentItemInput = {
			identifier: "fraction-with-leading-zero",
			title: "Fraction with Leading Zero",
			body: '<p>Enter the value</p><slot name="text_entry" />',
			interactions: {
				text_entry: {
					type: "textEntryInteraction",
					responseIdentifier: "answer",
					expectedLength: 10
				}
			},
			responseDeclarations: [
				{
					identifier: "answer",
					cardinality: "single",
					baseType: "string",
					correct: "1/2",
					mapping: null
				}
			],
			widgets: null,
			feedback: {
				correct: "<p>Correct!</p>",
				incorrect: "<p>Incorrect.</p>"
			}
		}

		const result = compile(assessmentItem)

		// Should include fraction and both decimal forms
		expect(result).toContain("<qti-value>1/2</qti-value>")
		expect(result).toContain("<qti-value>0.5</qti-value>")
		expect(result).toContain("<qti-value>.5</qti-value>")

		// Verify mapping contains the decimal forms
		expect(result).toContain('map-key="0.5"')
		expect(result).toContain('map-key=".5"')
	})

	it("should handle leading zero variations for decimal answers", () => {
		const assessmentItem: AssessmentItemInput = {
			identifier: "decimal-test",
			title: "Decimal Test",
			body: '<p>Enter the decimal value</p><slot name="text_entry" />',
			interactions: {
				text_entry: {
					type: "textEntryInteraction",
					responseIdentifier: "answer",
					expectedLength: 10
				}
			},
			responseDeclarations: [
				{
					identifier: "answer",
					cardinality: "single",
					baseType: "string",
					correct: "0.5",
					mapping: null
				}
			],
			widgets: null,
			feedback: {
				correct: "<p>Correct!</p>",
				incorrect: "<p>Incorrect.</p>"
			}
		}

		const result = compile(assessmentItem)

		// Should include both 0.5 and .5 as correct answers
		expect(result).toContain("<qti-value>0.5</qti-value>")
		expect(result).toContain("<qti-value>.5</qti-value>")
	})

	it("should handle fractions that convert to terminating decimals", () => {
		const assessmentItem: AssessmentItemInput = {
			identifier: "fraction-test",
			title: "Fraction Test",
			body: '<p>Enter the value</p><slot name="text_entry" />',
			interactions: {
				text_entry: {
					type: "textEntryInteraction",
					responseIdentifier: "answer",
					expectedLength: 10
				}
			},
			responseDeclarations: [
				{
					identifier: "answer",
					cardinality: "single",
					baseType: "string",
					correct: "3/4",
					mapping: null
				}
			],
			widgets: null,
			feedback: {
				correct: "<p>Correct!</p>",
				incorrect: "<p>Incorrect.</p>"
			}
		}

		const result = compile(assessmentItem)

		// Should include fraction and its decimal equivalent
		expect(result).toContain("<qti-value>3/4</qti-value>")
		expect(result).toContain("<qti-value>0.75</qti-value>")
		expect(result).toContain("<qti-value>.75</qti-value>")
	})

	it("should NOT include decimal equivalents for non-terminating fractions", () => {
		const assessmentItem: AssessmentItemInput = {
			identifier: "non-terminating-test",
			title: "Non-terminating Test",
			body: '<p>Enter the value</p><slot name="text_entry" />',
			interactions: {
				text_entry: {
					type: "textEntryInteraction",
					responseIdentifier: "answer",
					expectedLength: 10
				}
			},
			responseDeclarations: [
				{
					identifier: "answer",
					cardinality: "single",
					baseType: "string",
					correct: "1/3",
					mapping: null
				}
			],
			widgets: null,
			feedback: {
				correct: "<p>Correct!</p>",
				incorrect: "<p>Incorrect.</p>"
			}
		}

		const result = compile(assessmentItem)

		// Should only include the fraction, not its decimal form
		expect(result).toContain("<qti-value>1/3</qti-value>")
		expect(result).not.toContain("0.333")
		expect(result).not.toContain(".333")
	})
})
