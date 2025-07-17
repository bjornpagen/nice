import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"

export const createAssessmentLineItems = inngest.createFunction(
	{ id: "create-assessment-line-items", name: "Create AssessmentLineItems for Resources" },
	{ event: "oneroster/line-items.create" },
	async ({ event, step, logger }) => {
		const { componentResources } = event.data

		logger.info("creating assessment line items", { count: componentResources.length })

		if (componentResources.length === 0) {
			return { status: "skipped", reason: "no_component_resources" }
		}

		const lineItemPromises = componentResources.map((cr) =>
			step.run(`create-line-item-for-${cr.sourcedId}`, async () => {
				const lineItemSourcedId = cr.resource.sourcedId // Use the resource's sourcedId directly

				const lineItemPayload = {
					sourcedId: lineItemSourcedId,
					title: `Progress for: ${cr.title}`,
					componentResource: {
						sourcedId: cr.sourcedId,
						type: "componentResource" as const
					},
					category: {
						sourcedId: "default-category",
						type: "category" as const
					}
				}

				const result = await errors.try(
					oneroster.putAssessmentLineItem(lineItemSourcedId, { assessmentLineItem: lineItemPayload })
				)
				if (result.error) {
					logger.error("failed to create/update assessment line item", {
						sourcedId: lineItemSourcedId,
						error: result.error
					})
					throw result.error
				}

				logger.info("successfully processed assessment line item", { sourcedId: lineItemSourcedId })
				return { sourcedId: lineItemSourcedId, success: true }
			})
		)

		const results = await Promise.all(lineItemPromises)
		const failedCount = results.filter((r) => !r.success).length

		if (failedCount > 0) {
			throw errors.new(`failed to create ${failedCount} assessment line items`)
		}

		logger.info("assessment line item creation complete", { successfulCount: results.length })
		return { status: "success", count: results.length }
	}
)
