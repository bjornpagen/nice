import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import type { Resource } from "@/lib/oneroster"
import { ErrOneRosterNotFound } from "@/lib/oneroster"
import { ONEROSTER_CONCURRENCY_KEY, ONEROSTER_CONCURRENCY_LIMIT } from "@/lib/constants/oneroster"

export const ingestResourceOne = inngest.createFunction(
	{
		id: "ingest-resource-one",
		name: "Ingest One OneRoster Resource",
		concurrency: { limit: ONEROSTER_CONCURRENCY_LIMIT, key: ONEROSTER_CONCURRENCY_KEY },
		retries: 3
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
		const parseResult = errors.trySync(() => JSON.parse(readResult.data))
		if (parseResult.error) {
			logger.error("failed to parse resources file", { file: filePath, error: parseResult.error })
			throw errors.wrap(parseResult.error, "json parse")
		}
		const arrayData: unknown[] = Array.isArray(parseResult.data) ? parseResult.data : []
		const ResourceFileSchema = z.object({
			sourcedId: z.string(),
			status: z.string(),
			title: z.string(),
			format: z.string().optional(),
			vendorResourceId: z.string(),
			vendorId: z.string().nullable().optional(),
			applicationId: z.string().nullable().optional(),
			roles: z.array(z.string()).optional(),
			importance: z.string().optional(),
			metadata: z.record(z.string(), z.unknown()).optional()
		})
		function isResource(entry: unknown): entry is Resource {
			const result = ResourceFileSchema.safeParse(entry)
			return result.success
		}
		let resource: Resource | undefined
		for (const entry of arrayData) {
			if (isResource(entry) && entry.sourcedId === sourcedId) {
				resource = entry
				break
			}
		}

	if (!resource) {
		logger.error("resource not found in payload file", { sourcedId, file: filePath })
		throw errors.new(`resource ${sourcedId} not found in ${filePath}`)
	}

	// Try PUT for upsert behavior (backwards compatibility)
		const updateResult = await errors.try(oneroster.updateResource(sourcedId, resource))
		if (updateResult.error) {
			// Check if it's a 404 (not found) or 500 (server error)
			const is404 = errors.is(updateResult.error, ErrOneRosterNotFound)
			const errorMessage = updateResult.error.message || ""
			const is500 = errorMessage.includes("status 500")

			if (is404 || is500) {
				logger.info("PUT failed, attempting POST", {
					sourcedId,
					reason: is404 ? "not found (404)" : "server error (500)"
				})
				const createResult = await errors.try(oneroster.createResource(resource))
				if (createResult.error) {
					logger.error("failed to create resource via POST", { sourcedId, error: createResult.error })
					throw createResult.error
				}
				logger.info("successfully created resource", { sourcedId })
				return { sourcedId, status: "created" }
			}

			// Some other error - throw it
			logger.error("failed to upsert resource", { sourcedId, error: updateResult.error })
			throw updateResult.error
		}

		logger.info("successfully upserted resource via PUT", { sourcedId })
		return { sourcedId, status: "upserted" }
	}
)
