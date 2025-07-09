import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { OneRosterApiClient } from "@/lib/oneroster-client"

export const ingestCourse = inngest.createFunction(
	{ id: "ingest-course", name: "Ingest OneRoster Course" },
	{ event: "oneroster/course.ingest" },
	async ({ event, step, logger }) => {
		const { course } = event.data
		logger.info("ingesting course", { sourcedId: course.sourcedId, title: course.title })

		const client = new OneRosterApiClient()

		await step.run(`ingest-course-${course.sourcedId}`, async () => {
			const existingCourse = await errors.try(client.getCourse(course.sourcedId))
			if (existingCourse.error) {
				logger.error("failed to check for existing course", {
					sourcedId: course.sourcedId,
					error: existingCourse.error
				})
				throw existingCourse.error
			}

			if (existingCourse.data) {
				logger.warn("course already exists, skipping creation", { sourcedId: course.sourcedId })
				return { success: true, status: "skipped" }
			}

			const result = await errors.try(client.createCourse(course))
			if (result.error) {
				logger.error("failed to ingest course", { sourcedId: course.sourcedId, error: result.error })
				throw result.error
			}
			logger.info("successfully ingested course", { sourcedId: course.sourcedId })
			return { success: true, status: "created" }
		})

		return { status: "success", sourcedId: course.sourcedId }
	}
)
