import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"

export const ingestCourseComponents = inngest.createFunction(
	{ id: "ingest-course-components", name: "Ingest OneRoster Course Components" },
	{ event: "oneroster/course-components.ingest" },
	async ({ event, logger }) => {
		const { components } = event.data
		logger.info("starting course component ingestion", { count: components.length })

		if (components.length === 0) {
			logger.info("no course components to ingest, skipping")
			return { status: "skipped", reason: "no_components" }
		}

		logger.info("ingesting course components hierarchically", { count: components.length })

		type ComponentType = (typeof components)[0]
		const componentsByParent = new Map<string, ComponentType[]>()
		const rootComponents: ComponentType[] = []

		// Group components by parent ID
		for (const component of components) {
			const parentId = component.parent?.sourcedId
			if (parentId) {
				if (!componentsByParent.has(parentId)) {
					componentsByParent.set(parentId, [])
				}
				componentsByParent.get(parentId)?.push(component)
			} else {
				rootComponents.push(component)
			}
		}

		let componentsToIngest = rootComponents
		const ingestedIds = new Set<string>()

		while (componentsToIngest.length > 0) {
			logger.debug("ingesting component level", { count: componentsToIngest.length })
			const nextLevelComponents: ComponentType[] = []

			for (const component of componentsToIngest) {
				logger.debug("upserting component", { sourcedId: component.sourcedId })

				// Use PUT for upsert behavior
				const result = await errors.try(oneroster.updateCourseComponent(component.sourcedId, component))
				if (result.error) {
					logger.error("failed to upsert component", { sourcedId: component.sourcedId, error: result.error })
					throw result.error
				}
				logger.debug("upserted component", { sourcedId: component.sourcedId })

				ingestedIds.add(component.sourcedId)
				const children = componentsByParent.get(component.sourcedId)
				if (children) {
					nextLevelComponents.push(...children)
				}
			}
			componentsToIngest = nextLevelComponents
		}

		if (ingestedIds.size !== components.length) {
			logger.warn("mismatch in ingested components count", {
				expected: components.length,
				ingested: ingestedIds.size
			})
		}

		logger.info("successfully ingested all course components")
		return { status: "success", count: components.length }
	}
)
