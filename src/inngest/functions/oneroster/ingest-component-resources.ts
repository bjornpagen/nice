import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"

export const ingestComponentResources = inngest.createFunction(
	{ id: "ingest-component-resources", name: "Ingest OneRoster Component Resources" },
	{ event: "oneroster/component-resources.ingest" },
	async ({ event, step, logger }) => {
		const { componentResources } = event.data
		logger.info("starting component resource ingestion", { count: componentResources.length })

		if (componentResources.length === 0) {
			logger.info("no component resources to ingest, skipping")
			return { status: "skipped", reason: "no_component_resources" }
		}

		logger.info("ingesting component resources in parallel", { count: componentResources.length })

		// Process all component resources in parallel
		const stepPromises = componentResources.map((cr) =>
			step.run(`ingest-cr-${cr.sourcedId}`, async () => {
				logger.debug("upserting component resource", { sourcedId: cr.sourcedId })

				// Use PUT for upsert behavior
				const result = await errors.try(oneroster.updateComponentResource(cr.sourcedId, cr))
				if (result.error) {
					logger.error("failed to upsert component resource", {
						sourcedId: cr.sourcedId,
						error: result.error
					})
					throw result.error
				}
				logger.debug("successfully upserted component resource", { sourcedId: cr.sourcedId })
				return { sourcedId: cr.sourcedId, success: true, status: "upserted" }
			})
		)

		// Wait for all component resources to be processed
		const results = await Promise.all(stepPromises)

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
