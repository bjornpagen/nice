import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { qti } from "@/lib/clients"
import { compile } from "./compiler"
import { allExamples } from "./examples"

// This test suite is an integration test. It requires a running QTI API
// and valid credentials configured in the environment variables.
// Its purpose is to provide a final guarantee that the XML produced by our compiler
// is fully compliant with the target QTI service.
describe("QTI Compiler API Validation", () => {
	test("should produce valid QTI XML for all examples that passes API validation", async () => {
		// Step 1: Compile all examples into QTI XML strings in parallel.
		// This compiles all examples at once, taking advantage of CPU parallelism.
		const compiledExamples = allExamples.map((example) => ({
			identifier: example.identifier,
			xml: compile(example)
		}))

		// Step 2: Validate all XML documents against the QTI API in parallel.
		// This sends all validation requests concurrently, dramatically reducing
		// total execution time when validating many examples.
		const validationPromises = compiledExamples.map(async ({ identifier, xml }) => {
			const validationResult = await qti.validateXml({
				xml: xml,
				schema: "item" // We are validating an AssessmentItem.
			})
			return { identifier, validationResult }
		})

		// Wait for all validations to complete
		const results = await Promise.all(validationPromises)

		// Step 3: Assert that all validations were successful.
		// Collect any failures for comprehensive error reporting.
		const failures = results.filter((r) => !r.validationResult.success)

		if (failures.length > 0) {
			const failureMessages = failures
				.map((f) => `${f.identifier}: ${f.validationResult.validationErrors.join(", ")}`)
				.join("\n")

			throw errors.new(`Validation failed for ${failures.length} example(s):\n${failureMessages}`)
		}

		// Also verify that no validation errors exist
		for (const { identifier, validationResult } of results) {
			expect(validationResult.validationErrors, `Unexpected validation errors for ${identifier}`).toBeEmpty()
		}
	})
})
