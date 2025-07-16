import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"

export const ingestAssessmentTests = inngest.createFunction(
	{ id: "ingest-assessment-tests", name: "Ingest QTI Assessment Tests" },
	{ event: "qti/assessment-tests.ingest" },
	async ({ event, logger }) => {
		const { tests } = event.data
		if (tests.length === 0) {
			logger.info("no assessment tests to ingest, skipping")
			return { status: "skipped", reason: "no_tests" }
		}

		logger.info("ingesting assessment tests", { count: tests.length })

		const results = []
		for (const test of tests) {
			const { identifier } = test
			// Try to update first (most common case)
			logger.debug("attempting to update assessment test", { identifier })
			const updateResult = await errors.try(qti.updateAssessmentTest(identifier, test))

			if (updateResult.error) {
				// Check if it's a 404 error - if so, create instead
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.info("assessment test not found, creating new", { identifier })
					const createResult = await errors.try(qti.createAssessmentTest(test))
					if (createResult.error) {
						logger.error("failed to create assessment test", { identifier, error: createResult.error })
						results.push({ identifier, success: false, status: "failed", error: createResult.error })
						continue
					}
					logger.info("successfully created assessment test", { identifier })
					results.push({ identifier, success: true, status: "created" })
				} else {
					// Other error - log and continue
					logger.error("failed to update assessment test", { identifier, error: updateResult.error })
					results.push({ identifier, success: false, status: "failed", error: updateResult.error })
				}
			} else {
				logger.info("successfully updated assessment test", { identifier })
				results.push({ identifier, success: true, status: "updated" })
			}
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment tests`)
		}

		return { status: "success", count: results.length, results }
	}
)
