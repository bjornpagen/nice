import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { ErrQtiNotFound, QtiApiClient } from "@/lib/qti"

export const ingestAssessmentTests = inngest.createFunction(
	{ id: "ingest-assessment-tests", name: "Ingest QTI Assessment Tests" },
	{ event: "qti/assessment-tests.ingest" },
	async ({ event, step, logger }) => {
		const { tests } = event.data
		if (tests.length === 0) {
			logger.info("no assessment tests to ingest, skipping")
			return { status: "skipped", reason: "no_tests" }
		}

		logger.info("ingesting assessment tests", { count: tests.length })
		const client = new QtiApiClient()

		const results = []
		for (const test of tests) {
			const { identifier } = test
			const result = await step.run(`upsert-test-${identifier}`, async () => {
				const updateResult = await errors.try(client.updateAssessmentTest(identifier, test))

				if (updateResult.error) {
					if (errors.is(updateResult.error, ErrQtiNotFound)) {
						logger.info("test not found, creating new one", { identifier })
						const createResult = await errors.try(client.createAssessmentTest(test))
						if (createResult.error) {
							logger.error("failed to create test after 404 on update", { identifier, error: createResult.error })
							throw createResult.error
						}
						return { identifier, success: true, status: "created" }
					}
					logger.error("failed to update test", { identifier, error: updateResult.error })
					throw updateResult.error
				}
				logger.info("successfully updated test", { identifier })
				return { identifier, success: true, status: "updated" }
			})
			results.push(result)
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment tests`)
		}

		return { status: "success", count: results.length }
	}
)
