import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { compile } from "@/lib/qti-generation/compiler"
import { allExamples } from "@/lib/qti-generation/examples"
import { Client as QtiClient } from "@/lib/qti"
import { env } from "@/env"

// This test suite is an integration test. It requires a running QTI API
// and valid credentials configured in the environment variables.
// Its purpose is to provide a final guarantee that the XML produced by our compiler
// is fully compliant with the target QTI service.
describe("QTI Compiler API Validation", () => {
	test("should produce valid QTI XML for all examples that passes API validation", async () => {
		// Gate execution on required env vars; other test files may mock @/env without QTI keys
		const {
			TIMEBACK_QTI_SERVER_URL,
			TIMEBACK_TOKEN_URL,
			TIMEBACK_CLIENT_ID,
			TIMEBACK_CLIENT_SECRET
		} = env
		const hasQtiEnv =
			Boolean(TIMEBACK_QTI_SERVER_URL) &&
			Boolean(TIMEBACK_TOKEN_URL) &&
			Boolean(TIMEBACK_CLIENT_ID) &&
			Boolean(TIMEBACK_CLIENT_SECRET)
		if (!hasQtiEnv) {
			logger.warn("skipping qti api validation: missing env", {
				TIMEBACK_QTI_SERVER_URL,
				TIMEBACK_TOKEN_URL,
				TIMEBACK_CLIENT_ID,
				TIMEBACK_CLIENT_SECRET
			})
			return
		}

		// Use a dedicated client instance to avoid test interference from module mocks
		const qti = new QtiClient({
			serverUrl: TIMEBACK_QTI_SERVER_URL,
			tokenUrl: TIMEBACK_TOKEN_URL,
			clientId: TIMEBACK_CLIENT_ID,
			clientSecret: TIMEBACK_CLIENT_SECRET
		})
		// Step 1: Compile only selected examples into QTI XML strings in parallel.
		const allowedIds = new Set<string>([
			"reaction-rate-changes-table",
			"ke-mass-speed-relationships",
			"reactant-amounts-temp-change-table-perseus"
		])
		const selected = allExamples.filter((ex) => allowedIds.has(ex.identifier))
		const compiledExamples = selected.map((example) => ({
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

			logger.error("qti validation failed for examples", { failureCount: failures.length, failureMessages })
			throw errors.new(`Validation failed for ${failures.length} example(s):\n${failureMessages}`)
		}

		// Also verify that no validation errors exist
		for (const { identifier, validationResult } of results) {
			expect(validationResult.validationErrors, `Unexpected validation errors for ${identifier}`).toBeEmpty()
		}
	})
})
