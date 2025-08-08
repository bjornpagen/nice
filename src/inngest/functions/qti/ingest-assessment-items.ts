import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"

export const ingestAssessmentItems = inngest.createFunction(
	{
		id: "ingest-assessment-items",
		name: "Ingest QTI Assessment Items"
		// No concurrency limit - unlimited parallel processing!
	},
	{ event: "qti/assessment-items.ingest" },
	async ({ event, logger }) => {
		const { items } = event.data
		if (items.length === 0) {
			logger.info("no assessment items to ingest, skipping")
			return { status: "skipped", reason: "no_items" }
		}

		logger.info("ingesting assessment items", { count: items.length })

		const itemPromises = items.map(async (item) => {
			// REMOVED: The temporary fix is no longer needed here.
			// The upload function now trusts that the incoming XML is already valid.
			const processedXml = item.xml

			// Extract identifier from the root qti-assessment-item element using a robust regex.
			// This regex specifically targets the root tag to avoid matching identifiers from nested elements.
			// - `<qti-assessment-item` : Matches the opening of the root tag
			// - `(?:\s+[^>]*)` : Non-capturing group for attributes before identifier (optional)
			// - `\s+identifier=` : Matches whitespace and the identifier attribute
			// - `"([^"]+)"` : Captures the identifier value in group 1
			// - `[^>]*>` : Matches remaining attributes and closing >
			const idMatch = processedXml.match(/<qti-assessment-item(?:\s+[^>]*)?\s+identifier="([^"]+)"[^>]*>/)
			const identifier = idMatch?.[1] ?? null

			if (!identifier) {
				logger.error("could not extract identifier from item XML, skipping", {
					xmlStart: processedXml.substring(0, 100),
					hasQtiAssessmentItem: processedXml.includes("<qti-assessment-item")
				})
				return { success: false, status: "skipped_no_id" }
			}

			// Try to update first (most common case)
			logger.debug("attempting to update assessment item", { identifier })
			const updateResult = await errors.try(
				qti.updateAssessmentItem({ identifier, xml: processedXml, metadata: item.metadata })
			)

			if (updateResult.error) {
				// Check if it's a 404 error - if so, create instead
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.debug("assessment item not found, creating new", { identifier })
					const createResult = await errors.try(
						qti.createAssessmentItem({ xml: processedXml, metadata: item.metadata })
					)
					if (createResult.error) {
						logger.error("failed to create assessment item", { identifier, error: createResult.error })
						return { identifier, success: false, status: "failed", error: createResult.error }
					}
					logger.debug("successfully created assessment item", { identifier })
					return { identifier, success: true, status: "created" }
				}
				// Other error - log and continue
				logger.error("failed to update assessment item", { identifier, error: updateResult.error })
				return { identifier, success: false, status: "failed", error: updateResult.error }
			}
			logger.debug("successfully updated assessment item", { identifier })
			return { identifier, success: true, status: "updated" }
		})

		// Process all items in parallel
		const results = await Promise.all(itemPromises)

		const failedResults = results.filter((r) => !r.success)
		const failedCount = failedResults.length
		const createdCount = results.filter((r) => r.status === "created").length
		const updatedCount = results.filter((r) => r.status === "updated").length
		const skippedCount = results.filter((r) => r.status === "skipped_no_id").length

		if (failedCount > 0) {
			// Log detailed information about each failed item
			logger.error("assessment items ingestion failed", {
				failedCount,
				failedItems: failedResults.map((r) => ({
					identifier: r.identifier,
					status: r.status,
					error: r.error?.message || "unknown error"
				}))
			})

			// Include identifiers in the error message for easy debugging
			const failedIdentifiers = failedResults.map((r) => r.identifier).filter(Boolean)
			throw errors.new(`failed to ingest ${failedCount} assessment items: ${failedIdentifiers.join(", ")}`)
		}

		return {
			status: "success",
			count: results.length,
			created: createdCount,
			updated: updatedCount,
			skipped: skippedCount,
			failed: failedCount
		}
	}
)
