import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"

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

		const results = []
		for (const item of items) {
			// Extract identifier from the root qti-assessment-item element using a robust regex.
			// This regex specifically targets the root tag to avoid matching identifiers from nested elements.
			// - `<qti-assessment-item` : Matches the opening of the root tag
			// - `(?:\s+[^>]*)` : Non-capturing group for attributes before identifier (optional)
			// - `\s+identifier=` : Matches whitespace and the identifier attribute
			// - `"([^"]+)"` : Captures the identifier value in group 1
			// - `[^>]*>` : Matches remaining attributes and closing >
			const idMatch = item.xml.match(/<qti-assessment-item(?:\s+[^>]*)?\s+identifier="([^"]+)"[^>]*>/)
			const identifier = idMatch?.[1] ?? null

			if (!identifier) {
				logger.error("could not extract identifier from item XML, skipping", {
					xmlStart: item.xml.substring(0, 100),
					hasQtiAssessmentItem: item.xml.includes("<qti-assessment-item")
				})
				results.push({ success: false, status: "skipped_no_id" })
				continue
			}

			// Try to update first (most common case)
			logger.debug("attempting to update assessment item", { identifier })
			const updateResult = await errors.try(
				qti.updateAssessmentItem({ identifier, xml: item.xml, metadata: item.metadata })
			)

			if (updateResult.error) {
				// Check if it's a 404 error - if so, create instead
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.info("assessment item not found, creating new", { identifier })
					const createResult = await errors.try(qti.createAssessmentItem({ xml: item.xml, metadata: item.metadata }))
					if (createResult.error) {
						logger.error("failed to create assessment item", { identifier, error: createResult.error })
						results.push({ identifier, success: false, status: "failed", error: createResult.error })
						continue
					}
					logger.info("successfully created assessment item", { identifier })
					results.push({ identifier, success: true, status: "created" })
				} else {
					// Other error - log and continue
					logger.error("failed to update assessment item", { identifier, error: updateResult.error })
					results.push({ identifier, success: false, status: "failed", error: updateResult.error })
				}
			} else {
				logger.info("successfully updated assessment item", { identifier })
				results.push({ identifier, success: true, status: "updated" })
			}
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment items`)
		}

		return { status: "success", count: results.length, results }
	}
)
