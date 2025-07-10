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
				const existingResourceResult = await errors.try(oneroster.getResource(resource.sourcedId))
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
					const updateResult = await errors.try(oneroster.updateResource(resource.sourcedId, resourceWithoutId))
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
				const createResult = await errors.try(oneroster.createResource(resource))
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
