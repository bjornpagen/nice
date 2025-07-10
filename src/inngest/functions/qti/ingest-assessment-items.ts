import * as errors from "@superbuilders/errors"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import { ErrQtiNotFound, QtiApiClient } from "@/lib/qti"

export const ingestAssessmentItems = inngest.createFunction(
	{ id: "ingest-assessment-items", name: "Ingest QTI Assessment Items" },
	{ event: "qti/assessment-items.ingest" },
	async ({ event, logger }) => {
		const { items } = event.data
		if (items.length === 0) {
			logger.info("no assessment items to ingest, skipping")
			return { status: "skipped", reason: "no_items" }
		}

		logger.info("ingesting assessment items", { count: items.length })
		const client = new QtiApiClient({
			serverUrl: env.TIMEBACK_QTI_SERVER_URL,
			tokenUrl: env.TIMEBACK_TOKEN_URL,
			clientId: env.TIMEBACK_CLIENT_ID,
			clientSecret: env.TIMEBACK_CLIENT_SECRET
		})

		const results = []
		for (const item of items) {
			// Extract identifier from XML. A more robust regex might be needed for complex cases.
			const idMatch = item.xml.match(/identifier="([^"]+)"/)
			const identifier = idMatch ? idMatch[1] : null

			if (!identifier) {
				logger.error("could not extract identifier from item XML, skipping", { xmlStart: item.xml.substring(0, 100) })
				results.push({ success: false, status: "skipped_no_id" })
				continue
			}

			// Execute upsert logic directly without step.run wrapper
			const updateResult = await errors.try(client.updateAssessmentItem({ identifier, xml: item.xml }))

			if (updateResult.error) {
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.info("item not found, creating new one", { identifier })
					const createResult = await errors.try(client.createAssessmentItem({ xml: item.xml }))
					if (createResult.error) {
						logger.error("failed to create item after 404 on update", { identifier, error: createResult.error })
						throw createResult.error
					}
					results.push({ identifier, success: true, status: "created" })
				} else {
					logger.error("failed to update item", { identifier, error: updateResult.error })
					throw updateResult.error
				}
			} else {
				logger.info("successfully updated item", { identifier })
				results.push({ identifier, success: true, status: "updated" })
			}
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment items`)
		}

		return { status: "success", count: results.length }
	}
)
