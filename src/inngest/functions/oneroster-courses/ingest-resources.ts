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

		// Optional: Add delay between requests (in milliseconds)
		const DELAY_BETWEEN_REQUESTS = 100 // Adjust as needed

		// Process resources sequentially to avoid rate limiting
		const results = []
		for (const [index, resource] of resources.entries()) {
			const result = await step.run(`ingest-resource-${resource.sourcedId}`, async () => {
				const existingResourceResult = await errors.try(client.getResource(resource.sourcedId))
				if (existingResourceResult.error) {
					logger.error("failed to check for existing resource", {
						sourcedId: resource.sourcedId,
						error: existingResourceResult.error
					})
					throw existingResourceResult.error
				}

				if (existingResourceResult.data) {
					// Resource exists, so update it
					logger.info("resource exists, attempting update", { sourcedId: resource.sourcedId })
					// Remove sourcedId from the payload as it's passed separately
					const { sourcedId: _sourcedId, ...resourceWithoutId } = resource
					const updateResult = await errors.try(client.updateResource(resource.sourcedId, resourceWithoutId))
					if (updateResult.error) {
						logger.error("failed to update resource", {
							sourcedId: resource.sourcedId,
							error: updateResult.error
						})
						throw updateResult.error
					}
					logger.debug("successfully updated resource", { sourcedId: resource.sourcedId })
					return { sourcedId: resource.sourcedId, success: true, status: "updated" }
				}

				// Resource does not exist, so create it
				logger.info("resource does not exist, attempting creation", { sourcedId: resource.sourcedId })
				// Keep the full resource payload INCLUDING sourcedId (as proven by curl test)
				logger.debug("resource payload for creation", { resource })
				const createResult = await errors.try(client.createResource(resource))
				if (createResult.error) {
					logger.error("failed to ingest resource", {
						sourcedId: resource.sourcedId,
						error: createResult.error
					})
					throw createResult.error
				}
				logger.debug("successfully ingested resource", { sourcedId: resource.sourcedId })
				return { sourcedId: resource.sourcedId, success: true, status: "created" }
			})

			results.push(result)

			// Add delay between requests (except after the last one)
			if (index < resources.length - 1 && DELAY_BETWEEN_REQUESTS > 0) {
				await step.sleep(`delay-after-${resource.sourcedId}`, DELAY_BETWEEN_REQUESTS)
			}

			// Log progress every 10 resources
			if ((index + 1) % 10 === 0) {
				logger.info("ingestion progress", {
					processed: index + 1,
					total: resources.length,
					percentage: Math.round(((index + 1) / resources.length) * 100)
				})
			}
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
