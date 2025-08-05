import { describe, expect, test } from "bun:test"
import { Client as QtiClient } from "@/lib/qti"
import { compile } from "./compiler"
import { allExamples } from "./examples"

// Load environment variables manually for testing
if (!process.env.NEXT_RUNTIME && typeof window === "undefined") {
	const { loadEnvConfig } = require("@next/env")
	const projectDir = process.cwd()
	loadEnvConfig(projectDir)
}

// Create QTI client instance for integration testing
const qti = new QtiClient({
	serverUrl: process.env.TIMEBACK_QTI_SERVER_URL ?? "",
	tokenUrl: process.env.TIMEBACK_TOKEN_URL ?? "",
	clientId: process.env.TIMEBACK_CLIENT_ID ?? "",
	clientSecret: process.env.TIMEBACK_CLIENT_SECRET ?? ""
})

// This test suite is an integration test. It requires a running QTI API
// and valid credentials configured in the environment variables.
// Its purpose is to provide a final guarantee that the XML produced by our compiler
// is fully compliant with the target QTI service.
describe("QTI Compiler API Validation", () => {
	// Dynamically generate a test for each example in our test suite.
	for (const example of allExamples) {
		test(`should produce valid QTI XML for '${example.identifier}' that passes API validation`, async () => {
			// Step 1: Compile the example JSON into a QTI XML string.
			const compiledXml = compile(example)

			// Step 2: Use the QTI client to call the validation endpoint.
			// The validateXml method sends the XML to the API and returns a structured response.
			const validationResult = await qti.validateXml({
				xml: compiledXml,
				schema: "item" // We are validating an AssessmentItem.
			})

			// Step 3: Assert that the validation was successful.
			// If validationResult.success is false, the assertion will fail, and the
			// validationErrors array will be included in the test failure message,
			// providing immediate insight into what is wrong with the generated XML.
			expect(
				validationResult.success,
				`Validation failed for '${example.identifier}' with errors: ${validationResult.validationErrors.join(", ")}`
			).toBe(true)

			// Also assert that the validationErrors array is empty for clarity.
			expect(validationResult.validationErrors).toBeEmpty()
		})
	}
})
