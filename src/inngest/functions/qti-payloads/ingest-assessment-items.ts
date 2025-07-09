import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { ErrQtiNotFound, QtiApiClient } from "@/lib/qti"

export const ingestAssessmentItems = inngest.createFunction(
	{ id: "ingest-assessment-items", name: "Ingest QTI Assessment Items" },
	{ event: "qti/assessment-items.ingest" },
	async ({ event, step, logger }) => {
		const { items } = event.data
		if (items.length === 0) {
			logger.info("no assessment items to ingest, skipping")
			return { status: "skipped", reason: "no_items" }
		}

		logger.info("ingesting assessment items", { count: items.length })
		const client = new QtiApiClient()

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

			const result = await step.run(`upsert-item-${identifier}`, async () => {
				const updateResult = await errors.try(client.updateAssessmentItem({ identifier, xml: item.xml }))

				if (updateResult.error) {
					if (errors.is(updateResult.error, ErrQtiNotFound)) {
						logger.info("item not found, creating new one", { identifier })
						const createResult = await errors.try(client.createAssessmentItem({ xml: item.xml }))
						if (createResult.error) {
							logger.error("failed to create item after 404 on update", { identifier, error: createResult.error })
							throw createResult.error
						}
						return { identifier, success: true, status: "created" }
					}
					logger.error("failed to update item", { identifier, error: updateResult.error })
					throw updateResult.error
				}
				logger.info("successfully updated item", { identifier })
				return { identifier, success: true, status: "updated" }
			})
			results.push(result)
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment items`)
		}

		return { status: "success", count: results.length }
	}
)
