import { describe, expect, test } from "bun:test"
import { compileResponseDeclarations } from "@/lib/qti-generation/response-processor"
import type { AssessmentItem } from "@/lib/qti-generation/schemas"

describe("compileResponseDeclarations - algebraic whitespace normalization", () => {
	test("emits compact and spaced variants for algebraic strings", () => {
		const decls: AssessmentItem["responseDeclarations"] = [
			{
				identifier: "RESPONSE",
				cardinality: "single",
				baseType: "string",
				correct: "9(5e-3f)"
			}
		]

		const xml = compileResponseDeclarations(decls)
		// Should include original
		expect(xml).toContain("<qti-value>9(5e-3f)</qti-value>")
		// Should include spaced variant (spaces around operator only)
		expect(xml).toContain("<qti-value>9(5e - 3f)</qti-value>")
		// Should include compact variant even if input had spaces
		const spacedDecls: AssessmentItem["responseDeclarations"] = [
			{
				identifier: "RESPONSE",
				cardinality: "single",
				baseType: "string",
				correct: "9(5e - 3f)"
			}
		]
		const xml2 = compileResponseDeclarations(spacedDecls)
		expect(xml2).toContain("<qti-value>9(5e-3f)</qti-value>")
	})
})
