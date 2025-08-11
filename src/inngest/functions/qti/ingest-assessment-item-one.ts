import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { extractIdentifier } from "@/lib/xml-utils"

export const ingestAssessmentItemOne = inngest.createFunction(
	{
		id: "ingest-assessment-item-one",
		name: "Ingest One QTI Assessment Item",
		// Apply concurrency limits to avoid overwhelming the provider.
		concurrency: {
			limit: 200,
			// Serialize writes for the same item to prevent race conditions using provided identifier
			key: "event.data.identifier || null"
		},
		// Define a retry strategy for transient provider errors.
		retries: 3
	},
	{ event: "qti/assessment-item.ingest.one" },
	async ({ event, logger }) => {
		const { xml, metadata } = event.data
		// Prefer provided identifier; fallback to extracting
		const identifier = event.data.identifier || extractIdentifier(xml, "qti-assessment-item")
		if (!identifier) {
			logger.error("Could not extract identifier from item XML, skipping.", { xmlStart: xml.substring(0, 100) })
			// Returning successfully to prevent retries for malformed data.
			return { identifier: null, status: "failed_no_id" }
		}

		logger.info("Ingesting assessment item", { identifier })

		const payload = { identifier, xml, metadata }

		// Upsert logic: attempt to update, and if it's not found, create it.
		const updateResult = await errors.try(qti.updateAssessmentItem(payload))

		if (updateResult.error) {
			if (errors.is(updateResult.error, ErrQtiNotFound)) {
				logger.info("Item not found, creating new.", { identifier })
				const createResult = await errors.try(qti.createAssessmentItem(payload))
				if (createResult.error) {
					logger.error("Failed to create assessment item after 404 on update.", {
						identifier,
						error: createResult.error
					})
					throw createResult.error // Throw to trigger Inngest retry.
				}
				logger.info("Successfully created assessment item.", { identifier })
				return { identifier, status: "created" }
			}
			// For other errors (e.g., 5xx), throw to trigger Inngest retry.
			logger.error("Failed to update assessment item.", { identifier, error: updateResult.error })
			throw updateResult.error
		}

		logger.info("Successfully updated assessment item.", { identifier })
		return { identifier, status: "updated" }
	}
)
