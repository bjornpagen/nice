import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"

export const ingestResources = inngest.createFunction(
	{ id: "ingest-resources", name: "Ingest OneRoster Resources" },
	{ event: "oneroster/resources.ingest" },
	async ({ event, step, logger }) => {
		const { resources } = event.data
		logger.info("starting resource ingestion", { count: resources.length })

		if (resources.length === 0) {
			logger.info("no resources to ingest, skipping")
			return { status: "skipped", reason: "no_resources" }
		}

		logger.info("ingesting or updating resources in parallel", { count: resources.length })

		// Process all resources in parallel
		const stepPromises = resources.map((resource) =>
			step.run(`ingest-resource-${resource.sourcedId}`, async () => {
				logger.debug("upserting resource", { sourcedId: resource.sourcedId, resource })

				// Remove sourcedId from the payload as it's passed separately
				const { sourcedId: _sourcedId, ...resourceWithoutId } = resource

				// Use PUT for upsert behavior
				const result = await errors.try(oneroster.updateResource(resource.sourcedId, resourceWithoutId))
				if (result.error) {
					logger.error("failed to upsert resource", {
						sourcedId: resource.sourcedId,
						error: result.error
					})
					throw result.error
				}
				logger.debug("successfully upserted resource", { sourcedId: resource.sourcedId })
				return { sourcedId: resource.sourcedId, success: true, status: "upserted" }
			})
		)

		// Wait for all resources to be processed
		const results = await Promise.all(stepPromises)

		const failedCount = results.filter((r) => !r.success).length
		const createdCount = results.filter((r) => r.status === "created").length
		const updatedCount = results.filter((r) => r.status === "updated").length

		logger.info("resource ingestion complete", {
			total: results.length,
			created: createdCount,
			updated: updatedCount,
			failed: failedCount
		})

		if (failedCount > 0) {
			throw errors.new(`failed to ingest or update ${failedCount} resources`)
		}

		return { status: "success", count: results.length, created: createdCount, updated: updatedCount }
	}
)
