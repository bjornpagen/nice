import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ErrOneRosterNotFound } from "@/lib/oneroster"

export const ingestCourse = inngest.createFunction(
	{ id: "ingest-course", name: "Ingest OneRoster Course" },
	{ event: "oneroster/course.upsert" },
	async ({ event, step, logger }) => {
		const { course } = event.data
		logger.info("ingesting course", { sourcedId: course.sourcedId, title: course.title })

		await step.run(`ingest-course-${course.sourcedId}`, async () => {
			logger.debug("upserting course", { sourcedId: course.sourcedId })

			// Use PUT for upsert behavior
			const result = await errors.try(oneroster.updateCourse(course.sourcedId, course))
			if (result.error) {
				// Check if it's a 404 error - if so, create instead
				if (errors.is(result.error, ErrOneRosterNotFound)) {
					logger.info("course not found, creating new", { sourcedId: course.sourcedId })
					const createResult = await errors.try(oneroster.createCourse(course))
					if (createResult.error) {
						logger.error("failed to create course", { sourcedId: course.sourcedId, error: createResult.error })
						throw createResult.error
					}
					logger.info("successfully created course", { sourcedId: course.sourcedId })
					return { success: true, status: "created" }
				}
				// Other error - re-throw
				logger.error("failed to upsert course", { sourcedId: course.sourcedId, error: result.error })
				throw result.error
			}
			logger.info("successfully upserted course", { sourcedId: course.sourcedId })
			return { success: true, status: "upserted" }
		})

		return { status: "success", sourcedId: course.sourcedId }
	}
)
