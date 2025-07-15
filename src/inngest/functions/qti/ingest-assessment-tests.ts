import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"

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
			// Use PUT for upsert behavior
			logger.debug("upserting assessment test", { identifier })
			const result = await errors.try(qti.updateAssessmentTest(identifier, test))
			if (result.error) {
				logger.error("failed to upsert test", { identifier, error: result.error })
				throw result.error
			}
			logger.info("successfully upserted test", { identifier })
			results.push({ identifier, success: true, status: "upserted" })
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment tests`)
		}

		return { status: "success", count: results.length }
	}
)
