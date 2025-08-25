import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ErrOneRosterNotFound } from "@/lib/oneroster"
import { ONEROSTER_CONCURRENCY_KEY, ONEROSTER_CONCURRENCY_LIMIT } from "@/lib/constants/oneroster"

export const ingestCourse = inngest.createFunction(
	{
		id: "ingest-course",
		name: "Ingest OneRoster Course",
		concurrency: { limit: ONEROSTER_CONCURRENCY_LIMIT, key: ONEROSTER_CONCURRENCY_KEY }
	},
	{ event: "oneroster/course.ingest.one" },
	async ({ event, step, logger }) => {
		const { courseSlug } = event.data
		logger.info("starting single course ingestion", { courseSlug })

		const course = await step.run("read-course-file", async () => {
			const filePath = path.join(process.cwd(), "data", courseSlug, "oneroster", "course.json")
			const contentResult = await errors.try(fs.readFile(filePath, "utf-8"))
			if (contentResult.error) {
				logger.error("failed to read course file", { file: filePath, error: contentResult.error })
				throw errors.wrap(contentResult.error, "file read")
			}
			const parseResult = errors.trySync(() => JSON.parse(contentResult.data))
			if (parseResult.error) {
				logger.error("failed to parse course file", { file: filePath, error: parseResult.error })
				throw errors.wrap(parseResult.error, "json parse")
			}
			return parseResult.data
		})

		const { sourcedId } = course
		logger.info("ingesting course", { sourcedId, title: course.title })

		await step.run(`ingest-course-${sourcedId}`, async () => {
			const result = await errors.try(oneroster.updateCourse(sourcedId, course))
			if (result.error) {
				if (errors.is(result.error, ErrOneRosterNotFound)) {
					logger.info("course not found, creating new", { sourcedId })
					const createResult = await errors.try(oneroster.createCourse(course))
					if (createResult.error) {
						logger.error("failed to create course", { sourcedId, error: createResult.error })
						throw createResult.error
					}
					logger.info("successfully created course", { sourcedId })
					return { success: true, status: "created" }
				}
				logger.error("failed to upsert course", { sourcedId, error: result.error })
				throw result.error
			}
			logger.info("successfully upserted course", { sourcedId })
			return { success: true, status: "upserted" }
		})

		return { status: "success", sourcedId }
	}
)
