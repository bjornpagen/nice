import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ALL_HARDCODED_COURSE_IDS } from "@/lib/constants/course-mapping"
import { ONEROSTER_CONCURRENCY_KEY, ONEROSTER_CONCURRENCY_LIMIT } from "@/lib/constants/oneroster"
import { ErrOneRosterNotFound } from "@/lib/oneroster"
import { generateCourseObject } from "@/lib/payloads/oneroster/course-only"

export const ingestAllCourses = inngest.createFunction(
	{
		id: "ingest-all-courses",
		name: "Ingest All OneRoster Courses",
		concurrency: { limit: ONEROSTER_CONCURRENCY_LIMIT, key: ONEROSTER_CONCURRENCY_KEY }
	},
	{ event: "oneroster/course.ingest.all" },
	async ({ step, logger }) => {
		logger.info("starting bulk course ingestion", {
			totalCourses: ALL_HARDCODED_COURSE_IDS.length,
			courseIds: ALL_HARDCODED_COURSE_IDS
		})

		const results: Array<{ courseId: string; sourcedId: string; status: string }> = []

		// Process each hardcoded course ID
		for (const courseId of ALL_HARDCODED_COURSE_IDS) {
			logger.info("processing course", { courseId })

			// Generate the course object using our course-only function
			const courseObject = await step.run(`generate-course-${courseId}`, async () => {
				const result = await errors.try(generateCourseObject(courseId))
				if (result.error) {
					logger.error("failed to generate course object", { courseId, error: result.error })
					throw errors.wrap(result.error, "course object generation")
				}
				return result.data
			})

			// Ingest the course object directly to OneRoster
			const ingestResult = await step.run(`ingest-course-${courseId}`, async () => {
				const { sourcedId } = courseObject
				logger.info("ingesting course", { sourcedId, title: courseObject.title })

				const result = await errors.try(oneroster.updateCourse(sourcedId, courseObject))
				if (result.error) {
					if (errors.is(result.error, ErrOneRosterNotFound)) {
						logger.info("course not found, creating new", { sourcedId })
						const createResult = await errors.try(oneroster.createCourse(courseObject))
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

			results.push({
				courseId,
				sourcedId: courseObject.sourcedId,
				status: ingestResult.status
			})

			logger.info("completed course ingestion", {
				courseId,
				sourcedId: courseObject.sourcedId,
				status: ingestResult.status
			})
		}

		const successCount = results.filter((r) => r.status === "created" || r.status === "upserted").length
		const failureCount = results.length - successCount

		logger.info("bulk course ingestion complete", {
			totalProcessed: results.length,
			successCount,
			failureCount,
			results
		})

		return {
			status: "complete",
			totalProcessed: results.length,
			successCount,
			failureCount,
			results
		}
	}
)
