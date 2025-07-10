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
			const updateResult = await errors.try(qti.updateAssessmentTest(identifier, test))

			if (updateResult.error) {
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.info("test not found, creating new one", { identifier })
					const createResult = await errors.try(qti.createAssessmentTest(test))
					if (createResult.error) {
						logger.error("failed to create test after 404 on update", { identifier, error: createResult.error })
						throw createResult.error
					}
					results.push({ identifier, success: true, status: "created" })
				} else {
					logger.error("failed to update test", { identifier, error: updateResult.error })
					throw updateResult.error
				}
			} else {
				logger.info("successfully updated test", { identifier })
				results.push({ identifier, success: true, status: "updated" })
			}
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment tests`)
		}

		return { status: "success", count: results.length }
	}
)
