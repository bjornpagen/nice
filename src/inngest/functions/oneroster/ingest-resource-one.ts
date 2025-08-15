import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ErrOneRosterNotFound } from "@/lib/oneroster"
import type { Resource } from "@/lib/oneroster"

export const ingestResourceOne = inngest.createFunction(
	{
		id: "ingest-resource-one",
		name: "Ingest One OneRoster Resource"
	},
	{ event: "oneroster/resource.ingest.one" },
	async ({ event, logger }) => {
		const { courseSlug, sourcedId } = event.data
		logger.info("starting single resource ingestion", { sourcedId, courseSlug })

		// Load all resources from the course's JSON file to find the target one.
		const filePath = path.join(process.cwd(), "data", courseSlug, "oneroster", "resources.json")
		const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
		if (readResult.error) {
			logger.error("failed to read resources file", { file: filePath, error: readResult.error })
			throw errors.wrap(readResult.error, "file read")
		}
		const parseResult = errors.trySync(() => JSON.parse(readResult.data) as Array<Resource>)
		if (parseResult.error) {
			logger.error("failed to parse resources file", { file: filePath, error: parseResult.error })
			throw errors.wrap(parseResult.error, "json parse")
		}
		const allResources = parseResult.data
		const resource = allResources.find((r) => r.sourcedId === sourcedId)

		if (!resource) {
			logger.error("resource not found in payload file", { sourcedId, file: filePath })
			throw errors.new(`resource ${sourcedId} not found in ${filePath}`)
		}

		// Use PUT for upsert behavior, falling back to POST on a 404.
		const result = await errors.try(oneroster.updateResource(sourcedId, resource))
		if (result.error) {
			if (errors.is(result.error, ErrOneRosterNotFound)) {
				logger.info("resource not found, creating new", { sourcedId })
				const createResult = await errors.try(oneroster.createResource(resource))
				if (createResult.error) {
					logger.error("failed to create resource", { sourcedId, error: createResult.error })
					throw createResult.error // Allow Inngest to retry
				}
				logger.info("successfully created resource", { sourcedId })
				return { sourcedId, status: "created" }
			}
			logger.error("failed to upsert resource", { sourcedId, error: result.error })
			throw result.error // Allow Inngest to retry
		}

		logger.info("successfully upserted resource", { sourcedId })
		return { sourcedId, status: "upserted" }
	}
)
