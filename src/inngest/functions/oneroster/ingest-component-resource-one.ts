import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ErrOneRosterNotFound } from "@/lib/oneroster"
import type { ComponentResource } from "@/lib/oneroster"

export const ingestComponentResourceOne = inngest.createFunction(
	{
		id: "ingest-component-resource-one",
		name: "Ingest One OneRoster Component Resource"
	},
	{ event: "oneroster/component-resource.ingest.one" },
	async ({ event, logger }) => {
		const { courseSlug, sourcedId } = event.data
		logger.info("starting single component-resource ingestion", { sourcedId, courseSlug })

		const filePath = path.join(process.cwd(), "data", courseSlug, "oneroster", "componentResources.json")
		const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
		if (readResult.error) {
			logger.error("failed to read component-resources file", { file: filePath, error: readResult.error })
			throw errors.wrap(readResult.error, "file read")
		}
		const parseResult = errors.trySync(() => JSON.parse(readResult.data) as Array<ComponentResource>)
		if (parseResult.error) {
			logger.error("failed to parse component-resources file", { file: filePath, error: parseResult.error })
			throw errors.wrap(parseResult.error, "json parse")
		}
		const allComponentResources = parseResult.data
		const componentResource = allComponentResources.find((cr) => cr.sourcedId === sourcedId)

		if (!componentResource) {
			logger.error("component-resource not found in payload file", { sourcedId, file: filePath })
			throw errors.new(`component-resource ${sourcedId} not found in ${filePath}`)
		}

		const result = await errors.try(oneroster.updateComponentResource(sourcedId, componentResource))
		if (result.error) {
			if (errors.is(result.error, ErrOneRosterNotFound)) {
				logger.info("component-resource not found, creating new", { sourcedId })
				const createResult = await errors.try(oneroster.createComponentResource(componentResource))
				if (createResult.error) {
					logger.error("failed to create component-resource", { sourcedId, error: createResult.error })
					throw createResult.error
				}
				logger.info("successfully created component-resource", { sourcedId })
				return { sourcedId, status: "created" }
			}
			logger.error("failed to upsert component-resource", { sourcedId, error: result.error })
			throw result.error
		}

		logger.info("successfully upserted component-resource", { sourcedId })
		return { sourcedId, status: "upserted" }
	}
)
