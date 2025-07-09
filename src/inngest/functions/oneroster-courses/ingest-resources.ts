import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { OneRosterApiClient } from "@/lib/oneroster-client"

export const ingestResources = inngest.createFunction(
	{ id: "ingest-resources", name: "Ingest OneRoster Resources" },
	{ event: "oneroster/resources.ingest" },
	async ({ event, step, logger }) => {
		const { resources } = event.data
		if (resources.length === 0) {
			logger.info("no resources to ingest, skipping")
			return { status: "skipped", reason: "no_resources" }
		}

		logger.info("ingesting or updating resources", { count: resources.length })
		const client = new OneRosterApiClient()

		const BATCH_SIZE = 30
		const results = []

		// Process resources in batches
		for (let batchStart = 0; batchStart < resources.length; batchStart += BATCH_SIZE) {
			const batchEnd = Math.min(batchStart + BATCH_SIZE, resources.length)
			const batch = resources.slice(batchStart, batchEnd)
			const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1
			const totalBatches = Math.ceil(resources.length / BATCH_SIZE)

			logger.info("processing batch", {
				batchNumber,
				totalBatches,
				batchSize: batch.length,
				resourcesInBatch: batch.map((r) => r.sourcedId)
			})

			// Process all resources in the current batch in parallel
			const batchResults = await step.run(`process-batch-${batchNumber}`, async () => {
				const batchPromises = batch.map(async (resource) => {
					const existingResourceResult = await errors.try(client.getResource(resource.sourcedId))
					if (existingResourceResult.error) {
						logger.error("failed to check for existing resource", {
							sourcedId: resource.sourcedId,
							error: existingResourceResult.error
						})
						return {
							sourcedId: resource.sourcedId,
							success: false,
							status: "failed",
							error: existingResourceResult.error
						}
					}

					if (existingResourceResult.data) {
						// Resource exists, so update it
						logger.info("resource exists, attempting update", { sourcedId: resource.sourcedId })
						// Remove sourcedId from the payload as it's passed separately
						const { sourcedId: _sourcedId, ...resourceWithoutId } = resource
						const updateResult = await errors.try(client.updateResource(resource.sourcedId, resourceWithoutId))
						if (updateResult.error) {
							logger.error("failed to update resource", { sourcedId: resource.sourcedId, error: updateResult.error })
							return { sourcedId: resource.sourcedId, success: false, status: "failed", error: updateResult.error }
						}
						logger.debug("successfully updated resource", { sourcedId: resource.sourcedId })
						return { sourcedId: resource.sourcedId, success: true, status: "updated" }
					}
					// Resource does not exist, so create it
					logger.info("resource does not exist, attempting creation", { sourcedId: resource.sourcedId })
					// Remove sourcedId from the payload as the API might not accept it in create requests
					const { sourcedId: _sourcedId, ...resourceWithoutId } = resource
					logger.debug("resource payload for creation", { resource: resourceWithoutId })
					const createResult = await errors.try(client.createResource(resourceWithoutId))
					if (createResult.error) {
						logger.error("failed to ingest resource", { sourcedId: resource.sourcedId, error: createResult.error })
						return { sourcedId: resource.sourcedId, success: false, status: "failed", error: createResult.error }
					}
					logger.debug("successfully ingested resource", { sourcedId: resource.sourcedId })
					return { sourcedId: resource.sourcedId, success: true, status: "created" }
				})

				// Wait for all resources in the batch to complete
				return await Promise.all(batchPromises)
			})

			results.push(...batchResults)

			logger.info("completed batch", {
				batchNumber,
				totalBatches,
				created: batchResults.filter((r) => r.status === "created").length,
				updated: batchResults.filter((r) => r.status === "updated").length,
				failed: batchResults.filter((r) => !r.success).length
			})
		}

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
