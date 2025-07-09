import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { OneRosterApiClient } from "@/lib/oneroster-client"

export const ingestComponentResources = inngest.createFunction(
	{ id: "ingest-component-resources", name: "Ingest OneRoster Component Resources" },
	{ event: "oneroster/component-resources.ingest" },
	async ({ event, step, logger }) => {
		const { componentResources } = event.data
		if (componentResources.length === 0) {
			logger.info("no component resources to ingest, skipping")
			return { status: "skipped", reason: "no_component_resources" }
		}

		logger.info("ingesting component resources", { count: componentResources.length })
		const client = new OneRosterApiClient()

		// Optional: Add delay between requests (in milliseconds)
		const DELAY_BETWEEN_REQUESTS = 100 // Adjust as needed

		// Process component resources sequentially to avoid rate limiting
		const results = []
		for (const [index, cr] of componentResources.entries()) {
			const result = await step.run(`ingest-cr-${cr.sourcedId}`, async () => {
				const existingCrResult = await errors.try(client.getComponentResource(cr.sourcedId))
				if (existingCrResult.error) {
					logger.error("failed to check for existing component resource", {
						sourcedId: cr.sourcedId,
						error: existingCrResult.error
					})
					throw existingCrResult.error
				}

				if (existingCrResult.data) {
					logger.info("component resource already exists, updating", { sourcedId: cr.sourcedId })
					const updateResult = await errors.try(client.updateComponentResource(cr.sourcedId, cr))
					if (updateResult.error) {
						logger.error("failed to update component resource", {
							sourcedId: cr.sourcedId,
							error: updateResult.error
						})
						throw updateResult.error
					}
					logger.debug("successfully updated component resource", { sourcedId: cr.sourcedId })
					return { sourcedId: cr.sourcedId, success: true, status: "updated" }
				}
				const createResult = await errors.try(client.createComponentResource(cr))
				if (createResult.error) {
					logger.error("failed to ingest component resource", { sourcedId: cr.sourcedId, error: createResult.error })
					throw createResult.error
				}
				logger.debug("successfully ingested component resource", { sourcedId: cr.sourcedId })
				return { sourcedId: cr.sourcedId, success: true, status: "created" }
			})

			results.push(result)

			// Add delay between requests (except after the last one)
			if (index < componentResources.length - 1 && DELAY_BETWEEN_REQUESTS > 0) {
				await step.sleep(`delay-after-${cr.sourcedId}`, DELAY_BETWEEN_REQUESTS)
			}
		}

		const failedCount = results.filter((r) => !r.success).length
		const createdCount = results.filter((r) => r.status === "created").length
		const updatedCount = results.filter((r) => r.status === "updated").length

		logger.info("component resource ingestion complete", {
			total: results.length,
			created: createdCount,
			updated: updatedCount,
			failed: failedCount
		})

		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} component resources`)
		}

		return { status: "success", count: results.length, created: createdCount, updated: updatedCount }
	}
)
