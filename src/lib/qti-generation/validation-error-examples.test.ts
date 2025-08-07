import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { compile } from "./compiler"
import { allErrorExamples } from "./error-examples"

describe("QTI Validation Error Examples", () => {
	test("all error examples should fail compilation or validation", () => {
		const results = allErrorExamples.map((example) => {
			const result = errors.trySync(() => compile(example))
			return {
				identifier: example.identifier,
				failed: result.error !== null,
				error: result.error
			}
		})

		// Log results for debugging
		const failed = results.filter((r) => r.failed)
		const passed = results.filter((r) => !r.failed)

		logger.info("validation results", {
			failedAsExpected: failed.length,
			unexpectedlyPassed: passed.length
		})

		if (passed.length > 0) {
			logger.warn("examples unexpectedly passed", {
				count: passed.length
			})
			for (const p of passed) {
				logger.warn("unexpected pass", { identifier: p.identifier })
			}
		}

		if (failed.length > 0) {
			logger.debug("examples failed as expected", {
				count: failed.length
			})
			for (const f of failed) {
				logger.debug("expected failure", {
					identifier: f.identifier,
					error: f.error?.message.split("\n")[0]
				})
			}
		}

		// We expect all error examples to fail
		expect(failed.length).toBe(allErrorExamples.length)
		expect(passed.length).toBe(0)
	})
})
