import { describe, expect, test } from "bun:test"
import { compile } from "./compiler"
import { allExamples } from "./examples"

describe("QTI Compiler", () => {
	// Dynamic tests generated from unified examples
	for (const example of allExamples) {
		test(`should correctly compile ${example.identifier}`, () => {
			const compiledXml = compile(example)
			expect(compiledXml).toMatchSnapshot()
			expect(compiledXml).toContain(`identifier="${example.identifier}"`)
		})
	}
})
